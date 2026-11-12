package storefront

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/pricing"
)

// MaxPax adalah batas orang per pesanan (PRD 5.3: satu paket 1 sampai 10 orang,
// dan satu pesanan juga dibatasi 10 supaya satu akun tidak memborong kuota).
const MaxPax = 10

var (
	ErrInvalidItems       = errors.New("isi pesanan tidak valid")
	ErrSaleNotOpen        = errors.New("penjualan belum dibuka")
	ErrSaleEnded          = errors.New("penjualan sudah berakhir")
	ErrPaxLimit           = errors.New("melebihi batas orang per pesanan")
	ErrPackageUnavailable = errors.New("paket tidak tersedia")
	ErrMixedCategory      = errors.New("paket berasal dari lebih dari satu kategori")
	ErrQuotaExceeded      = errors.New("kuota tidak cukup")
)

// Issue menunjuk field mana yang bermasalah, dipakai untuk details di respons error.
type Issue struct {
	Field string
	Issue string
}

// Rejection membungkus salah satu Err* di atas beserta field yang bermasalah,
// jadi handler cukup errors.Is untuk kode dan errors.As untuk details.
type Rejection struct {
	Err    error
	Issues []Issue
}

func (r *Rejection) Error() string { return r.Err.Error() }
func (r *Rejection) Unwrap() error { return r.Err }

func reject(err error, issues ...Issue) error { return &Rejection{Err: err, Issues: issues} }

type QuoteItem struct {
	PackageID uuid.UUID
	Quantity  int32
}

type QuoteRequest struct {
	EventID   uuid.UUID
	Items     []QuoteItem
	PromoCode string
	// CustomerID belum dipakai hitungan; disiapkan untuk batas diskon per pembeli.
	CustomerID uuid.UUID
}

type QuoteLine struct {
	Package        category.Package
	Category       category.Category
	Quantity       int32
	UnitPrice      int64
	LineTotal      int64
	DiscountAmount int64
}

type Quote struct {
	EventID  uuid.UUID
	Lines    []QuoteLine
	TotalPax int32
	Result   pricing.Result
}

// Quote menghitung harga tanpa menahan kuota apa pun. Urutan cek sengaja dari
// yang paling murah: isi body dulu, baru event, baru stok.
func (s *Service) Quote(ctx context.Context, req QuoteRequest) (Quote, error) {
	if err := validateItems(req.Items); err != nil {
		return Quote{}, err
	}
	ev, err := s.repo.GetPublished(ctx, req.EventID)
	if err != nil {
		return Quote{}, err
	}
	now := s.clock()
	switch {
	case ev.Date < s.clock.Today() || saleEnded(ev, now):
		return Quote{}, reject(ErrSaleEnded)
	case saleNotStarted(ev, now):
		return Quote{}, reject(ErrSaleNotOpen)
	}

	st, err := s.loadStock(ctx, []uuid.UUID{ev.ID})
	if err != nil {
		return Quote{}, err
	}
	lines, err := resolveLines(req.Items, st, ev)
	if err != nil {
		return Quote{}, err
	}
	totalPax, err := checkStock(lines, st)
	if err != nil {
		return Quote{}, err
	}

	in := pricing.Input{
		Lines: make([]pricing.Line, 0, len(lines)),
		// Tabel diskon belum ada. Begitu ada, diskon event dan riwayat pemakaian
		// pembeli diisi di sini; sisanya sudah ditangani pricing.Calculate.
		Discounts: nil,
		Code:      strings.TrimSpace(req.PromoCode),
		Fee: pricing.FeeRule{
			Bearer:    pricing.FeeBearer(ev.FeeBearer),
			PercentBP: ev.FeePercentBP,
			Flat:      ev.FeeFlat,
		},
		Now: now,
	}
	for _, l := range lines {
		in.Lines = append(in.Lines, pricing.Line{
			PackageID:  l.Package.ID,
			CategoryID: l.Category.ID,
			UnitPrice:  l.Package.Price,
			Quantity:   l.Quantity,
		})
	}
	res := pricing.Calculate(in)
	for i := range lines {
		lines[i].UnitPrice = res.Lines[i].UnitPrice
		lines[i].LineTotal = res.Lines[i].LineTotal
		lines[i].DiscountAmount = res.Lines[i].DiscountAmount
	}
	return Quote{EventID: ev.ID, Lines: lines, TotalPax: totalPax, Result: res}, nil
}

