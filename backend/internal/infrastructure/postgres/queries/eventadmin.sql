-- Kelola event untuk organizer dan admin. Semua query yang menyentuh event
-- membawa filter organizer_id: admin mengirim NULL (semua event), organizer
-- mengirim id-nya sendiri. Event milik organizer lain jadi tidak ketemu (404),
-- bukan 403, supaya keberadaannya tidak bocor.

-- name: ManageListEvents :many
SELECT sqlc.embed(e), COALESCE(o.name, '')::text AS organizer_name
FROM events e
LEFT JOIN organizers o ON o.id = e.organizer_id
WHERE (sqlc.narg(status)::text IS NULL OR e.status = sqlc.narg(status))
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
ORDER BY e.event_date DESC, e.name;

-- name: ManageGetEvent :one
SELECT * FROM events e
WHERE e.id = sqlc.arg(id)
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id));

-- name: ManageOrganizerActive :one
SELECT is_active FROM organizers WHERE id = sqlc.arg(id);

-- name: ManageCreateEvent :one
INSERT INTO events (
    code_prefix, name, place, item, requirement, event_date,
    open_minutes, close_minutes, slot_minutes, slot_capacity,
    counter_count, service_seconds, status, created_by, organizer_id,
    description, sale_starts_at, sale_ends_at, fee_bearer, fee_percent_bp, fee_flat
) VALUES (
    sqlc.arg(code_prefix), sqlc.arg(name), sqlc.arg(place), sqlc.arg(item),
    sqlc.arg(requirement), sqlc.arg(event_date), sqlc.arg(open_minutes),
    sqlc.arg(close_minutes), sqlc.arg(slot_minutes), sqlc.arg(slot_capacity),
    sqlc.arg(counter_count), sqlc.arg(service_seconds), 'draft',
    sqlc.arg(created_by), sqlc.narg(owner_id), sqlc.arg(description),
    sqlc.narg(sale_starts_at), sqlc.narg(sale_ends_at), sqlc.arg(fee_bearer),
    sqlc.arg(fee_percent_bp), sqlc.arg(fee_flat)
) RETURNING *;

-- expected_status menjaga balapan: kalau admin baru saja mengubah status di
-- antara baca dan tulis, update ini tidak kena baris apa pun.
-- name: ManageUpdateEvent :one
UPDATE events e
SET code_prefix = sqlc.arg(code_prefix),
    name = sqlc.arg(name),
    place = sqlc.arg(place),
    item = sqlc.arg(item),
    requirement = sqlc.arg(requirement),
    event_date = sqlc.arg(event_date),
    open_minutes = sqlc.arg(open_minutes),
    close_minutes = sqlc.arg(close_minutes),
    slot_minutes = sqlc.arg(slot_minutes),
    slot_capacity = sqlc.arg(slot_capacity),
    counter_count = sqlc.arg(counter_count),
    service_seconds = sqlc.arg(service_seconds),
    description = sqlc.arg(description),
    sale_starts_at = sqlc.narg(sale_starts_at),
    sale_ends_at = sqlc.narg(sale_ends_at),
    fee_bearer = sqlc.arg(fee_bearer),
    fee_percent_bp = sqlc.arg(fee_percent_bp),
    fee_flat = sqlc.arg(fee_flat),
    updated_at = now()
WHERE e.id = sqlc.arg(id)
  AND e.status = sqlc.arg(expected_status)
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
RETURNING *;

-- name: ManageTransitionEvent :one
UPDATE events e
SET status = sqlc.arg(to_status),
    submitted_at = CASE WHEN sqlc.arg(stamp_submitted)::bool THEN now() ELSE e.submitted_at END,
    published_at = CASE WHEN sqlc.arg(stamp_published)::bool THEN now() ELSE e.published_at END,
    rejection_reason = sqlc.narg(rejection_reason),
    updated_at = now()
WHERE e.id = sqlc.arg(id)
  AND e.status = sqlc.arg(from_status)
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
RETURNING *;

-- Hapus event dijalankan dalam transaksi: kunci dulu barisnya, lalu kursi dan
-- blok dihapus manual. FK kategori di seats dan seat_blocks itu RESTRICT, jadi
-- mengandalkan cascade dari events bisa gagal tergantung urutan trigger.
-- name: ManageLockDraftEvent :one
SELECT e.id FROM events e
WHERE e.id = sqlc.arg(id)
  AND e.status = 'draft'
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
FOR UPDATE;

-- name: ManageDeleteEventSeats :exec
DELETE FROM seats WHERE event_id = sqlc.arg(event_id);

-- name: ManageDeleteEventBlocks :exec
DELETE FROM seat_blocks WHERE event_id = sqlc.arg(event_id);

-- name: ManageDeleteEvent :execrows
DELETE FROM events e
WHERE e.id = sqlc.arg(id)
  AND e.status = 'draft'
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id));

