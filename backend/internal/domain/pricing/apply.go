package pricing

import "math/bits"

const fullBP = 10000

// outcome adalah hasil memasang satu urutan diskon ke keranjang.
type outcome struct {
	lineDiscounts []int64
	applied       []Applied
	total         int64
}

// applySequence memasang diskon satu per satu sesuai urutan seq. Sisa harga
// dilacak per baris, karena diskon yang cakupannya satu kategori hanya boleh
// memotong baris kategori itu, dan diskon berikutnya dihitung dari sisanya.
//
// Diskon yang potongannya nol tidak dicatat di applied. Dengan begitu daftar
// applied sama dengan daftar yang perlu ditahan kuotanya.
func applySequence(lines []Line, seq []Discount) outcome {
	remaining := make([]int64, len(lines))
	for i, l := range lines {
		remaining[i] = lineTotal(l)
	}
	out := outcome{lineDiscounts: make([]int64, len(lines))}

	for _, d := range seq {
		var idx []int
		var base int64
		for i, l := range lines {
			if l.Quantity > 0 && remaining[i] > 0 && d.covers(l) {
				idx = append(idx, i)
				base += remaining[i]
			}
		}
		amt := discountAmount(d, base)
		if amt <= 0 {
			continue
		}
		distribute(amt, base, idx, remaining, out.lineDiscounts)
		out.applied = append(out.applied, Applied{
			DiscountID: d.ID,
			Name:       d.Name,
			Kind:       d.Kind,
			Code:       d.Code,
			Amount:     amt,
		})
		out.total += amt
	}
	return out
}

// discountAmount tidak pernah melebihi base, jadi total diskon otomatis tidak
// bisa melewati subtotal tanpa perlu dijepit lagi di akhir.
func discountAmount(d Discount, base int64) int64 {
	if base <= 0 || d.Value <= 0 {
		return 0
	}
	switch d.ValueType {
	case ValuePercent:
		amt := mulDiv(base, min(d.Value, fullBP), fullBP)
		if d.MaxAmount != nil && amt > *d.MaxAmount {
			amt = max(*d.MaxAmount, 0)
		}
		return amt
	case ValueAmount:
		return min(d.Value, base)
	}
	return 0
}

// distribute membagi potongan ke baris-baris yang dicakup sebanding sisa
// harganya. Hasil bagi dibulatkan ke bawah, lalu sisa rupiahnya dibagikan satu
// per satu ke baris paling atas yang masih punya ruang. Sisa itu selalu kurang
// dari jumlah baris, dan setiap baris yang hasil baginya pecahan pasti masih
// punya ruang minimal satu rupiah, jadi semuanya pasti habis terbagi.
func distribute(amt, base int64, idx []int, remaining, lineDiscounts []int64) {
	shares := make([]int64, len(idx))
	left := amt
	for k, i := range idx {
		shares[k] = mulDiv(amt, remaining[i], base)
		left -= shares[k]
	}
	for k, i := range idx {
		if left == 0 {
			break
		}
		if remaining[i]-shares[k] > 0 {
			shares[k]++
			left--
		}
	}
	for k, i := range idx {
		remaining[i] -= shares[k]
		lineDiscounts[i] += shares[k]
	}
}

// mulDiv menghitung floor(a*b/c) lewat perkalian 128 bit, supaya pesanan
// bernilai miliaran dikali basis poin tidak meluap di int64. Semua pemanggil
// menjamin a, b >= 0, c > 0, dan salah satu dari a atau b tidak lebih dari c.
// Syarat terakhir itu yang membuat hasilnya muat dan Div64 tidak panik.
func mulDiv(a, b, c int64) int64 {
	hi, lo := bits.Mul64(uint64(a), uint64(b))
	q, _ := bits.Div64(hi, lo, uint64(c))
	return int64(q)
}
