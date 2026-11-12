-- Denah kursi berbasis blok. Penyelenggara menaruh beberapa blok di kanvas
-- mengelilingi panggung; tiap blok milik satu kategori bertempat duduk.
-- Posisi tiap kursi dihitung server dari parameter blok lalu disimpan, jadi
-- pembeli dan penyelenggara selalu melihat denah yang sama persis.

CREATE TABLE venue_layouts (
    event_id      uuid PRIMARY KEY REFERENCES events (id) ON DELETE CASCADE,
    canvas_width  integer NOT NULL DEFAULT 1000 CHECK (canvas_width BETWEEN 200 AND 5000),
    canvas_height integer NOT NULL DEFAULT 700 CHECK (canvas_height BETWEEN 200 AND 5000),
    stage_x       integer NOT NULL DEFAULT 350,
    stage_y       integer NOT NULL DEFAULT 20,
    stage_width   integer NOT NULL DEFAULT 300 CHECK (stage_width > 0),
    stage_height  integer NOT NULL DEFAULT 60 CHECK (stage_height > 0),
    stage_label   text NOT NULL DEFAULT 'Panggung' CHECK (length(btrim(stage_label)) BETWEEN 1 AND 40),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE seat_blocks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    category_id     uuid NOT NULL REFERENCES ticket_categories (id) ON DELETE RESTRICT,
    -- kode pendek dipakai di label kursi, misal blok "L" baris C nomor 12 = "L-C12"
    code            text NOT NULL CHECK (code ~ '^[A-Z0-9]{1,3}$'),
    name            text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
    x               integer NOT NULL,
    y               integer NOT NULL,
    rotation        integer NOT NULL DEFAULT 0 CHECK (rotation BETWEEN -180 AND 180),
    row_count       integer NOT NULL CHECK (row_count BETWEEN 1 AND 50),
    seats_per_row   integer NOT NULL CHECK (seats_per_row BETWEEN 1 AND 80),
    -- 0 = lurus, 100 = paling melengkung menghadap panggung
    curve           integer NOT NULL DEFAULT 0 CHECK (curve BETWEEN 0 AND 100),
    seat_spacing    integer NOT NULL DEFAULT 28 CHECK (seat_spacing BETWEEN 16 AND 80),
    row_spacing     integer NOT NULL DEFAULT 32 CHECK (row_spacing BETWEEN 16 AND 80),
    first_row_label text NOT NULL DEFAULT 'A' CHECK (first_row_label ~ '^[A-Z]$'),
    numbering       text NOT NULL DEFAULT 'ltr' CHECK (numbering IN ('ltr', 'rtl')),
    -- nomor kursi yang diikuti lorong, misal {5,10} = celah setelah kursi 5 dan 10
    aisle_after     integer[] NOT NULL DEFAULT '{}',
    sort_order      integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX seat_blocks_event_code_key ON seat_blocks (event_id, code);
CREATE INDEX seat_blocks_category_idx ON seat_blocks (category_id);

CREATE TABLE seats (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id         uuid NOT NULL REFERENCES seat_blocks (id) ON DELETE CASCADE,
    category_id      uuid NOT NULL REFERENCES ticket_categories (id) ON DELETE RESTRICT,
    event_id         uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    row_label        text NOT NULL CHECK (row_label ~ '^[A-Z]{1,2}$'),
    number           integer NOT NULL CHECK (number > 0),
    label            text NOT NULL,
    -- posisi akhir di kanvas setelah blok diputar dan dilengkungkan
    x                integer NOT NULL,
    y                integer NOT NULL,
    status           text NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available', 'held', 'sold', 'disabled')),
    -- FK ke orders ditambahkan saat tabel orders dibuat di fase pembayaran
    held_by_order_id uuid,
    held_until       timestamptz,
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT seats_hold_consistent
        CHECK ((status = 'held') = (held_by_order_id IS NOT NULL AND held_until IS NOT NULL))
);

CREATE UNIQUE INDEX seats_block_row_number_key ON seats (block_id, row_label, number);
CREATE UNIQUE INDEX seats_event_label_key ON seats (event_id, label);
CREATE INDEX seats_category_status_idx ON seats (category_id, status);
CREATE INDEX seats_event_idx ON seats (event_id);
