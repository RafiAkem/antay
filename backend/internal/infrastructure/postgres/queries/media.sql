-- name: GetMediaEvent :one
SELECT id, organizer_id, status FROM events WHERE id = $1;

-- Kunci baris event supaya dua unggahan galeri bersamaan dihitung bergiliran.
-- name: LockMediaEvent :one
SELECT id FROM events WHERE id = $1 FOR UPDATE;

-- Poster selalu di depan, lalu galeri sesuai urutan yang diatur penyelenggara.
-- name: ListEventImages :many
SELECT * FROM event_images
WHERE event_id = $1
ORDER BY (kind = 'poster') DESC, sort_order, created_at, id;

-- name: GetEventImage :one
SELECT * FROM event_images WHERE id = $1;

-- name: GalleryStats :one
SELECT count(*)::int AS total,
       COALESCE(max(sort_order) + 1, 0)::int AS next_order
FROM event_images
WHERE event_id = $1 AND kind = 'gallery';

-- name: DeleteEventPoster :many
DELETE FROM event_images WHERE event_id = $1 AND kind = 'poster' RETURNING *;

-- name: InsertEventImage :one
INSERT INTO event_images (event_id, kind, file_name, content_type, width, height, size_bytes, alt, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: SetEventPosterURL :exec
UPDATE events SET poster_url = $2, updated_at = now() WHERE id = $1;

-- Hanya dikosongkan bila masih menunjuk ke poster yang dihapus, supaya URL
-- poster yang diisi lewat jalur lain tidak ikut hilang.
-- name: ClearEventPosterURL :exec
UPDATE events SET poster_url = '', updated_at = now()
WHERE id = $1 AND poster_url = sqlc.arg(current_url)::text;

-- name: DeleteEventImage :one
DELETE FROM event_images WHERE id = $1 RETURNING *;

-- name: UpdateEventImageAlt :one
UPDATE event_images SET alt = $2 WHERE id = $1 RETURNING *;

-- name: ListGalleryIDs :many
SELECT id FROM event_images WHERE event_id = $1 AND kind = 'gallery';

-- name: SetGallerySortOrder :exec
UPDATE event_images SET sort_order = $3
WHERE id = $1 AND event_id = $2 AND kind = 'gallery';
