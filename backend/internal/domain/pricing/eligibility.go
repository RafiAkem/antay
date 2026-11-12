package pricing

import (
	"bytes"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
)

// NormalizeCode menyeragamkan kode promo. Pembeli sering mengetik "bobotoh "
// dari ponsel, dan itu harus tetap dianggap BOBOTOH.
func NormalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

// CheckCode mencari diskon kode yang cocok dengan in.Code lalu memeriksa
// syaratnya pada in.Now. Alasan kosong artinya kode lolos. Lolos di sini belum
// tentu terpasang: Calculate masih bisa memilih kombinasi lain yang lebih murah.
func CheckCode(in Input) (Discount, RejectReason) {
	code := NormalizeCode(in.Code)
	if code == "" {
		return Discount{}, RejectUnknownCode
	}

	var matches []Discount
	for _, d := range in.Discounts {
		if d.Kind == KindCode && NormalizeCode(d.Code) == code {
			matches = append(matches, d)
		}
	}
	if len(matches) == 0 {
		return Discount{}, RejectUnknownCode
	}

	// Seharusnya kode unik per event, tapi kalau ada kembar (misal yang lama
	// sudah nonaktif), pakai yang pertama lolos. Kalau tidak ada yang lolos,
	// alasan dari yang paling awal dibuat yang dilaporkan.
	sortDiscounts(matches)
	subtotal := subtotalOf(in.Lines)
	var first RejectReason
	for i, d := range matches {
		r := check(d, in.Lines, subtotal, in.CustomerUses, in.Now)
		if r == "" {
			return d, ""
		}
		if i == 0 {
			first = r
		}
	}
	return matches[0], first
}

// check memeriksa satu diskon. Urutannya dari yang paling tidak bisa diakali
// pembeli: periode dan kuota dulu, cakupan sebelum minimal belanja karena
// menambah tiket yang salah tidak akan membuat kode itu berlaku.
func check(d Discount, lines []Line, subtotal int64, uses map[uuid.UUID]int32, now time.Time) RejectReason {
	switch {
	case !d.IsActive:
		return RejectInactive
	case d.StartsAt != nil && now.Before(*d.StartsAt):
		return RejectNotStarted
	case d.EndsAt != nil && !now.Before(*d.EndsAt):
		return RejectExpired
	case d.UsageLimit != nil && d.UsedCount+d.HeldCount >= *d.UsageLimit:
		// Yang ditahan ikut dihitung, sama seperti kursi held.
		return RejectQuotaExhausted
	case d.PerCustomerLimit != nil && uses[d.ID] >= *d.PerCustomerLimit:
		return RejectCustomerLimit
	case !coversAny(d, lines):
		return RejectNotApplicable
	case subtotal < d.MinSubtotal:
		return RejectMinSubtotal
	}
	return ""
}

func (d Discount) covers(l Line) bool {
	if d.CategoryID != nil && *d.CategoryID != l.CategoryID {
		return false
	}
	if d.PackageID != nil && *d.PackageID != l.PackageID {
		return false
	}
	return true
}

func coversAny(d Discount, lines []Line) bool {
	for _, l := range lines {
		if l.Quantity > 0 && d.covers(l) {
			return true
		}
	}
	return false
}

// sortDiscounts mengurutkan dari yang paling awal dibuat. ID dipakai sebagai
// pemecah seri supaya hasilnya tidak bergantung urutan baris dari database.
func sortDiscounts(ds []Discount) {
	slices.SortStableFunc(ds, func(a, b Discount) int {
		if c := a.CreatedAt.Compare(b.CreatedAt); c != 0 {
			return c
		}
		return bytes.Compare(a.ID[:], b.ID[:])
	})
}

func lineTotal(l Line) int64 {
	if l.UnitPrice <= 0 || l.Quantity <= 0 {
		return 0
	}
	return l.UnitPrice * int64(l.Quantity)
}

func subtotalOf(lines []Line) int64 {
	var sum int64
	for _, l := range lines {
		sum += lineTotal(l)
	}
	return sum
}
