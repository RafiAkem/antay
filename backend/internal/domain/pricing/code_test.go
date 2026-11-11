package pricing

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestCodeRejections(t *testing.T) {
	tests := []struct {
		name  string
		code  string
		mut   func(*Discount)
		uses  int32
		lines []Line
		want  RejectReason
	}{
		{name: "lolos", code: "PROMO", want: ""},
		{name: "huruf kecil dan spasi tetap cocok", code: "  promo ", want: ""},
		{name: "kode tidak dikenal", code: "LAIN", want: RejectUnknownCode},
		{name: "nonaktif", code: "PROMO", mut: func(d *Discount) { d.IsActive = false }, want: RejectInactive},
		{name: "belum mulai", code: "PROMO", mut: func(d *Discount) { d.StartsAt = ptr(now.Add(time.Hour)) }, want: RejectNotStarted},
		{name: "kedaluwarsa", code: "PROMO", mut: func(d *Discount) { d.EndsAt = ptr(now.Add(-time.Minute)) }, want: RejectExpired},
		{name: "tepat di batas akhir sudah kedaluwarsa", code: "PROMO", mut: func(d *Discount) { d.EndsAt = ptr(now) }, want: RejectExpired},
		{name: "tepat di awal sudah berlaku", code: "PROMO", mut: func(d *Discount) { d.StartsAt = ptr(now) }, want: ""},
		{name: "kuota habis karena ditahan", code: "PROMO", mut: func(d *Discount) {
			d.UsageLimit = ptr[int32](10)
			d.UsedCount = 7
			d.HeldCount = 3
		}, want: RejectQuotaExhausted},
		{name: "kuota sisa satu", code: "PROMO", mut: func(d *Discount) {
			d.UsageLimit = ptr[int32](10)
			d.UsedCount = 7
			d.HeldCount = 2
		}, want: ""},
		{name: "batas per pembeli", code: "PROMO", mut: func(d *Discount) { d.PerCustomerLimit = ptr[int32](1) }, uses: 1, want: RejectCustomerLimit},
		{name: "minimal belanja", code: "PROMO", mut: func(d *Discount) { d.MinSubtotal = 1500000 }, want: RejectMinSubtotal},
		{name: "kategori tidak ada di keranjang", code: "PROMO", mut: func(d *Discount) { d.CategoryID = ptr(catOther) }, want: RejectNotApplicable},
		{name: "keranjang kosong", code: "PROMO", lines: []Line{}, want: RejectNotApplicable},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := disc(KindCode, ValueAmount, 50000, true, withCode("Promo"))
			if tt.mut != nil {
				tt.mut(&d)
			}
			lines := cart()
			if tt.lines != nil {
				lines = tt.lines
			}
			in := Input{
				Lines:        lines,
				Discounts:    []Discount{d},
				Code:         tt.code,
				CustomerUses: map[uuid.UUID]int32{d.ID: tt.uses},
				Now:          now,
			}

			if _, got := CheckCode(in); got != tt.want {
				t.Fatalf("CheckCode: dapat %q, mau %q", got, tt.want)
			}
			r := Calculate(in)
			assertConsistent(t, r)
			if r.CodeRejection != tt.want {
				t.Fatalf("Calculate: dapat %q, mau %q", r.CodeRejection, tt.want)
			}
			if tt.want == "" && r.DiscountTotal != 50000 {
				t.Fatalf("kode lolos tapi potongannya %d", r.DiscountTotal)
			}
			if tt.want != "" && r.DiscountTotal != 0 {
				t.Fatalf("kode ditolak tapi tetap memotong %d", r.DiscountTotal)
			}
		})
	}
}

func TestAutoCodeIsNotTypeable(t *testing.T) {
	// Diskon auto tidak bisa "dipanggil" lewat kode walau field Code-nya terisi.
	d := disc(KindAuto, ValueAmount, 50000, true, withCode("AUTO"), func(d *Discount) { d.IsActive = false })
	r := Calculate(Input{Lines: cart(), Discounts: []Discount{d}, Code: "AUTO", Now: now})
	if r.CodeRejection != RejectUnknownCode {
		t.Fatalf("dapat %q", r.CodeRejection)
	}
}

func TestIneligibleAutoSkippedSilently(t *testing.T) {
	expired := disc(KindAuto, ValuePercent, 1000, true, func(d *Discount) { d.EndsAt = ptr(now.Add(-time.Hour)) })
	r := Calculate(Input{Lines: cart(), Discounts: []Discount{expired}, Now: now})
	if r.DiscountTotal != 0 || r.CodeRejection != "" || len(r.Applied) != 0 || r.Applied == nil {
		t.Fatalf("auto kedaluwarsa seharusnya dilewati: %+v", r)
	}
}

