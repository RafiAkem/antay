package storefront

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/pricing"
)

func TestQuoteHappyPathAddsCustomerFee(t *testing.T) {
	fx := newFixture()
	q, err := fx.service().Quote(context.Background(), QuoteRequest{
		EventID: fx.today.ID,
		Items:   []QuoteItem{{PackageID: fx.couple.ID, Quantity: 1}, {PackageID: fx.single.ID, Quantity: 2}},
	})
	if err != nil {
		t.Fatal(err)
	}
	// 450.000 + 2 x 250.000 = 950.000, biaya 2% = 19.000
	r := q.Result
	if r.Subtotal != 950000 || r.DiscountTotal != 0 || r.CustomerFee != 19000 || r.Total != 969000 {
		t.Fatalf("subtotal=%d diskon=%d fee=%d total=%d", r.Subtotal, r.DiscountTotal, r.CustomerFee, r.Total)
	}
	if q.TotalPax != 4 {
		t.Fatalf("totalPax = %d, mau 4", q.TotalPax)
	}
	if q.Lines[1].LineTotal != 500000 || q.Lines[1].UnitPrice != 250000 || q.Lines[1].Category.Name != "Festival" {
		t.Fatalf("baris kedua = %+v", q.Lines[1])
	}
	if r.CodeRejection != "" {
		t.Fatalf("tanpa kode promo, rejection harus kosong, dapat %q", r.CodeRejection)
	}
}

func TestQuoteOrganizerFeeIsHiddenFromTotal(t *testing.T) {
	fx := newFixture()
	fx.repo.events[0].FeeBearer = event.FeeBearerOrganizer
	q, err := fx.service().Quote(context.Background(), QuoteRequest{
		EventID: fx.today.ID, Items: []QuoteItem{{PackageID: fx.single.ID, Quantity: 1}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if q.Result.CustomerFee != 0 || q.Result.Total != 250000 || q.Result.OrganizerFee != 5000 {
		t.Fatalf("fee pembeli=%d total=%d fee penyelenggara=%d", q.Result.CustomerFee, q.Result.Total, q.Result.OrganizerFee)
	}
}

func TestQuoteUnknownPromoCodeIsReported(t *testing.T) {
	fx := newFixture()
	q, err := fx.service().Quote(context.Background(), QuoteRequest{
		EventID: fx.today.ID, Items: []QuoteItem{{PackageID: fx.single.ID, Quantity: 1}}, PromoCode: " bobotoh ",
	})
	if err != nil {
		t.Fatal(err)
	}
	if q.Result.CodeRejection != pricing.RejectUnknownCode {
		t.Fatalf("rejection = %q, mau unknown_code", q.Result.CodeRejection)
	}
}

func TestQuoteErrors(t *testing.T) {
	fx := newFixture()
	one := func(id uuid.UUID, qty int32) []QuoteItem { return []QuoteItem{{PackageID: id, Quantity: qty}} }
	many := make([]QuoteItem, 11)
	for i := range many {
		many[i] = QuoteItem{PackageID: uuid.New(), Quantity: 1}
	}

	tests := []struct {
		name      string
		eventID   uuid.UUID
		items     []QuoteItem
		mutate    func(*fakeRepo)
		want      error
		wantField string
	}{
		{name: "keranjang kosong", eventID: fx.today.ID, want: ErrInvalidItems, wantField: "items"},
		{name: "jumlah nol", eventID: fx.today.ID, items: one(fx.single.ID, 0), want: ErrInvalidItems, wantField: "items[0].quantity"},
		{name: "paket kembar", eventID: fx.today.ID,
			items: []QuoteItem{{PackageID: fx.single.ID, Quantity: 1}, {PackageID: fx.single.ID, Quantity: 1}},
			want:  ErrInvalidItems, wantField: "items[1].packageId"},
		{name: "terlalu banyak baris", eventID: fx.today.ID, items: many, want: ErrPaxLimit},
		{name: "event tidak dikenal", eventID: uuid.New(), items: one(fx.single.ID, 1), want: event.ErrNotFound},
		{name: "belum dibuka", eventID: fx.waiting.ID, items: one(fx.single.ID, 1), want: ErrSaleNotOpen},
		{name: "sudah berakhir", eventID: fx.ended.ID, items: one(fx.single.ID, 1), want: ErrSaleEnded},
		{name: "tanggal event lewat", eventID: fx.today.ID, items: one(fx.single.ID, 1),
			mutate: func(r *fakeRepo) { r.events[0].Date = "2026-11-10" }, want: ErrSaleEnded},
		{name: "lewat 10 orang", eventID: fx.today.ID, items: one(fx.couple.ID, 6), want: ErrPaxLimit},
		{name: "paket asing", eventID: fx.today.ID,
			items: []QuoteItem{{PackageID: fx.single.ID, Quantity: 1}, {PackageID: uuid.New(), Quantity: 1}},
			want:  ErrPackageUnavailable, wantField: "items[1].packageId"},
		{name: "paket nonaktif", eventID: fx.today.ID, items: one(fx.inactive.ID, 1), want: ErrPackageUnavailable, wantField: "items[0].packageId"},
		{name: "campur kategori", eventID: fx.today.ID,
			items: []QuoteItem{{PackageID: fx.single.ID, Quantity: 1}, {PackageID: fx.vipOne.ID, Quantity: 1}},
			want:  ErrMixedCategory},
		{name: "kuota paket", eventID: fx.today.ID, items: one(fx.group.ID, 2), want: ErrQuotaExceeded, wantField: "items[0].quantity"},
		{name: "kursi kurang", eventID: fx.today.ID, items: one(fx.vipOne.ID, 3), want: ErrQuotaExceeded, wantField: "items"},
		{name: "kuota kategori", eventID: fx.today.ID, items: one(fx.single.ID, 5),
			mutate: func(r *fakeRepo) { r.categories[0].Quota = ptr[int32](4) }, want: ErrQuotaExceeded, wantField: "items"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			fx := fx.clone()
			if tc.mutate != nil {
				tc.mutate(fx.repo)
			}
			_, err := fx.service().Quote(context.Background(), QuoteRequest{EventID: tc.eventID, Items: tc.items})
			if !errors.Is(err, tc.want) {
				t.Fatalf("err = %v, mau %v", err, tc.want)
			}
			if tc.wantField == "" {
				return
			}
			var rej *Rejection
			if !errors.As(err, &rej) || len(rej.Issues) == 0 || rej.Issues[0].Field != tc.wantField {
				t.Fatalf("issues = %+v, mau field %s", rej, tc.wantField)
			}
		})
	}
}

func TestQuoteSaleWindowEdges(t *testing.T) {
	fx := newFixture()
	fx.repo.events[0].SaleStartsAt = ptr(now)
	fx.repo.events[0].SaleEndsAt = ptr(now.Add(time.Minute))
	items := []QuoteItem{{PackageID: fx.single.ID, Quantity: 1}}
	if _, err := fx.service().Quote(context.Background(), QuoteRequest{EventID: fx.today.ID, Items: items}); err != nil {
		t.Fatalf("tepat di saleStartsAt harus sudah dibuka: %v", err)
	}
	fx.repo.events[0].SaleEndsAt = ptr(now)
	_, err := fx.service().Quote(context.Background(), QuoteRequest{EventID: fx.today.ID, Items: items})
	if !errors.Is(err, ErrSaleEnded) {
		t.Fatalf("tepat di saleEndsAt harus sudah berakhir, err = %v", err)
	}
}
