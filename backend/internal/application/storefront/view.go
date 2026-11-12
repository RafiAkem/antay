package storefront

import (
	"time"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

// PackageView adalah paket beserta angka yang sudah dihitung untuk pembeli.
type PackageView struct {
	Package category.Package
	// PricePerPax dibulatkan ke bawah; cuma keterangan pembanding, bukan dasar tagihan.
	PricePerPax int64
	// Left nil artinya paket tidak punya kuota sendiri dan ikut kuota kategori.
	Left *int32
}

type CategoryView struct {
	Category  category.Category
	Packages  []PackageView
	PriceFrom *int64
	// Left dalam orang, bukan jumlah paket.
	Left    int32
	SoldOut bool
}

type EventView struct {
	Availability event.Availability
	OnSale       bool
	PriceFrom    *int64
	Left         int32
	Categories   []CategoryView
}

type Detail struct {
	EventView
	Gallery []Image
}

// categoryView menghitung sisa kategori. Kategori berkursi sisanya jumlah kursi
// available. Kategori tanpa kursi untuk sekarang sisanya sama dengan quota,
// karena tabel pesanan belum ada; begitu pesanan masuk, yang terjual tinggal
// dikurangkan di sini.
func categoryView(c category.Category, pkgs []category.Package, availableSeats int32) CategoryView {
	var left int32
	if c.IsSeated {
		left = availableSeats
	} else if c.Quota != nil {
		left = *c.Quota
	}
	left = max(left, 0)

	views := make([]PackageView, 0, len(pkgs))
	var from *int64
	for _, p := range pkgs {
		if !p.IsActive {
			continue
		}
		v := PackageView{Package: p, PricePerPax: p.Price / int64(max(p.Pax, 1))}
		if p.Quota != nil {
			q := max(*p.Quota, 0)
			v.Left = &q
		}
		views = append(views, v)
		if from == nil || p.Price < *from {
			price := p.Price
			from = &price
		}
	}
	return CategoryView{Category: c, Packages: views, PriceFrom: from, Left: left, SoldOut: left <= 0}
}

func eventView(av event.Availability, cats []CategoryView, now time.Time) EventView {
	v := EventView{Availability: av, OnSale: onSale(av.Event, now), Categories: cats}
	for _, c := range cats {
		v.Left += c.Left
		if c.PriceFrom != nil && (v.PriceFrom == nil || *c.PriceFrom < *v.PriceFrom) {
			from := *c.PriceFrom
			v.PriceFrom = &from
		}
	}
	return v
}

// onSale memakai batas mulai inklusif dan batas akhir eksklusif, sama dengan
// cara diskon dibaca di paket pricing. Batas yang kosong dianggap terbuka.
func onSale(ev event.Event, now time.Time) bool {
	return !saleNotStarted(ev, now) && !saleEnded(ev, now)
}

func saleNotStarted(ev event.Event, now time.Time) bool {
	return ev.SaleStartsAt != nil && now.Before(*ev.SaleStartsAt)
}

func saleEnded(ev event.Event, now time.Time) bool {
	return ev.SaleEndsAt != nil && !now.Before(*ev.SaleEndsAt)
}