func validateItems(items []QuoteItem) error {
	if len(items) == 0 {
		return reject(ErrInvalidItems, Issue{Field: "items", Issue: "Pilih minimal satu paket."})
	}
	var issues []Issue
	seen := make(map[uuid.UUID]bool, len(items))
	for i, it := range items {
		if it.Quantity < 1 {
			issues = append(issues, Issue{Field: itemField(i, "quantity"), Issue: "Jumlah minimal 1."})
		}
		if seen[it.PackageID] {
			issues = append(issues, Issue{Field: itemField(i, "packageId"), Issue: "Paket ini sudah ada di baris lain."})
		}
		seen[it.PackageID] = true
	}
	if len(issues) > 0 {
		return reject(ErrInvalidItems, issues...)
	}
	// Tiap baris minimal satu orang, jadi lebih dari MaxPax baris pasti lewat
	// batas. Dicek di sini supaya keranjang raksasa tidak sempat diproses.
	if len(items) > MaxPax {
		return reject(ErrPaxLimit, Issue{Field: "items", Issue: paxIssue()})
	}
	return nil
}

func resolveLines(items []QuoteItem, st stock, ev event.Event) ([]QuoteLine, error) {
	type found struct {
		pkg category.Package
		cat category.Category
	}
	index := make(map[uuid.UUID]found)
	for _, c := range st.categories[ev.ID] {
		for _, p := range st.packages[c.ID] {
			if p.IsActive {
				index[p.ID] = found{pkg: p, cat: c}
			}
		}
	}

	lines := make([]QuoteLine, 0, len(items))
	var missing []Issue
	for i, it := range items {
		f, ok := index[it.PackageID]
		if !ok {
			missing = append(missing, Issue{Field: itemField(i, "packageId"), Issue: "Paket tidak tersedia di event ini."})
			continue
		}
		lines = append(lines, QuoteLine{Package: f.pkg, Category: f.cat, Quantity: it.Quantity})
	}
	if len(missing) > 0 {
		return nil, reject(ErrPackageUnavailable, missing...)
	}
	// Keputusan produk versi ini: satu pesanan satu kategori, supaya pilih kursi
	// dan penahanan kuota cukup memikirkan satu denah.
	for _, l := range lines[1:] {
		if l.Category.ID != lines[0].Category.ID {
			return nil, reject(ErrMixedCategory, Issue{Field: "items", Issue: "Satu pesanan hanya boleh berisi paket dari satu kategori."})
		}
	}
	return lines, nil
}

// checkStock menghitung total orang lalu mencocokkannya dengan batas pesanan,
// kuota paket, dan sisa kategori. Hitungannya int64 supaya jumlah besar dari
// klien tidak meluap sebelum sempat ditolak.
func checkStock(lines []QuoteLine, st stock) (int32, error) {
	var pax int64
	for _, l := range lines {
		pax += int64(l.Package.Pax) * int64(l.Quantity)
	}
	if pax > MaxPax {
		return 0, reject(ErrPaxLimit, Issue{Field: "items", Issue: paxIssue()})
	}

	var issues []Issue
	for i, l := range lines {
		if l.Package.Quota != nil && l.Quantity > *l.Package.Quota {
			issues = append(issues, Issue{
				Field: itemField(i, "quantity"),
				Issue: fmt.Sprintf("Sisa paket %s tinggal %d.", l.Package.Name, max(*l.Package.Quota, 0)),
			})
		}
	}
	cat := lines[0].Category
	view := categoryView(cat, nil, st.seats[cat.ID])
	if pax > int64(view.Left) {
		issues = append(issues, Issue{
			Field: "items",
			Issue: fmt.Sprintf("Sisa kuota %s tinggal %d orang.", cat.Name, view.Left),
		})
	}
	if len(issues) > 0 {
		return 0, reject(ErrQuotaExceeded, issues...)
	}
	return int32(pax), nil
}

func itemField(i int, name string) string { return fmt.Sprintf("items[%d].%s", i, name) }

func paxIssue() string { return fmt.Sprintf("Maksimal %d orang per pesanan.", MaxPax) }
