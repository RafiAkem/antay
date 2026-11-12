-- Katalog versi 2: status tayang event, data jualan, kategori, dan paket.

-- 'open' di versi 1 artinya sudah bisa dipesan, padanannya sekarang 'published'.
-- Urutannya penting: CHECK lama dilepas dulu, baru datanya diubah.
ALTER TABLE events DROP CONSTRAINT events_status_check;
UPDATE events SET status = 'published' WHERE status = 'open';
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE events ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'review', 'published', 'closed', 'cancelled'));

-- organizer_id boleh kosong karena event versi 1 dibuat admin mal tanpa penyelenggara.
-- Persen biaya disimpan dalam basis poin (250 = 2,5%) supaya tetap integer.
ALTER TABLE events
    ADD COLUMN organizer_id     uuid REFERENCES organizers (id) ON DELETE RESTRICT,
    ADD COLUMN description      text NOT NULL DEFAULT '',
    ADD COLUMN poster_url       text NOT NULL DEFAULT '',
    ADD COLUMN sale_starts_at   timestamptz,
    ADD COLUMN sale_ends_at     timestamptz,
    ADD COLUMN fee_bearer       text NOT NULL DEFAULT 'customer'
        CHECK (fee_bearer IN ('customer', 'organizer')),
    ADD COLUMN fee_percent_bp   integer NOT NULL DEFAULT 0
        CHECK (fee_percent_bp BETWEEN 0 AND 10000),
    ADD COLUMN fee_flat         bigint NOT NULL DEFAULT 0 CHECK (fee_flat >= 0),
    ADD COLUMN rejection_reason text,
    ADD COLUMN submitted_at     timestamptz,
    ADD COLUMN published_at     timestamptz,
    ADD CONSTRAINT events_sale_window CHECK (
        sale_starts_at IS NULL OR sale_ends_at IS NULL OR sale_ends_at > sale_starts_at
    );
CREATE INDEX events_organizer_idx ON events (organizer_id);

-- Kategori berkursi kuotanya mengikuti jumlah kursi aktif di denah, jadi quota
-- kosong. Kategori tanpa kursi wajib punya quota, dihitung dalam orang.
CREATE TABLE ticket_categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    name        text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
    description text NOT NULL DEFAULT '',
    sort_order  integer NOT NULL DEFAULT 0,
    is_seated   boolean NOT NULL DEFAULT false,
    quota       integer CHECK (quota >= 0),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ticket_categories_quota_kind CHECK (is_seated = (quota IS NULL))
);
CREATE UNIQUE INDEX ticket_categories_event_name_key ON ticket_categories (event_id, lower(name));
CREATE INDEX ticket_categories_event_sort_idx ON ticket_categories (event_id, sort_order);

-- Harga melekat ke paket, bukan dihitung dari harga per orang: VIP A Couple
-- boleh lebih murah dari dua kali Single. quota paket opsional, dalam jumlah paket.
CREATE TABLE packages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES ticket_categories (id) ON DELETE CASCADE,
    name        text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
    pax         integer NOT NULL CHECK (pax BETWEEN 1 AND 10),
    price       bigint NOT NULL CHECK (price >= 0),
    quota       integer CHECK (quota >= 0),
    sort_order  integer NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX packages_category_name_key ON packages (category_id, lower(name));
CREATE INDEX packages_category_sort_idx ON packages (category_id, sort_order);
