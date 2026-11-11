-- Gambar event: satu poster (dipakai kartu dan halaman detail) dan galeri.
-- Berkasnya ada di disk (UPLOAD_DIR), database cuma mencatat nama berkas dan
-- ukurannya supaya frontend bisa menyiapkan ruang sebelum gambar termuat.
CREATE TABLE event_images (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    kind         text NOT NULL CHECK (kind IN ('poster', 'gallery')),
    file_name    text NOT NULL UNIQUE CHECK (file_name ~ '^[a-z0-9-]+\.(jpg|png|webp)$'),
    content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
    width        integer NOT NULL CHECK (width > 0),
    height       integer NOT NULL CHECK (height > 0),
    size_bytes   integer NOT NULL CHECK (size_bytes > 0),
    alt          text NOT NULL DEFAULT '',
    sort_order   integer NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Poster cuma boleh satu per event; ganti poster = hapus yang lama lalu simpan yang baru.
CREATE UNIQUE INDEX event_images_one_poster ON event_images (event_id) WHERE kind = 'poster';
CREATE INDEX event_images_event_idx ON event_images (event_id, kind, sort_order);
