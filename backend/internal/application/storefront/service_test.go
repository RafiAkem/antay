package storefront

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

func TestListEventsHidesPastDraftAndEndedSale(t *testing.T) {
	fx := newFixture()
	views, err := fx.service().ListEvents(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	got := map[uuid.UUID]EventView{}
	for _, v := range views {
		got[v.Availability.Event.ID] = v
	}
	if len(got) != 3 {
		t.Fatalf("jumlah event = %d, mau 3 (hari ini, tahun baru, belum jual)", len(got))
	}
	if _, ok := got[fx.ended.ID]; ok {
		t.Fatal("event yang penjualannya selesai ikut tampil")
	}
	if !got[fx.today.ID].OnSale || !got[fx.future.ID].OnSale {
		t.Fatal("event tanpa jendela jual harus onSale")
	}
	if got[fx.waiting.ID].OnSale {
		t.Fatal("event yang belum mulai dijual tidak boleh onSale")
	}
}

func TestEventWithoutPackagesHasNullPriceFrom(t *testing.T) {
	fx := newFixture()
	views, err := fx.service().ListEvents(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range views {
		switch v.Availability.Event.ID {
		case fx.future.ID:
			if v.PriceFrom != nil || v.Left != 0 {
				t.Fatalf("tahun baru: priceFrom=%v left=%d, mau nil dan 0", v.PriceFrom, v.Left)
			}
			// Event hari depan: tidak ada slot yang ditandai lewat.
			for _, s := range v.Availability.Slots {
				if s.Past || s.Current {
					t.Fatalf("slot %d event hari depan ditandai lewat/berjalan", s.Start)
				}
			}
		case fx.today.ID:
			if v.PriceFrom == nil || *v.PriceFrom != 250000 {
				t.Fatalf("hari ini: priceFrom=%v, mau 250000", v.PriceFrom)
			}
			// 600 festival + 2 kursi VIP + 0 kategori habis
			if v.Left != 602 {
				t.Fatalf("hari ini: left=%d, mau 602", v.Left)
			}
			// jam 10.00 dengan slot 08-09 dan 09-10: dua-duanya sudah lewat
			if v.Availability.LeftTotal != 0 {
				t.Fatalf("leftTotal=%d, mau 0", v.Availability.LeftTotal)
			}
		}
	}
}

func TestGetEventCategories(t *testing.T) {
	fx := newFixture()
	d, err := fx.service().GetEvent(context.Background(), fx.today.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(d.Categories) != 3 {
		t.Fatalf("kategori = %d, mau 3 (yang habis tetap tampil)", len(d.Categories))
	}
	byName := map[string]CategoryView{}
	for _, c := range d.Categories {
		byName[c.Category.Name] = c
	}

	fest := byName["Festival"]
	if len(fest.Packages) != 3 {
		t.Fatalf("paket festival = %d, mau 3 (yang nonaktif disembunyikan)", len(fest.Packages))
	}
	if fest.Left != 600 || fest.SoldOut || *fest.PriceFrom != 250000 {
		t.Fatalf("festival: left=%d soldOut=%v priceFrom=%d", fest.Left, fest.SoldOut, *fest.PriceFrom)
	}
	for _, p := range fest.Packages {
		if p.Package.Name == "Group" {
			if p.PricePerPax != 216666 {
				t.Fatalf("pricePerPax group = %d, mau 216666 (dibulatkan ke bawah)", p.PricePerPax)
			}
			if p.Left == nil || *p.Left != 1 {
				t.Fatalf("left group = %v, mau 1", p.Left)
			}
		} else if p.Left != nil {
			t.Fatalf("paket %s tanpa kuota harus left nil", p.Package.Name)
		}
	}

	if vip := byName["VIP A"]; vip.Left != 2 || vip.SoldOut {
		t.Fatalf("VIP berkursi: left=%d soldOut=%v, mau 2 dari jumlah kursi available", vip.Left, vip.SoldOut)
	}
	if empty := byName["Habis"]; !empty.SoldOut || empty.PriceFrom != nil {
		t.Fatalf("kategori habis: soldOut=%v priceFrom=%v", empty.SoldOut, empty.PriceFrom)
	}
	if len(d.Gallery) != 1 || d.Gallery[0].FileName != "foto-1.jpg" {
		t.Fatalf("galeri = %+v", d.Gallery)
	}
}

func TestSeatedCategoryWithoutSeatsIsSoldOut(t *testing.T) {
	c := category.Category{ID: uuid.New(), IsSeated: true}
	v := categoryView(c, nil, 0)
	if !v.SoldOut || v.Left != 0 {
		t.Fatalf("kategori berkursi tanpa kursi: left=%d soldOut=%v", v.Left, v.SoldOut)
	}
}

func TestGetEventUnpublishedIsNotFound(t *testing.T) {
	fx := newFixture()
	draftID := fx.repo.events[5].ID
	for _, id := range []uuid.UUID{draftID, uuid.New()} {
		if _, err := fx.service().GetEvent(context.Background(), id); !errors.Is(err, event.ErrNotFound) {
			t.Fatalf("GetEvent(%s) err = %v, mau ErrNotFound", id, err)
		}
	}
}
