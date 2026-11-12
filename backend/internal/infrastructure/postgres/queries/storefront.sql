-- Katalog publik versi 2: daftar event yang dijual, kategori, paket, dan sisa kursi.
-- Nama query diberi awalan Storefront supaya tidak bentrok dengan query lain di
-- paket store yang sama.

-- Penyaringan jendela jual sengaja tidak di sini, tapi di service, supaya jamnya
-- ikut clock yang bisa diganti saat tes.
-- name: ListStorefrontEvents :many
SELECT * FROM events
WHERE status = 'published' AND event_date >= sqlc.arg(from_date)::text
ORDER BY event_date, name;

-- name: GetStorefrontEvent :one
SELECT * FROM events WHERE id = sqlc.arg(id) AND status = 'published';

-- name: ListStorefrontCategories :many
SELECT * FROM ticket_categories
WHERE event_id = ANY(sqlc.arg(event_ids)::uuid[])
ORDER BY event_id, sort_order, name;

-- Paket nonaktif tidak pernah dikirim ke pembeli, jadi langsung disaring di sini.
-- name: ListStorefrontPackages :many
SELECT p.id, p.category_id, p.name, p.pax, p.price, p.quota, p.sort_order,
       p.is_active, p.created_at, p.updated_at
FROM packages p
JOIN ticket_categories c ON c.id = p.category_id
WHERE c.event_id = ANY(sqlc.arg(event_ids)::uuid[]) AND p.is_active
ORDER BY p.category_id, p.sort_order, p.price, p.name;

-- Kursi held dan sold tidak dihitung, disabled juga bukan kuota.
-- name: CountStorefrontAvailableSeats :many
SELECT category_id, count(*)::int AS available
FROM seats
WHERE event_id = ANY(sqlc.arg(event_ids)::uuid[]) AND status = 'available'
GROUP BY category_id;

-- name: ListStorefrontGallery :many
SELECT file_name, width, height, alt
FROM event_images
WHERE event_id = sqlc.arg(event_id) AND kind = 'gallery'
ORDER BY sort_order, created_at;
