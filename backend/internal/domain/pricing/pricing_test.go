package pricing

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

var (
	now = time.Date(2026, 12, 1, 10, 0, 0, 0, time.UTC)

	catVIP      = uuid.MustParse("00000000-0000-0000-0000-0000000000c1")
	catFestival = uuid.MustParse("00000000-0000-0000-0000-0000000000c2")
	catOther    = uuid.MustParse("00000000-0000-0000-0000-0000000000c3")
	pkgVIPA     = uuid.MustParse("00000000-0000-0000-0000-0000000000a1")
	pkgFestival = uuid.MustParse("00000000-0000-0000-0000-0000000000a2")
)

func ptr[T any](v T) *T { return &v }

// cart adalah contoh di PRD: VIP A Couple x1 dan Festival Single x2.
func cart() []Line {
	return []Line{
		{PackageID: pkgVIPA, CategoryID: catVIP, UnitPrice: 900000, Quantity: 1},
		{PackageID: pkgFestival, CategoryID: catFestival, UnitPrice: 250000, Quantity: 2},
	}
}

var idSeq byte

// disc membuat diskon aktif dengan ID unik dan CreatedAt berurutan, supaya tiap
// tes tidak perlu mengisi field yang tidak relevan.
func disc(kind Kind, vt ValueType, value int64, stackable bool, mut ...func(*Discount)) Discount {
	idSeq++
	d := Discount{
		ID:        uuid.UUID{15: idSeq},
		Name:      "diskon",
		Kind:      kind,
		ValueType: vt,
		Value:     value,
		Stackable: stackable,
		IsActive:  true,
		CreatedAt: now.Add(-time.Duration(1000-int(idSeq)) * time.Hour),
	}
	for _, m := range mut {
		m(&d)
	}
	return d
}

func withCode(c string) func(*Discount) { return func(d *Discount) { d.Code = c } }

var customerFee2pct = FeeRule{Bearer: FeeBearerCustomer, PercentBP: 200}

// assertConsistent memeriksa invarian yang harus selalu benar apa pun kasusnya.
func assertConsistent(t *testing.T, r Result) {
	t.Helper()
	var lineDisc, lineAfter, appliedSum int64
	for _, l := range r.Lines {
		if l.DiscountAmount < 0 || l.LineAfterDiscount < 0 {
			t.Errorf("baris negatif: %+v", l)
		}
		lineDisc += l.DiscountAmount
		lineAfter += l.LineAfterDiscount
	}
	for _, a := range r.Applied {
		appliedSum += a.Amount
	}
	if lineDisc != r.DiscountTotal || appliedSum != r.DiscountTotal {
		t.Errorf("diskon tidak konsisten: baris %d, applied %d, total %d", lineDisc, appliedSum, r.DiscountTotal)
	}
	if lineAfter != r.AfterDiscount || r.Subtotal-r.DiscountTotal != r.AfterDiscount {
		t.Errorf("setelah diskon tidak konsisten: baris %d, result %d", lineAfter, r.AfterDiscount)
	}
	if r.DiscountTotal > r.Subtotal {
		t.Errorf("diskon %d melebihi subtotal %d", r.DiscountTotal, r.Subtotal)
	}
	if r.CustomerFee+r.OrganizerFee != r.Fee || r.Total != r.AfterDiscount+r.CustomerFee {
		t.Errorf("biaya tidak konsisten: %+v", r)
	}
}

func TestPRDExample(t *testing.T) {
	earlyBird := disc(KindAuto, ValuePercent, 1000, true, func(d *Discount) {
		d.Name = "Early bird"
		d.MaxAmount = ptr[int64](100000)
	})
	bobotoh := disc(KindCode, ValueAmount, 50000, true, withCode("BOBOTOH"), func(d *Discount) {
		d.MinSubtotal = 500000
	})

	r := Calculate(Input{
		Lines:     cart(),
		Discounts: []Discount{bobotoh, earlyBird},
		Code:      "BOBOTOH",
		Fee:       customerFee2pct,
		Now:       now,
	})
	assertConsistent(t, r)

	if r.Subtotal != 1400000 || r.DiscountTotal != 150000 || r.AfterDiscount != 1250000 ||
		r.Fee != 25000 || r.Total != 1275000 {
		t.Fatalf("angka tidak sama dengan PRD: %+v", r)
	}
	if len(r.Applied) != 2 || r.Applied[0].DiscountID != earlyBird.ID || r.Applied[0].Amount != 100000 ||
		r.Applied[1].DiscountID != bobotoh.ID || r.Applied[1].Amount != 50000 {
		t.Fatalf("urutan atau nilai diskon salah: %+v", r.Applied)
	}
	if r.CodeRejection != "" {
		t.Fatalf("kode seharusnya terpasang, dapat %q", r.CodeRejection)
	}
	// Pembagian per baris sebanding sisa harga, sisa rupiah ke baris teratas.
	if r.Lines[0].DiscountAmount != 96429 || r.Lines[1].DiscountAmount != 53571 {
		t.Fatalf("pembagian per baris berubah: %+v", r.Lines)
	}
}

