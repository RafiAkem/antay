-- Kelola penyelenggara dan akun internal dari panel admin. Nama query diberi
-- awalan Admin supaya tidak bentrok dengan query baca di modul lain.

-- name: AdminListOrganizers :many
SELECT * FROM organizers ORDER BY lower(name), id;

-- name: AdminGetOrganizer :one
SELECT * FROM organizers WHERE id = sqlc.arg(id);

-- name: AdminCreateOrganizer :one
INSERT INTO organizers (name, contact_email, contact_phone)
VALUES (sqlc.arg(name), sqlc.arg(contact_email), sqlc.arg(contact_phone))
RETURNING *;

-- name: AdminUpdateOrganizer :one
UPDATE organizers
SET name = COALESCE(sqlc.narg(name)::text, name),
    contact_email = COALESCE(sqlc.narg(contact_email)::text, contact_email),
    contact_phone = COALESCE(sqlc.narg(contact_phone)::text, contact_phone),
    is_active = COALESCE(sqlc.narg(is_active)::boolean, is_active),
    updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: AdminListUsers :many
SELECT * FROM users ORDER BY created_at, id;

-- name: AdminCreateUser :one
INSERT INTO users (email, password_hash, name, role, organizer_id)
VALUES (sqlc.arg(email), sqlc.arg(password_hash), sqlc.arg(name), sqlc.arg(role), sqlc.narg(organizer_id))
RETURNING *;

-- name: AdminUpdateUser :one
UPDATE users
SET name = COALESCE(sqlc.narg(name)::text, name),
    is_active = COALESCE(sqlc.narg(is_active)::boolean, is_active),
    password_hash = COALESCE(sqlc.narg(password_hash)::text, password_hash),
    updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING *;
