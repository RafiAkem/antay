-- name: GetUserByEmail :one
SELECT * FROM users WHERE lower(email) = lower(sqlc.arg(email)) AND is_active;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = sqlc.arg(id) AND is_active;