func TestCodeWithNoEffect(t *testing.T) {
	// Auto sudah menghabiskan baris festival, kode khusus festival jadi nol.
	auto := disc(KindAuto, ValuePercent, 10000, true, func(d *Discount) { d.CategoryID = ptr(catFestival) })
	code := disc(KindCode, ValueAmount, 50000, true, withCode("FEST"), func(d *Discount) { d.CategoryID = ptr(catFestival) })
	r := Calculate(Input{Lines: cart(), Discounts: []Discount{auto, code}, Code: "FEST", Now: now})
	assertConsistent(t, r)
	if r.CodeRejection != RejectNoEffect || len(r.Applied) != 1 || r.DiscountTotal != 500000 {
		t.Fatalf("dapat %+v", r)
	}
}

func TestDiscountLargerThanSubtotal(t *testing.T) {
	d := disc(KindAuto, ValueAmount, 2000000, true)
	r := Calculate(Input{
		Lines:     cart(),
		Discounts: []Discount{d},
		Fee:       FeeRule{Bearer: FeeBearerCustomer, PercentBP: 200, Flat: 5000},
		Now:       now,
	})
	assertConsistent(t, r)
	if r.DiscountTotal != 1400000 || r.AfterDiscount != 0 || r.Fee != 0 || r.Total != 0 {
		t.Fatalf("harus jadi gratis tanpa biaya: %+v", r)
	}
}

func TestFee(t *testing.T) {
	tests := []struct {
		name                       string
		rule                       FeeRule
		wantFee, wantCust, wantOrg int64
		wantTotal                  int64
		wantBearer                 FeeBearer
	}{
		{"pembeli 2%", FeeRule{Bearer: FeeBearerCustomer, PercentBP: 200}, 28000, 28000, 0, 1428000, FeeBearerCustomer},
		{"penyelenggara 2%", FeeRule{Bearer: FeeBearerOrganizer, PercentBP: 200}, 28000, 0, 28000, 1400000, FeeBearerOrganizer},
		{"persen dan flat", FeeRule{Bearer: FeeBearerCustomer, PercentBP: 250, Flat: 4000}, 39000, 39000, 0, 1439000, FeeBearerCustomer},
		{"bearer kosong dianggap pembeli", FeeRule{Flat: 5000}, 5000, 5000, 0, 1405000, FeeBearerCustomer},
		{"tanpa biaya", FeeRule{}, 0, 0, 0, 1400000, FeeBearerCustomer},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Calculate(Input{Lines: cart(), Fee: tt.rule, Now: now})
			assertConsistent(t, r)
			if r.Fee != tt.wantFee || r.CustomerFee != tt.wantCust || r.OrganizerFee != tt.wantOrg ||
				r.Total != tt.wantTotal || r.FeeBearer != tt.wantBearer {
				t.Fatalf("dapat %+v", r)
			}
		})
	}
}

func TestFloorRounding(t *testing.T) {
	lines := []Line{{PackageID: pkgVIPA, CategoryID: catVIP, UnitPrice: 99999, Quantity: 1}}
	d := disc(KindAuto, ValuePercent, 333, true)
	r := Calculate(Input{
		Lines:     lines,
		Discounts: []Discount{d},
		Fee:       FeeRule{Bearer: FeeBearerCustomer, PercentBP: 333},
		Now:       now,
	})
	assertConsistent(t, r)
	// 99999 x 3,33% = 3329,97 jadi 3329. Biaya 96670 x 3,33% = 3219,11 jadi 3219.
	if r.DiscountTotal != 3329 || r.AfterDiscount != 96670 || r.Fee != 3219 || r.Total != 99889 {
		t.Fatalf("pembulatan salah: %+v", r)
	}
}

func TestLargeAmountsDoNotOverflow(t *testing.T) {
	lines := []Line{{PackageID: pkgVIPA, CategoryID: catVIP, UnitPrice: 4_000_000_000_000_000_000, Quantity: 2}}
	d := disc(KindAuto, ValuePercent, 9999, true)
	r := Calculate(Input{Lines: lines, Discounts: []Discount{d}, Now: now})
	assertConsistent(t, r)
	if r.DiscountTotal != 7_999_200_000_000_000_000 {
		t.Fatalf("dapat %d", r.DiscountTotal)
	}
}