func TestScopedDiscount(t *testing.T) {
	tests := []struct {
		name         string
		mut          func(*Discount)
		wantVIP      int64
		wantFestival int64
	}{
		{"kategori festival saja", func(d *Discount) { d.CategoryID = ptr(catFestival) }, 0, 100000},
		{"paket VIP saja", func(d *Discount) { d.PackageID = ptr(pkgVIPA) }, 180000, 0},
		{"seluruh event", func(d *Discount) {}, 180000, 100000},
		{"kategori dan paket tidak cocok", func(d *Discount) {
			d.CategoryID = ptr(catVIP)
			d.PackageID = ptr(pkgFestival)
		}, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := disc(KindAuto, ValuePercent, 2000, true, tt.mut)
			r := Calculate(Input{Lines: cart(), Discounts: []Discount{d}, Now: now})
			assertConsistent(t, r)
			if r.Lines[0].DiscountAmount != tt.wantVIP || r.Lines[1].DiscountAmount != tt.wantFestival {
				t.Fatalf("dapat VIP %d, festival %d", r.Lines[0].DiscountAmount, r.Lines[1].DiscountAmount)
			}
		})
	}
}

func TestScopedAmountCappedAtCoveredLines(t *testing.T) {
	d := disc(KindAuto, ValueAmount, 800000, true, func(d *Discount) { d.CategoryID = ptr(catFestival) })
	r := Calculate(Input{Lines: cart(), Discounts: []Discount{d}, Now: now})
	assertConsistent(t, r)
	if r.DiscountTotal != 500000 || r.Lines[0].DiscountAmount != 0 {
		t.Fatalf("potongan nominal harus mentok di baris festival: %+v", r)
	}
}

func TestOrderByCreatedAt(t *testing.T) {
	// Persen dibuat lebih dulu, jadi dihitung dari harga penuh: 50% dari 1.400.000
	// lalu 100.000. Kalau urutannya terbalik totalnya 650.000, bukan 800.000.
	half := disc(KindAuto, ValuePercent, 5000, true)
	flat := disc(KindAuto, ValueAmount, 100000, true)
	r := Calculate(Input{Lines: cart(), Discounts: []Discount{flat, half}, Now: now})
	assertConsistent(t, r)
	if r.DiscountTotal != 800000 || r.Applied[0].DiscountID != half.ID {
		t.Fatalf("urutan pemasangan salah: %+v", r.Applied)
	}
}

func TestNonStackable(t *testing.T) {
	tests := []struct {
		name          string
		discounts     func() []Discount
		code          string
		wantTotal     int64
		wantApplied   int
		wantRejection RejectReason
	}{
		{
			name: "kode tunggal lebih murah dari tumpukan auto",
			discounts: func() []Discount {
				return []Discount{
					disc(KindAuto, ValuePercent, 1000, true),
					disc(KindCode, ValueAmount, 300000, false, withCode("BESAR")),
				}
			},
			code: "BESAR", wantTotal: 1100000, wantApplied: 1,
		},
		{
			name: "tumpukan auto lebih murah, kode ditolak",
			discounts: func() []Discount {
				return []Discount{
					disc(KindAuto, ValuePercent, 1000, true),
					disc(KindCode, ValueAmount, 50000, false, withCode("KECIL")),
				}
			},
			code: "KECIL", wantTotal: 1260000, wantApplied: 1, wantRejection: RejectNotCombinable,
		},
		{
			name: "seri, pilih yang diskonnya lebih sedikit",
			discounts: func() []Discount {
				return []Discount{
					disc(KindAuto, ValueAmount, 100000, true),
					disc(KindAuto, ValueAmount, 40000, true),
					disc(KindCode, ValueAmount, 140000, false, withCode("SERI")),
				}
			},
			code: "SERI", wantTotal: 1260000, wantApplied: 1,
		},
		{
			name: "dua auto tidak bisa digabung, ambil yang terbesar",
			discounts: func() []Discount {
				return []Discount{
					disc(KindAuto, ValueAmount, 100000, false),
					disc(KindAuto, ValueAmount, 200000, false),
					disc(KindAuto, ValueAmount, 50000, true),
				}
			},
			wantTotal: 1200000, wantApplied: 1,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Calculate(Input{Lines: cart(), Discounts: tt.discounts(), Code: tt.code, Now: now})
			assertConsistent(t, r)
			if r.Total != tt.wantTotal || len(r.Applied) != tt.wantApplied || r.CodeRejection != tt.wantRejection {
				t.Fatalf("dapat total %d, %d diskon, alasan %q", r.Total, len(r.Applied), r.CodeRejection)
			}
		})
	}
}
