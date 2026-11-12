package main

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

// seedEvents memasang event demo beserta kategori dan paketnya. Event yang sudah
// ada (prefix + tanggal sama) tidak diduplikasi, cuma disambungkan ke
// penyelenggara dan jam penukarannya disamakan dengan seed.
func seedEvents(ctx context.Context, tx pgx.Tx, acc accounts, now time.Time) (map[string]uuid.UUID, error) {
	ids := make(map[string]uuid.UUID, len(eventSeeds))
	names := make([]string, 0, len(eventSeeds))
	for _, spec := range eventSeeds {
		id, err := upsertEvent(ctx, tx, spec, acc, now)
		if err != nil {
			return nil, fmt.Errorf("event %s: %w", spec.name, err)
		}
		ids[spec.key] = id
		names = append(names, spec.name)
		for i, cat := range spec.categories {
			if err := ensureCategory(ctx, tx, id, int32(i), cat); err != nil {
				return nil, fmt.Errorf("kategori %s/%s: %w", spec.name, cat.name, err)
			}
		}
	}
	// Event demo dari hari-hari sebelumnya ikut disambungkan, supaya riwayatnya
	// muncul di laporan penyelenggara. Disaring nama juga supaya event buatan
	// admin yang kebetulan berprefix sama tidak ikut terambil.
	_, err := tx.Exec(ctx, `
UPDATE events SET organizer_id = $1, updated_at = now()
WHERE organizer_id IS NULL AND name = ANY($2::text[])`, acc.organizerID, names)
	return ids, err
}

func upsertEvent(ctx context.Context, tx pgx.Tx, spec eventSeed, acc accounts, now time.Time) (uuid.UUID, error) {
	date := spec.date
	if date == "" {
		// Dihitung di Jakarta; kalau pakai zona server (sering UTC), seed yang
		// dijalankan sebelum jam 07.00 WIB menulis tanggal kemarin.
		date = now.Format("2006-01-02")
	}
	saleEnds, err := saleEndOf(spec, date)
	if err != nil {
		return uuid.Nil, err
	}
	// Event berjualan sejak seed dijalankan. Kalau seed baru jalan setelah
	// penjualan selesai, awalnya dikosongkan supaya CHECK jendela jual tetap lolos.
	var saleStarts *time.Time
	if spec.date != "" && now.Before(saleEnds) {
		saleStarts = &now
	}

	var id uuid.UUID
	err = tx.QueryRow(ctx, `
INSERT INTO events (code_prefix, name, place, item, requirement, event_date,
    open_minutes, close_minutes, slot_minutes, slot_capacity, counter_count,
    service_seconds, waiting_count, status, created_by, organizer_id, description,
    sale_starts_at, sale_ends_at, fee_bearer, fee_percent_bp, published_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'published',$14,$15,$16,$17,$18,'customer',$19,now())
ON CONFLICT (code_prefix, event_date) DO UPDATE SET
    organizer_id   = EXCLUDED.organizer_id,
    status         = 'published',
    open_minutes   = EXCLUDED.open_minutes,
    close_minutes  = EXCLUDED.close_minutes,
    description    = CASE WHEN events.description = '' THEN EXCLUDED.description ELSE events.description END,
    sale_starts_at = COALESCE(events.sale_starts_at, EXCLUDED.sale_starts_at),
    sale_ends_at   = EXCLUDED.sale_ends_at,
    fee_percent_bp = EXCLUDED.fee_percent_bp,
    published_at   = COALESCE(events.published_at, now()),
    updated_at     = now()
RETURNING id`,
		spec.prefix, spec.name, spec.place, spec.item, spec.requirement, date,
		spec.open, spec.close, spec.slotMinutes, spec.capacity, spec.counters,
		spec.serviceSeconds, spec.wait, acc.adminID, acc.organizerID, spec.description,
		saleStarts, saleEnds, spec.feeBP,
	).Scan(&id)
	return id, err
}

func saleEndOf(spec eventSeed, date string) (time.Time, error) {
	if spec.saleEnds != "" {
		return time.ParseInLocation("2006-01-02 15:04", spec.saleEnds, shared.Jakarta)
	}
	day, err := time.ParseInLocation("2006-01-02", date, shared.Jakarta)
	if err != nil {
		return time.Time{}, err
	}
	return day.Add(time.Duration(spec.close) * time.Minute), nil
}

// ensureCategory dan paketnya memakai ON CONFLICT pada index unik nama (huruf
// kecil), jadi kategori yang sudah diubah penyelenggara tidak ditimpa.
func ensureCategory(ctx context.Context, tx pgx.Tx, eventID uuid.UUID, sort int32, cat categorySeed) error {
	var quota *int32
	if !cat.seated {
		q := cat.quota
		quota = &q
	}
	_, err := tx.Exec(ctx, `
INSERT INTO ticket_categories (event_id, name, description, sort_order, is_seated, quota)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (event_id, lower(name)) DO NOTHING`,
		eventID, cat.name, cat.description, sort, cat.seated, quota)
	if err != nil {
		return err
	}
	var categoryID uuid.UUID
	err = tx.QueryRow(ctx,
		`SELECT id FROM ticket_categories WHERE event_id = $1 AND lower(name) = lower($2)`,
		eventID, cat.name).Scan(&categoryID)
	if err != nil {
		return err
	}
	for i, p := range cat.packages {
		_, err := tx.Exec(ctx, `
INSERT INTO packages (category_id, name, pax, price, sort_order)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (category_id, lower(name)) DO NOTHING`,
			categoryID, p.name, p.pax, p.price, int32(i))
		if err != nil {
			return fmt.Errorf("paket %s: %w", p.name, err)
		}
	}
	return nil
}
