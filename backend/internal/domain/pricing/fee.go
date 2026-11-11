package pricing

// computeFee menghitung biaya layanan dari harga setelah diskon. Pesanan yang
// jadi gratis karena diskon tidak dikenai biaya apa pun, termasuk biaya flat,
// supaya pembeli tidak disuruh bayar Rp5.000 untuk tiket Rp0.
func computeFee(afterDiscount int64, rule FeeRule) int64 {
	if afterDiscount <= 0 {
		return 0
	}
	bp := min(max(int64(rule.PercentBP), 0), fullBP)
	return mulDiv(afterDiscount, bp, fullBP) + max(rule.Flat, 0)
}

// splitFee memisahkan bagian yang dibayar pembeli dan yang ditanggung
// penyelenggara. Bearer kosong dianggap customer, sama dengan default kolom
// events.fee_bearer.
func splitFee(fee int64, bearer FeeBearer) (customer, organizer int64) {
	if bearer == FeeBearerOrganizer {
		return 0, fee
	}
	return fee, 0
}

func normalizeBearer(b FeeBearer) FeeBearer {
	if b == FeeBearerOrganizer {
		return FeeBearerOrganizer
	}
	return FeeBearerCustomer
}
