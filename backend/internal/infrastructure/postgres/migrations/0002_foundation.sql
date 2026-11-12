-- Fondasi versi 2: penyelenggara, akun organizer, dan akun pembeli.
-- Pembeli sengaja punya tabel sendiri, bukan role baru di users. Mereka daftar
-- sendiri dari internet, jadi kalau ada celah di sisi pembeli, akun internal
-- tidak ikut terbuka.

CREATE TABLE organizers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 100),
    contact_email text NOT NULL,
    contact_phone text NOT NULL DEFAULT '',
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Nama constraint ini bawaan Postgres dari CHECK inline di 0001.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('staff', 'admin', 'organizer'));
-- ON DELETE RESTRICT: organizer yang masih punya akun tidak boleh hilang diam-diam,
-- nonaktifkan saja lewat is_active.
ALTER TABLE users ADD COLUMN organizer_id uuid REFERENCES organizers (id) ON DELETE RESTRICT;
-- Akun organizer wajib terikat ke satu penyelenggara, dan role lain tidak boleh
-- punya organizer_id supaya cek akses "event sendiri" tidak salah tebak.
ALTER TABLE users ADD CONSTRAINT users_organizer_link
    CHECK ((role = 'organizer') = (organizer_id IS NOT NULL));
CREATE INDEX users_organizer_idx ON users (organizer_id);

-- Email disimpan huruf kecil oleh aplikasi; CHECK ini jaring pengaman supaya
-- index unik di bawah cukup index biasa, tanpa lower().
CREATE TABLE customers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text NOT NULL CHECK (email = lower(email)),
    password_hash text NOT NULL,
    name          text NOT NULL,
    phone         text NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_email_key ON customers (email);
