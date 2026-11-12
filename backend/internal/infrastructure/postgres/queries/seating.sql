-- Denah kursi: layout kanvas, blok, dan kursi hasil generator.

-- name: SeatingEventRef :one
SELECT id, organizer_id, status FROM events WHERE id = $1;

-- name: SeatingCategory :one
SELECT id, event_id, name, is_seated FROM ticket_categories WHERE id = $1;

-- name: GetVenueLayout :one
SELECT * FROM venue_layouts WHERE event_id = $1;

-- name: UpsertVenueLayout :one
INSERT INTO venue_layouts (
    event_id, canvas_width, canvas_height, stage_x, stage_y, stage_width, stage_height, stage_label
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (event_id) DO UPDATE SET
    canvas_width  = EXCLUDED.canvas_width,
    canvas_height = EXCLUDED.canvas_height,
    stage_x       = EXCLUDED.stage_x,
    stage_y       = EXCLUDED.stage_y,
    stage_width   = EXCLUDED.stage_width,
    stage_height  = EXCLUDED.stage_height,
    stage_label   = EXCLUDED.stage_label,
    updated_at    = now()
RETURNING *;

-- name: ListSeatBlocks :many
SELECT b.*, c.name AS category_name,
       (SELECT count(*) FROM seats s WHERE s.block_id = b.id)::int AS seat_count
FROM seat_blocks b
JOIN ticket_categories c ON c.id = b.category_id
WHERE b.event_id = $1
ORDER BY b.sort_order, b.code;

-- name: GetSeatBlock :one
SELECT b.*, c.name AS category_name,
       (SELECT count(*) FROM seats s WHERE s.block_id = b.id)::int AS seat_count
FROM seat_blocks b
JOIN ticket_categories c ON c.id = b.category_id
WHERE b.id = $1;

-- name: LockSeatBlock :one
SELECT id FROM seat_blocks WHERE id = $1 FOR UPDATE;

-- name: LockBlockSeats :many
SELECT * FROM seats WHERE block_id = $1 ORDER BY id FOR UPDATE;

-- name: InsertSeatBlock :one
INSERT INTO seat_blocks (
    event_id, category_id, code, name, x, y, rotation, row_count, seats_per_row,
    curve, seat_spacing, row_spacing, first_row_label, numbering, aisle_after, sort_order
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
RETURNING id;

-- name: UpdateSeatBlock :exec
UPDATE seat_blocks SET
    category_id = $2, code = $3, name = $4, x = $5, y = $6, rotation = $7,
    row_count = $8, seats_per_row = $9, curve = $10, seat_spacing = $11,
    row_spacing = $12, first_row_label = $13, numbering = $14, aisle_after = $15,
    sort_order = $16, updated_at = now()
WHERE id = $1;

-- name: UpdateSeatBlockInfo :execrows
UPDATE seat_blocks SET name = $2, sort_order = $3, updated_at = now() WHERE id = $1;

-- name: DeleteBlockSeats :exec
DELETE FROM seats WHERE block_id = $1;

-- name: DeleteSeatBlock :exec
DELETE FROM seat_blocks WHERE id = $1;

-- Satu statement untuk ribuan kursi: array sejajar dibuka dengan unnest,
-- jauh lebih cepat daripada insert satu per satu dan tanpa perlu COPY.
-- Beberapa unnest di daftar SELECT berjalan sejajar selama panjang arraynya
-- sama (Postgres 10 ke atas); bentuk unnest(a, b, ...) di FROM tidak dikenali sqlc.
-- name: InsertSeats :exec
INSERT INTO seats (block_id, category_id, event_id, row_label, number, label, x, y, status)
SELECT @block_id::uuid, @category_id::uuid, @event_id::uuid,
       unnest(@row_labels::text[]), unnest(@numbers::int[]), unnest(@labels::text[]),
       unnest(@xs::int[]), unnest(@ys::int[]), unnest(@statuses::text[]);

-- name: ListEventSeats :many
SELECT * FROM seats
WHERE event_id = $1
ORDER BY block_id, length(row_label), row_label, number;

-- name: LockSeatsByLabel :many
SELECT * FROM seats
WHERE event_id = @event_id AND label = ANY(@labels::text[])
ORDER BY id
FOR UPDATE;

-- Status held dan sold tidak boleh ditimpa dari editor; syarat di WHERE ini
-- jaring pengaman kalau service lupa mengecek.
-- name: SetSeatStatus :many
UPDATE seats SET status = @status, updated_at = now()
WHERE id = ANY(@ids::uuid[]) AND status IN ('available', 'disabled')
RETURNING *;