-- seat_count hanya menghitung kursi yang bisa dijual; kursi disabled itu lorong
-- atau tiang di denah.
-- name: ManageListCategories :many
SELECT sqlc.embed(c),
       (SELECT count(*) FROM seats s WHERE s.category_id = c.id AND s.status <> 'disabled')::int AS seat_count
FROM ticket_categories c
JOIN events e ON e.id = c.event_id
WHERE c.event_id = sqlc.arg(event_id)
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
ORDER BY c.sort_order, c.name;

-- name: ManageListEventPackages :many
SELECT p.* FROM packages p
JOIN ticket_categories c ON c.id = p.category_id
JOIN events e ON e.id = c.event_id
WHERE c.event_id = sqlc.arg(event_id)
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
ORDER BY p.sort_order, p.name;

-- name: ManageGetCategory :one
SELECT sqlc.embed(c), e.status AS event_status,
       (SELECT count(*) FROM seats s WHERE s.category_id = c.id AND s.status <> 'disabled')::int AS seat_count,
       (SELECT count(*) FROM seat_blocks b WHERE b.category_id = c.id)::int AS block_count
FROM ticket_categories c
JOIN events e ON e.id = c.event_id
WHERE c.id = sqlc.arg(id)
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id));

-- Insert lewat SELECT supaya event milik organizer lain atau yang sudah tidak
-- bisa diubah menghasilkan nol baris, bukan kategori yatim. Cast-nya wajib:
-- di INSERT ... SELECT parameter tanpa tipe dibaca Postgres sebagai text.
-- name: ManageCreateCategory :one
INSERT INTO ticket_categories (event_id, name, description, sort_order, is_seated, quota)
SELECT e.id, sqlc.arg(name)::text, sqlc.arg(description)::text, sqlc.arg(sort_order)::int,
       sqlc.arg(is_seated)::boolean, sqlc.narg(quota)::int
FROM events e
WHERE e.id = sqlc.arg(event_id)
  AND e.status IN ('draft', 'published')
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
RETURNING *;

-- name: ManageUpdateCategory :one
UPDATE ticket_categories c
SET name = sqlc.arg(name),
    description = sqlc.arg(description),
    sort_order = sqlc.arg(sort_order),
    is_seated = sqlc.arg(is_seated),
    quota = sqlc.narg(quota),
    updated_at = now()
FROM events e
WHERE c.id = sqlc.arg(id)
  AND e.id = c.event_id
  AND e.status IN ('draft', 'published')
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
RETURNING c.*;

-- name: ManageDeleteCategory :execrows
DELETE FROM ticket_categories c
USING events e
WHERE c.id = sqlc.arg(id)
  AND e.id = c.event_id
  AND e.status IN ('draft', 'published')
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id));

-- name: ManageListPackages :many
SELECT p.* FROM packages p
JOIN ticket_categories c ON c.id = p.category_id
JOIN events e ON e.id = c.event_id
WHERE p.category_id = sqlc.arg(category_id)
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
ORDER BY p.sort_order, p.name;

-- name: ManageGetPackage :one
SELECT sqlc.embed(p), e.status AS event_status
FROM packages p
JOIN ticket_categories c ON c.id = p.category_id
JOIN events e ON e.id = c.event_id
WHERE p.id = sqlc.arg(id)
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id));

-- name: ManageCreatePackage :one
INSERT INTO packages (category_id, name, pax, price, quota, sort_order, is_active)
SELECT c.id, sqlc.arg(name)::text, sqlc.arg(pax)::int, sqlc.arg(price)::bigint, sqlc.narg(quota)::int,
       sqlc.arg(sort_order)::int, sqlc.arg(is_active)::boolean
FROM ticket_categories c
JOIN events e ON e.id = c.event_id
WHERE c.id = sqlc.arg(category_id)
  AND e.status IN ('draft', 'published')
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
RETURNING *;

-- name: ManageUpdatePackage :one
UPDATE packages p
SET name = sqlc.arg(name),
    pax = sqlc.arg(pax),
    price = sqlc.arg(price),
    quota = sqlc.narg(quota),
    sort_order = sqlc.arg(sort_order),
    is_active = sqlc.arg(is_active),
    updated_at = now()
FROM ticket_categories c, events e
WHERE p.id = sqlc.arg(id)
  AND c.id = p.category_id
  AND e.id = c.event_id
  AND e.status IN ('draft', 'published')
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id))
RETURNING p.*;

-- name: ManageDeletePackage :execrows
DELETE FROM packages p
USING ticket_categories c, events e
WHERE p.id = sqlc.arg(id)
  AND c.id = p.category_id
  AND e.id = c.event_id
  AND e.status IN ('draft', 'published')
  AND (sqlc.narg(organizer_id)::uuid IS NULL OR e.organizer_id = sqlc.narg(organizer_id));
