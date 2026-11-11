package main

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/RafiAkem/antay/backend/internal/domain/seating"
)

// blockSeed: satu blok kursi demo. Posisi memakai satuan kanvas 1000x700 dengan
// panggung di tengah atas, jadi blok kiri diputar searah jarum jam supaya
// barisan depannya menghadap panggung, blok kanan sebaliknya.
type blockSeed struct {
	category string
	spec     seating.BlockSpec
	name     string
}

var newYearBlocks = []blockSeed{
	{category: "VIP A", name: "VIP A Tengah", spec: seating.BlockSpec{Code: "A", X: 500, Y: 140, RowCount: 4, SeatsPerRow: 16, Curve: 30, AisleAfter: []int{8}}},
	{category: "VIP B", name: "VIP B Kiri", spec: seating.BlockSpec{Code: "BL", X: 250, Y: 320, Rotation: 20, RowCount: 5, SeatsPerRow: 10}},
	{category: "VIP B", name: "VIP B Kanan", spec: seating.BlockSpec{Code: "BR", X: 750, Y: 320, Rotation: -20, RowCount: 5, SeatsPerRow: 10}},
	{category: "VIP C", name: "VIP C Belakang", spec: seating.BlockSpec{Code: "C", X: 500, Y: 470, RowCount: 6, SeatsPerRow: 24, Curve: 40, AisleAfter: []int{6, 12, 18}}},
}

// seedSeats membuat denah demo untuk event Tahun Baru. Kalau event itu sudah
// punya blok (misalnya penyelenggara sudah mengubah denahnya), seed tidak
// menyentuhnya sama sekali.
func seedSeats(ctx context.Context, tx pgx.Tx, ids map[string]uuid.UUID) (int, error) {
	eventID, ok := ids["newyear"]
	if !ok {
		return 0, nil
	}
	var existing int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM seat_blocks WHERE event_id = $1`, eventID).Scan(&existing); err != nil {
		return 0, err
	}
	if existing > 0 {
		return 0, nil
	}
	if _, err := tx.Exec(ctx, `
INSERT INTO venue_layouts (event_id, canvas_width, canvas_height, stage_x, stage_y, stage_width, stage_height, stage_label)
VALUES ($1, 1000, 700, 350, 30, 300, 60, 'Panggung utama')
ON CONFLICT (event_id) DO NOTHING`, eventID); err != nil {
		return 0, err
	}

	total := 0
	for i, b := range newYearBlocks {
		n, err := insertBlock(ctx, tx, eventID, i, b)
		if err != nil {
			return 0, fmt.Errorf("blok %s: %w", b.spec.Code, err)
		}
		total += n
	}
	return total, nil
}

func insertBlock(ctx context.Context, tx pgx.Tx, eventID uuid.UUID, sort int, b blockSeed) (int, error) {
	spec := b.spec
	if spec.SeatSpacing == 0 {
		spec.SeatSpacing = 28
	}
	if spec.RowSpacing == 0 {
		spec.RowSpacing = 32
	}
	if spec.FirstRowLabel == "" {
		spec.FirstRowLabel = "A"
	}
	if spec.Numbering == "" {
		spec.Numbering = seating.NumberingLTR
	}
	if spec.AisleAfter == nil {
		spec.AisleAfter = []int{}
	}
	seats, err := seating.Generate(spec)
	if err != nil {
		return 0, err
	}

	var categoryID uuid.UUID
	if err := tx.QueryRow(ctx,
		`SELECT id FROM ticket_categories WHERE event_id = $1 AND name = $2 AND is_seated`,
		eventID, b.category,
	).Scan(&categoryID); err != nil {
		return 0, fmt.Errorf("kategori %s: %w", b.category, err)
	}

	aisles := make([]int32, len(spec.AisleAfter))
	for i, a := range spec.AisleAfter {
		aisles[i] = int32(a)
	}
	var blockID uuid.UUID
	if err := tx.QueryRow(ctx, `
INSERT INTO seat_blocks (event_id, category_id, code, name, x, y, rotation, row_count, seats_per_row,
    curve, seat_spacing, row_spacing, first_row_label, numbering, aisle_after, sort_order)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
RETURNING id`,
		eventID, categoryID, spec.Code, b.name, spec.X, spec.Y, spec.Rotation, spec.RowCount, spec.SeatsPerRow,
		spec.Curve, spec.SeatSpacing, spec.RowSpacing, spec.FirstRowLabel, spec.Numbering, aisles, sort,
	).Scan(&blockID); err != nil {
		return 0, err
	}

	batch := &pgx.Batch{}
	for _, s := range seats {
		batch.Queue(`
INSERT INTO seats (block_id, category_id, event_id, row_label, number, label, x, y)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			blockID, categoryID, eventID, s.RowLabel, s.Number, s.Label, s.X, s.Y)
	}
	if err := tx.SendBatch(ctx, batch).Close(); err != nil {
		return 0, err
	}
	return len(seats), nil
}
