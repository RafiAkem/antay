// Package storefront melayani etalase pembeli versi 2: daftar event yang dijual,
// detail kategori dan paket, dan hitung harga (quote) sebelum pesanan dibuat.
package storefront

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

// Image adalah satu foto galeri. URL publiknya disusun di lapisan HTTP dari
// FileName, supaya prefix /media cukup diatur di satu tempat.
type Image struct {
	FileName string
	Width    int32
	Height   int32
	Alt      string
}

// Repository adalah semua bacaan yang dibutuhkan etalase. Semua yang menerima
// banyak event sekaligus dipakai supaya daftar event tidak jadi query N+1.
type Repository interface {
	// ListPublishedFrom mengembalikan event published dengan tanggal >= fromDate.
	ListPublishedFrom(ctx context.Context, fromDate string) ([]event.Event, error)
	// GetPublished mengembalikan event.ErrNotFound bila tidak ada atau belum tayang.
	GetPublished(ctx context.Context, id uuid.UUID) (event.Event, error)
	Categories(ctx context.Context, eventIDs []uuid.UUID) ([]category.Category, error)
	// ActivePackages hanya berisi paket aktif.
	ActivePackages(ctx context.Context, eventIDs []uuid.UUID) ([]category.Package, error)
	// AvailableSeats adalah jumlah kursi berstatus available per kategori.
	AvailableSeats(ctx context.Context, eventIDs []uuid.UUID) (map[uuid.UUID]int32, error)
	Gallery(ctx context.Context, eventID uuid.UUID) ([]Image, error)
	SlotBookings(ctx context.Context, eventIDs []uuid.UUID) ([]event.SlotBooking, error)
}

type Service struct {
	repo  Repository
	clock shared.Clock
}

func New(repo Repository, clock shared.Clock) *Service {
	return &Service{repo: repo, clock: clock}
}

// ListEvents: event published yang tanggalnya belum lewat dan penjualannya
// belum berakhir. Event yang belum mulai dijual tetap tampil supaya pembeli
// bisa melihat kapan tiketnya dibuka.
func (s *Service) ListEvents(ctx context.Context) ([]EventView, error) {
	events, err := s.repo.ListPublishedFrom(ctx, s.clock.Today())
	if err != nil {
		return nil, fmt.Errorf("memuat daftar event: %w", err)
	}
	now := s.clock()
	visible := make([]event.Event, 0, len(events))
	for _, ev := range events {
		if !saleEnded(ev, now) {
			visible = append(visible, ev)
		}
	}
	return s.views(ctx, visible)
}

// GetEvent mengembalikan event.ErrNotFound bila event tidak ada atau belum tayang.
// Event yang jualannya sudah selesai tetap bisa dibuka lewat tautan langsung,
// cuma onSale-nya false.
func (s *Service) GetEvent(ctx context.Context, id uuid.UUID) (Detail, error) {
	ev, err := s.repo.GetPublished(ctx, id)
	if err != nil {
		return Detail{}, err
	}
	views, err := s.views(ctx, []event.Event{ev})
	if err != nil {
		return Detail{}, err
	}
	gallery, err := s.repo.Gallery(ctx, id)
	if err != nil {
		return Detail{}, fmt.Errorf("memuat galeri: %w", err)
	}
	if gallery == nil {
		gallery = []Image{}
	}
	return Detail{EventView: views[0], Gallery: gallery}, nil
}

// stock adalah semua angka kategori dan paket untuk sekumpulan event.
type stock struct {
	categories map[uuid.UUID][]category.Category // per event
	packages   map[uuid.UUID][]category.Package  // per kategori
	seats      map[uuid.UUID]int32               // per kategori
}

func (s *Service) loadStock(ctx context.Context, ids []uuid.UUID) (stock, error) {
	cats, err := s.repo.Categories(ctx, ids)
	if err != nil {
		return stock{}, fmt.Errorf("memuat kategori: %w", err)
	}
	pkgs, err := s.repo.ActivePackages(ctx, ids)
	if err != nil {
		return stock{}, fmt.Errorf("memuat paket: %w", err)
	}
	seats, err := s.repo.AvailableSeats(ctx, ids)
	if err != nil {
		return stock{}, fmt.Errorf("memuat sisa kursi: %w", err)
	}
	st := stock{
		categories: make(map[uuid.UUID][]category.Category),
		packages:   make(map[uuid.UUID][]category.Package),
		seats:      seats,
	}
	for _, c := range cats {
		st.categories[c.EventID] = append(st.categories[c.EventID], c)
	}
	for _, p := range pkgs {
		st.packages[p.CategoryID] = append(st.packages[p.CategoryID], p)
	}
	return st, nil
}

func (s *Service) views(ctx context.Context, events []event.Event) ([]EventView, error) {
	out := make([]EventView, 0, len(events))
	if len(events) == 0 {
		return out, nil
	}
	ids := make([]uuid.UUID, 0, len(events))
	for _, ev := range events {
		ids = append(ids, ev.ID)
	}
	st, err := s.loadStock(ctx, ids)
	if err != nil {
		return nil, err
	}
	rows, err := s.repo.SlotBookings(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("memuat isi slot: %w", err)
	}
	counts := event.OccupiedCounts(rows)

	now := s.clock()
	today := s.clock.Today()
	for _, ev := range events {
		// Event hari depan belum punya slot yang lewat, jadi jamnya dianggap
		// sebelum tengah malam. Kalau pakai jam sekarang, slot pagi event besok
		// ikut ditandai lewat.
		nowMinutes := int32(-1)
		if ev.Date == today {
			nowMinutes = s.clock.Minutes()
		}
		cats := make([]CategoryView, 0, len(st.categories[ev.ID]))
		for _, c := range st.categories[ev.ID] {
			cats = append(cats, categoryView(c, st.packages[c.ID], st.seats[c.ID]))
		}
		out = append(out, eventView(ev.Availability(counts[ev.ID], nowMinutes), cats, now))
	}
	return out, nil
}
