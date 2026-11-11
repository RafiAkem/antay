package postgres

import (
	"context"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/storefront"
	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

// StorefrontRepo adalah sisi baca katalog pembeli. Tidak ada tulisan di sini;
// penahanan kuota dan kursi ada di alur pesanan.
type StorefrontRepo struct {
	q *store.Queries
}

func NewStorefrontRepo(q *store.Queries) *StorefrontRepo { return &StorefrontRepo{q: q} }

var _ storefront.Repository = (*StorefrontRepo)(nil)

func (r *StorefrontRepo) ListPublishedFrom(ctx context.Context, fromDate string) ([]event.Event, error) {
	rows, err := r.q.ListStorefrontEvents(ctx, fromDate)
	if err != nil {
		return nil, err
	}
	return eventsOf(rows), nil
}

func (r *StorefrontRepo) GetPublished(ctx context.Context, id uuid.UUID) (event.Event, error) {
	return oneEvent(r.q.GetStorefrontEvent(ctx, id))
}

func (r *StorefrontRepo) Categories(ctx context.Context, eventIDs []uuid.UUID) ([]category.Category, error) {
	rows, err := r.q.ListStorefrontCategories(ctx, eventIDs)
	if err != nil {
		return nil, err
	}
	out := make([]category.Category, 0, len(rows))
	for _, c := range rows {
		out = append(out, category.Category{
			ID:          c.ID,
			EventID:     c.EventID,
			Name:        c.Name,
			Description: c.Description,
			SortOrder:   c.SortOrder,
			IsSeated:    c.IsSeated,
			Quota:       c.Quota,
			CreatedAt:   c.CreatedAt.Time,
			UpdatedAt:   c.UpdatedAt.Time,
		})
	}
	return out, nil
}

func (r *StorefrontRepo) ActivePackages(ctx context.Context, eventIDs []uuid.UUID) ([]category.Package, error) {
	rows, err := r.q.ListStorefrontPackages(ctx, eventIDs)
	if err != nil {
		return nil, err
	}
	out := make([]category.Package, 0, len(rows))
	for _, p := range rows {
		out = append(out, category.Package{
			ID:         p.ID,
			CategoryID: p.CategoryID,
			Name:       p.Name,
			Pax:        p.Pax,
			Price:      p.Price,
			Quota:      p.Quota,
			SortOrder:  p.SortOrder,
			IsActive:   p.IsActive,
			CreatedAt:  p.CreatedAt.Time,
			UpdatedAt:  p.UpdatedAt.Time,
		})
	}
	return out, nil
}

func (r *StorefrontRepo) AvailableSeats(ctx context.Context, eventIDs []uuid.UUID) (map[uuid.UUID]int32, error) {
	rows, err := r.q.CountStorefrontAvailableSeats(ctx, eventIDs)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]int32, len(rows))
	for _, row := range rows {
		out[row.CategoryID] = row.Available
	}
	return out, nil
}

func (r *StorefrontRepo) Gallery(ctx context.Context, eventID uuid.UUID) ([]storefront.Image, error) {
	rows, err := r.q.ListStorefrontGallery(ctx, eventID)
	if err != nil {
		return nil, err
	}
	out := make([]storefront.Image, 0, len(rows))
	for _, row := range rows {
		out = append(out, storefront.Image{
			FileName: row.FileName,
			Width:    row.Width,
			Height:   row.Height,
			Alt:      row.Alt,
		})
	}
	return out, nil
}

// SlotBookings memakai query versi 1 yang sama dengan katalog lama, supaya sisa
// slot di halaman baru dan lama tidak pernah beda.
func (r *StorefrontRepo) SlotBookings(ctx context.Context, eventIDs []uuid.UUID) ([]event.SlotBooking, error) {
	rows, err := r.q.EventSlotBookings(ctx, eventIDs)
	if err != nil {
		return nil, err
	}
	out := make([]event.SlotBooking, 0, len(rows))
	for _, row := range rows {
		out = append(out, event.SlotBooking{
			EventID:   row.EventID,
			SlotStart: row.SlotStart,
			Booked:    row.Booked,
			Redeemed:  row.Redeemed,
		})
	}
	return out, nil
}
