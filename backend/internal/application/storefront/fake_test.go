package storefront

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

// fakeRepo meniru penyaringan SQL seperlunya saja: status published dan tanggal.
type fakeRepo struct {
	events     []event.Event
	categories []category.Category
	packages   []category.Package
	seats      map[uuid.UUID]int32
	gallery    map[uuid.UUID][]Image
	bookings   []event.SlotBooking
}

func (f *fakeRepo) ListPublishedFrom(_ context.Context, from string) ([]event.Event, error) {
	var out []event.Event
	for _, ev := range f.events {
		if ev.Status == event.StatusPublished && ev.Date >= from {
			out = append(out, ev)
		}
	}
	return out, nil
}

func (f *fakeRepo) GetPublished(_ context.Context, id uuid.UUID) (event.Event, error) {
	for _, ev := range f.events {
		if ev.ID == id && ev.Status == event.StatusPublished {
			return ev, nil
		}
	}
	return event.Event{}, event.ErrNotFound
}

func (f *fakeRepo) Categories(_ context.Context, ids []uuid.UUID) ([]category.Category, error) {
	var out []category.Category
	for _, c := range f.categories {
		if contains(ids, c.EventID) {
			out = append(out, c)
		}
	}
	return out, nil
}

func (f *fakeRepo) ActivePackages(_ context.Context, _ []uuid.UUID) ([]category.Package, error) {
	var out []category.Package
	for _, p := range f.packages {
		if p.IsActive {
			out = append(out, p)
		}
	}
	return out, nil
}

func (f *fakeRepo) AvailableSeats(context.Context, []uuid.UUID) (map[uuid.UUID]int32, error) {
	return f.seats, nil
}

func (f *fakeRepo) Gallery(_ context.Context, id uuid.UUID) ([]Image, error) {
	return f.gallery[id], nil
}

func (f *fakeRepo) SlotBookings(context.Context, []uuid.UUID) ([]event.SlotBooking, error) {
	return f.bookings, nil
}

func contains(ids []uuid.UUID, id uuid.UUID) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func ptr[T any](v T) *T { return &v }

// now: 11 November 2026 jam 10.00 WIB.
var now = time.Date(2026, 11, 11, 10, 0, 0, 0, shared.Jakarta)

type fixture struct {
	repo                          *fakeRepo
	today, future, ended, waiting event.Event
	festival, vip, empty          category.Category
	single, couple, group, vipOne category.Package
	inactive                      category.Package
}

func newFixture() *fixture {
	base := event.Event{
		Status: event.StatusPublished, OpenMinutes: 480, CloseMinutes: 600,
		SlotMinutes: 60, SlotCapacity: 10, CounterCount: 1, ServiceSeconds: 60,
		FeeBearer: event.FeeBearerCustomer, FeePercentBP: 200,
	}
	fx := &fixture{}
	fx.today, fx.future, fx.ended, fx.waiting = base, base, base, base
	fx.today.ID, fx.today.Name, fx.today.Date = uuid.New(), "Hari Ini", "2026-11-11"
	fx.future.ID, fx.future.Name, fx.future.Date = uuid.New(), "Tahun Baru", "2026-12-31"
	fx.ended.ID, fx.ended.Name, fx.ended.Date = uuid.New(), "Selesai Jual", "2026-11-20"
	fx.ended.SaleEndsAt = ptr(now.Add(-time.Hour))
	fx.waiting.ID, fx.waiting.Name, fx.waiting.Date = uuid.New(), "Belum Jual", "2026-11-25"
	fx.waiting.SaleStartsAt = ptr(now.Add(24 * time.Hour))
	past := base
	past.ID, past.Date = uuid.New(), "2026-11-10"
	draft := base
	draft.ID, draft.Date, draft.Status = uuid.New(), "2026-11-30", event.StatusDraft

	fx.festival = category.Category{ID: uuid.New(), EventID: fx.today.ID, Name: "Festival", Quota: ptr[int32](600)}
	fx.vip = category.Category{ID: uuid.New(), EventID: fx.today.ID, Name: "VIP A", IsSeated: true, SortOrder: 1}
	fx.empty = category.Category{ID: uuid.New(), EventID: fx.today.ID, Name: "Habis", Quota: ptr[int32](0), SortOrder: 2}

	pkg := func(cat category.Category, name string, pax int32, price int64) category.Package {
		return category.Package{ID: uuid.New(), CategoryID: cat.ID, Name: name, Pax: pax, Price: price, IsActive: true}
	}
	fx.single = pkg(fx.festival, "Single", 1, 250000)
	fx.couple = pkg(fx.festival, "Couple", 2, 450000)
	fx.group = pkg(fx.festival, "Group", 3, 650000)
	fx.group.Quota = ptr[int32](1)
	fx.vipOne = pkg(fx.vip, "Single", 1, 750000)
	fx.inactive = pkg(fx.festival, "Lama", 1, 100000)
	fx.inactive.IsActive = false

	fx.repo = &fakeRepo{
		events:     []event.Event{fx.today, fx.future, fx.ended, fx.waiting, past, draft},
		categories: []category.Category{fx.festival, fx.vip, fx.empty},
		packages:   []category.Package{fx.single, fx.couple, fx.group, fx.vipOne, fx.inactive},
		seats:      map[uuid.UUID]int32{fx.vip.ID: 2},
		gallery: map[uuid.UUID][]Image{
			fx.today.ID: {{FileName: "foto-1.jpg", Width: 1200, Height: 800, Alt: "Panggung"}},
		},
	}
	return fx
}

func (fx *fixture) service() *Service {
	return New(fx.repo, func() time.Time { return now })
}

// clone menyalin slice yang boleh diubah tes, supaya satu kasus tidak bocor ke kasus lain.
func (fx *fixture) clone() *fixture {
	c := *fx
	repo := *fx.repo
	repo.events = append([]event.Event(nil), fx.repo.events...)
	repo.categories = append([]category.Category(nil), fx.repo.categories...)
	c.repo = &repo
	return &c
}
