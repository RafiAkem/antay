-- Akun pembeli. Email selalu disimpan huruf kecil oleh aplikasi (ada CHECK juga),
-- jadi pencarian cukup pakai = tanpa lower().

-- name: RegisterCustomer :one
INSERT INTO customers (email, password_hash, name, phone)
VALUES (sqlc.arg(email), sqlc.arg(password_hash), sqlc.arg(name), sqlc.arg(phone))
RETURNING *;

-- Akun nonaktif sengaja tidak ketemu, supaya login-nya gagal persis seperti email asing.
-- name: FindCustomerForLogin :one
SELECT * FROM customers WHERE email = sqlc.arg(email) AND is_active;

-- name: FindActiveCustomer :one
SELECT * FROM customers WHERE id = sqlc.arg(id) AND is_active;

-- name: UpdateCustomerProfile :one
UPDATE customers
SET name = COALESCE(sqlc.narg(name)::text, name),
    phone = COALESCE(sqlc.narg(phone)::text, phone),
    updated_at = now()
WHERE id = sqlc.arg(id) AND is_active
RETURNING *;
