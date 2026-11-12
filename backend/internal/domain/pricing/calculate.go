package pricing

import "strings"

// candidate adalah satu kombinasi diskon yang dicoba beserta hasilnya.
type candidate struct {
	seq           []Discount
	out           outcome
	afterDiscount int64
	fee           int64
	customerFee   int64
	total         int64
}

// Calculate menghitung harga pesanan dari awal sampai total. Fungsi ini
// deterministik: input yang sama selalu memberi angka yang sama, jadi aman
// dipanggil ulang saat quote, saat pesanan dibuat, dan saat menyusun tagihan.
func Calculate(in Input) Result {
	subtotal := subtotalOf(in.Lines)

	// Diskon auto yang tidak lolos syarat dilewati diam-diam. Pembeli tidak
	// minta diskon itu, jadi tidak perlu diberi tahu kenapa tidak dapat.
	var autos []Discount
	for _, d := range in.Discounts {
		if d.Kind == KindAuto && check(d, in.Lines, subtotal, in.CustomerUses, in.Now) == "" {
			autos = append(autos, d)
		}
	}
	sortDiscounts(autos)

	var code *Discount
	var rejection RejectReason
	if strings.TrimSpace(in.Code) != "" {
		d, r := CheckCode(in)
		if r == "" {
			code = &d
		} else {
			rejection = r
		}
	}

	// Auto dulu, baru kode. Urutan ini dibawa ke setiap kombinasi.
	ordered := autos
	if code != nil {
		ordered = append(ordered, *code)
	}

	var best candidate
	for i, seq := range combinations(ordered) {
		c := evaluate(in, subtotal, seq)
		if i == 0 || better(c, best) {
			best = c
		}
	}

	if code != nil && !hasApplied(best.out.applied, *code) {
		rejection = RejectNotCombinable
		if inSequence(best.seq, *code) {
			rejection = RejectNoEffect
		}
	}

	return buildResult(in, subtotal, best, rejection)
}

// combinations menyusun kombinasi yang dibandingkan. Kombinasi pertama selalu
// gabungan semua diskon stackable (bisa kosong), lalu setiap diskon yang tidak
// bisa digabung dicoba sendirian. Kalau semuanya stackable, hanya ada satu
// kombinasi dan tidak ada yang perlu dibandingkan.
func combinations(ordered []Discount) [][]Discount {
	var stack []Discount
	var solos [][]Discount
	for _, d := range ordered {
		if d.Stackable {
			stack = append(stack, d)
		} else {
			solos = append(solos, []Discount{d})
		}
	}
	return append([][]Discount{stack}, solos...)
}

func evaluate(in Input, subtotal int64, seq []Discount) candidate {
	out := applySequence(in.Lines, seq)
	after := subtotal - out.total
	fee := computeFee(after, in.Fee)
	customerFee, _ := splitFee(fee, in.Fee.Bearer)
	return candidate{
		seq:           seq,
		out:           out,
		afterDiscount: after,
		fee:           fee,
		customerFee:   customerFee,
		total:         after + customerFee,
	}
}

// better membandingkan dari sisi pembeli: total dibayar paling kecil menang.
// Kalau seri, yang diskonnya lebih sedikit menang, karena tiap diskon yang
// terpasang ikut memakan kuota. Kalau masih seri, kombinasi yang dicoba lebih
// dulu dipertahankan.
func better(c, best candidate) bool {
	if c.total != best.total {
		return c.total < best.total
	}
	return len(c.out.applied) < len(best.out.applied)
}

func hasApplied(applied []Applied, d Discount) bool {
	for _, a := range applied {
		if a.DiscountID == d.ID {
			return true
		}
	}
	return false
}

func inSequence(seq []Discount, d Discount) bool {
	for _, s := range seq {
		if s.ID == d.ID {
			return true
		}
	}
	return false
}

func buildResult(in Input, subtotal int64, c candidate, rejection RejectReason) Result {
	lines := make([]LineResult, len(in.Lines))
	for i, l := range in.Lines {
		total := lineTotal(l)
		lines[i] = LineResult{
			PackageID:         l.PackageID,
			CategoryID:        l.CategoryID,
			UnitPrice:         l.UnitPrice,
			Quantity:          l.Quantity,
			LineTotal:         total,
			DiscountAmount:    c.out.lineDiscounts[i],
			LineAfterDiscount: total - c.out.lineDiscounts[i],
		}
	}

	applied := c.out.applied
	if applied == nil {
		applied = []Applied{}
	}

	_, organizerFee := splitFee(c.fee, in.Fee.Bearer)
	return Result{
		Lines:         lines,
		Applied:       applied,
		Subtotal:      subtotal,
		DiscountTotal: c.out.total,
		AfterDiscount: c.afterDiscount,
		Fee:           c.fee,
		FeeBearer:     normalizeBearer(in.Fee.Bearer),
		CustomerFee:   c.customerFee,
		OrganizerFee:  organizerFee,
		Total:         c.total,
		CodeRejection: rejection,
	}
}
