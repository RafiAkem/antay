package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/RafiAkem/antay/backend/internal/domain/media"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

type MediaRepo struct {
	pool *pgxpool.Pool
	q    *store.Queries
}

func NewMediaRepo(pool *pgxpool.Pool, q *store.Queries) *MediaRepo {
	return &MediaRepo{pool: pool, q: q}
}

func (r *MediaRepo) Event(ctx context.Context, eventID uuid.UUID) (media.EventRef, error) {
	row, err := r.q.GetMediaEvent(ctx, eventID)
	if err != nil {
		return media.EventRef{}, mediaNotFound(err)
	}
	ref := media.EventRef{ID: row.ID, Status: row.Status}
	if row.OrganizerID.Valid {
		id := uuid.UUID(row.OrganizerID.Bytes)
		ref.OrganizerID = &id
	}
	return ref, nil
}

func (r *MediaRepo) List(ctx context.Context, eventID uuid.UUID) ([]media.Image, error) {
	rows, err := r.q.ListEventImages(ctx, eventID)
	if err != nil {
		return nil, err
	}
	return mediaImagesOf(rows), nil
}

func (r *MediaRepo) Get(ctx context.Context, imageID uuid.UUID) (media.Image, error) {
	row, err := r.q.GetEventImage(ctx, imageID)
	if err != nil {
		return media.Image{}, mediaNotFound(err)
	}
	return mediaImageOf(row), nil
}

func (r *MediaRepo) CountGallery(ctx context.Context, eventID uuid.UUID) (int, error) {
	stats, err := r.q.GalleryStats(ctx, eventID)
	return int(stats.Total), err
}

func (r *MediaRepo) ReplacePoster(ctx context.Context, img media.NewImage) (media.Image, []media.Image, error) {
	var created media.Image
	var old []media.Image
	err := r.inTx(ctx, func(q *store.Queries) error {
		if _, err := q.LockMediaEvent(ctx, img.EventID); err != nil {
			return mediaNotFound(err)
		}
		removed, err := q.DeleteEventPoster(ctx, img.EventID)
		if err != nil {
			return err
		}
		row, err := q.InsertEventImage(ctx, mediaInsertParams(img, 0))
		if err != nil {
			return err
		}
		created, old = mediaImageOf(row), mediaImagesOf(removed)
		return q.SetEventPosterURL(ctx, store.SetEventPosterURLParams{ID: img.EventID, PosterUrl: created.URL()})
	})
	if err != nil {
		return media.Image{}, nil, err
	}
	return created, old, nil
}

func (r *MediaRepo) AddGallery(ctx context.Context, img media.NewImage, max int) (media.Image, error) {
	var created media.Image
	err := r.inTx(ctx, func(q *store.Queries) error {
		if _, err := q.LockMediaEvent(ctx, img.EventID); err != nil {
			return mediaNotFound(err)
		}
		stats, err := q.GalleryStats(ctx, img.EventID)
		if err != nil {
			return err
		}
		if int(stats.Total) >= max {
			return media.ErrGalleryFull
		}
		row, err := q.InsertEventImage(ctx, mediaInsertParams(img, stats.NextOrder))
		created = mediaImageOf(row)
		return err
	})
	return created, err
}

func (r *MediaRepo) Delete(ctx context.Context, imageID uuid.UUID) (media.Image, error) {
	var removed media.Image
	err := r.inTx(ctx, func(q *store.Queries) error {
		row, err := q.DeleteEventImage(ctx, imageID)
		if err != nil {
			return mediaNotFound(err)
		}
		removed = mediaImageOf(row)
		if removed.Kind != media.KindPoster {
			return nil
		}
		return q.ClearEventPosterURL(ctx, store.ClearEventPosterURLParams{ID: removed.EventID, CurrentUrl: removed.URL()})
	})
	return removed, err
}

func (r *MediaRepo) Reorder(ctx context.Context, eventID uuid.UUID, ids []uuid.UUID) error {
	return r.inTx(ctx, func(q *store.Queries) error {
		if _, err := q.LockMediaEvent(ctx, eventID); err != nil {
			return mediaNotFound(err)
		}
		current, err := q.ListGalleryIDs(ctx, eventID)
		if err != nil {
			return err
		}
		if !sameGallerySet(current, ids) {
			return media.ErrInvalidOrder
		}
		for i, id := range ids {
			if err := q.SetGallerySortOrder(ctx, store.SetGallerySortOrderParams{ID: id, EventID: eventID, SortOrder: int32(i)}); err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *MediaRepo) UpdateAlt(ctx context.Context, imageID uuid.UUID, alt string) (media.Image, error) {
	row, err := r.q.UpdateEventImageAlt(ctx, store.UpdateEventImageAltParams{ID: imageID, Alt: alt})
	if err != nil {
		return media.Image{}, mediaNotFound(err)
	}
	return mediaImageOf(row), nil
}

func (r *MediaRepo) inTx(ctx context.Context, fn func(q *store.Queries) error) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := fn(r.q.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// sameGallerySet: urutan baru wajib memuat semua gambar galeri tepat satu kali,
// supaya tidak ada gambar yang tertinggal dengan sort_order lama.
func sameGallerySet(current, ids []uuid.UUID) bool {
	if len(current) != len(ids) {
		return false
	}
	want := make(map[uuid.UUID]bool, len(current))
	for _, id := range current {
		want[id] = true
	}
	for _, id := range ids {
		if !want[id] {
			return false
		}
		delete(want, id)
	}
	return true
}

func mediaNotFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return media.ErrNotFound
	}
	return err
}

func mediaInsertParams(img media.NewImage, order int32) store.InsertEventImageParams {
	return store.InsertEventImageParams{
		EventID: img.EventID, Kind: img.Kind, FileName: img.FileName, ContentType: img.ContentType,
		Width: img.Width, Height: img.Height, SizeBytes: img.SizeBytes, Alt: img.Alt, SortOrder: order,
	}
}

func mediaImageOf(row store.EventImage) media.Image {
	return media.Image{
		ID: row.ID, EventID: row.EventID, Kind: row.Kind, FileName: row.FileName, ContentType: row.ContentType,
		Width: row.Width, Height: row.Height, SizeBytes: row.SizeBytes, Alt: row.Alt, SortOrder: row.SortOrder,
		CreatedAt: row.CreatedAt.Time,
	}
}

func mediaImagesOf(rows []store.EventImage) []media.Image {
	out := make([]media.Image, 0, len(rows))
	for _, row := range rows {
		out = append(out, mediaImageOf(row))
	}
	return out
}
