package dto

import (
	"time"

	"github.com/RafiAkem/antay/backend/internal/application/storefront"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

// MediaPrefix adalah path publik berkas di UPLOAD_DIR. event_images cuma
// menyimpan nama berkas, URL lengkapnya disusun di sini.
const MediaPrefix = "/media/"

// CatalogEvent = Event versi 1 apa adanya ditambah data jualan. Event di-embed
// supaya field v1 (termasuk slots) tetap terkirim dan halaman lama tidak rusak.
type CatalogEvent struct {
	Event
	Description  string  `json:"description"`
	PosterURL    string  `json:"posterUrl"`
	SaleStartsAt *string `json:"saleStartsAt"`
	SaleEndsAt   *string `json:"saleEndsAt"`
	OnSale       bool    `json:"onSale"`
	PriceFrom    *int64  `json:"priceFrom"`
	Left         int32   `json:"left"`
}

type CatalogPackage struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Pax         int32  `json:"pax"`
	Price       int64  `json:"price"`
	PricePerPax int64  `json:"pricePerPax"`
	Left        *int32 `json:"left"`
}

type CatalogCategory struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	SortOrder   int32            `json:"sortOrder"`
	IsSeated    bool             `json:"isSeated"`
	PriceFrom   *int64           `json:"priceFrom"`
	Left        int32            `json:"left"`
	SoldOut     bool             `json:"soldOut"`
	Packages    []CatalogPackage `json:"packages"`
}

type CatalogImage struct {
	URL    string `json:"url"`
	Width  int32  `json:"width"`
	Height int32  `json:"height"`
	Alt    string `json:"alt"`
}

type CatalogEventDetail struct {
	CatalogEvent
	Categories []CatalogCategory `json:"categories"`
	Gallery    []CatalogImage    `json:"gallery"`
}

// rfc3339 mengirim waktu dalam zona Jakarta, supaya yang dibaca orang di log
// atau devtools sama dengan jam di poster.
func rfc3339(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.In(shared.Jakarta).Format(time.RFC3339)
	return &s
}

func CatalogEventOf(v storefront.EventView) CatalogEvent {
	ev := v.Availability.Event
	return CatalogEvent{
		Event:        EventOf(v.Availability),
		Description:  ev.Description,
		PosterURL:    ev.PosterURL,
		SaleStartsAt: rfc3339(ev.SaleStartsAt),
		SaleEndsAt:   rfc3339(ev.SaleEndsAt),
		OnSale:       v.OnSale,
		PriceFrom:    v.PriceFrom,
		Left:         v.Left,
	}
}

func CatalogEventsOf(list []storefront.EventView) []CatalogEvent {
	out := make([]CatalogEvent, 0, len(list))
	for _, v := range list {
		out = append(out, CatalogEventOf(v))
	}
	return out
}

func CatalogCategoryOf(c storefront.CategoryView) CatalogCategory {
	pkgs := make([]CatalogPackage, 0, len(c.Packages))
	for _, p := range c.Packages {
		pkgs = append(pkgs, CatalogPackage{
			ID:          p.Package.ID.String(),
			Name:        p.Package.Name,
			Pax:         p.Package.Pax,
			Price:       p.Package.Price,
			PricePerPax: p.PricePerPax,
			Left:        p.Left,
		})
	}
	return CatalogCategory{
		ID:          c.Category.ID.String(),
		Name:        c.Category.Name,
		Description: c.Category.Description,
		SortOrder:   c.Category.SortOrder,
		IsSeated:    c.Category.IsSeated,
		PriceFrom:   c.PriceFrom,
		Left:        c.Left,
		SoldOut:     c.SoldOut,
		Packages:    pkgs,
	}
}

func CatalogEventDetailOf(d storefront.Detail) CatalogEventDetail {
	cats := make([]CatalogCategory, 0, len(d.Categories))
	for _, c := range d.Categories {
		cats = append(cats, CatalogCategoryOf(c))
	}
	gallery := make([]CatalogImage, 0, len(d.Gallery))
	for _, img := range d.Gallery {
		gallery = append(gallery, CatalogImage{
			URL:    MediaPrefix + img.FileName,
			Width:  img.Width,
			Height: img.Height,
			Alt:    img.Alt,
		})
	}
	return CatalogEventDetail{CatalogEvent: CatalogEventOf(d.EventView), Categories: cats, Gallery: gallery}
}

type QuoteLine struct {
	PackageID      string `json:"packageId"`
	PackageName    string `json:"packageName"`
	CategoryID     string `json:"categoryId"`
	CategoryName   string `json:"categoryName"`
	Pax            int32  `json:"pax"`
	Quantity       int32  `json:"quantity"`
	UnitPrice      int64  `json:"unitPrice"`
	LineTotal      int64  `json:"lineTotal"`
	DiscountAmount int64  `json:"discountAmount"`
}

type AppliedDiscount struct {
	DiscountID string `json:"discountId"`
	Name       string `json:"name"`
	Kind       string `json:"kind"`
	Code       string `json:"code"`
	Amount     int64  `json:"amount"`
}

type Quote struct {
	EventID          string            `json:"eventId"`
	Items            []QuoteLine       `json:"items"`
	TotalPax         int32             `json:"totalPax"`
	Subtotal         int64             `json:"subtotal"`
	DiscountTotal    int64             `json:"discountTotal"`
	Fee              int64             `json:"fee"`
	Total            int64             `json:"total"`
	AppliedDiscounts []AppliedDiscount `json:"appliedDiscounts"`
	// PromoRejection berisi alasan snake_case dari paket pricing, null bila
	// kode tidak diisi atau terpasang.
	PromoRejection *string `json:"promoRejection"`
}

// QuoteOf mengirim fee sebagai bagian yang dibayar pembeli. Kalau biaya
// ditanggung penyelenggara, pembeli tidak perlu melihat angkanya (PRD 5.6).
func QuoteOf(q storefront.Quote) Quote {
	items := make([]QuoteLine, 0, len(q.Lines))
	for _, l := range q.Lines {
		items = append(items, QuoteLine{
			PackageID:      l.Package.ID.String(),
			PackageName:    l.Package.Name,
			CategoryID:     l.Category.ID.String(),
			CategoryName:   l.Category.Name,
			Pax:            l.Package.Pax,
			Quantity:       l.Quantity,
			UnitPrice:      l.UnitPrice,
			LineTotal:      l.LineTotal,
			DiscountAmount: l.DiscountAmount,
		})
	}
	applied := make([]AppliedDiscount, 0, len(q.Result.Applied))
	for _, a := range q.Result.Applied {
		applied = append(applied, AppliedDiscount{
			DiscountID: a.DiscountID.String(),
			Name:       a.Name,
			Kind:       string(a.Kind),
			Code:       a.Code,
			Amount:     a.Amount,
		})
	}
	var rejection *string
	if q.Result.CodeRejection != "" {
		r := string(q.Result.CodeRejection)
		rejection = &r
	}
	return Quote{
		EventID:          q.EventID.String(),
		Items:            items,
		TotalPax:         q.TotalPax,
		Subtotal:         q.Result.Subtotal,
		DiscountTotal:    q.Result.DiscountTotal,
		Fee:              q.Result.CustomerFee,
		Total:            q.Result.Total,
		AppliedDiscounts: applied,
		PromoRejection:   rejection,
	}
}
