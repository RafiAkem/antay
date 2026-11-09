-- Skema awal Antay. Semua primary key UUID, dibangkitkan database.
-- Waktu slot disimpan sebagai menit sejak tengah malam (integer), bukan tipe time:
-- acara berlangsung satu hari di satu zona waktu, dan aritmetika slot jadi bebas
-- masalah zona waktu. API tetap mengirim "10:30", konversinya di handler.

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text NOT NULL,
    password_hash text NOT NULL,
    name          text NOT NULL,
    role          text NOT NULL CHECK (role IN ('staff', 'admin')),
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code_prefix     text NOT NULL CHECK (code_prefix ~ '^[A-Z]{2}$'),
    name            text NOT NULL,
    place           text NOT NULL,
    item            text NOT NULL,
    requirement     text NOT NULL,
    event_date      text NOT NULL CHECK (event_date ~ '^\d{4}-\d{2}-\d{2}$'),
    open_minutes    integer NOT NULL CHECK (open_minutes BETWEEN 0 AND 1439),
    close_minutes   integer NOT NULL CHECK (close_minutes BETWEEN 0 AND 1439),
    slot_minutes    integer NOT NULL CHECK (slot_minutes BETWEEN 10 AND 120),
    slot_capacity   integer NOT NULL CHECK (slot_capacity BETWEEN 1 AND 500),
    counter_count   integer NOT NULL CHECK (counter_count BETWEEN 1 AND 20),
    service_seconds integer NOT NULL CHECK (service_seconds BETWEEN 30 AND 600),
    waiting_count   integer NOT NULL DEFAULT 0 CHECK (waiting_count >= 0),
    status          text NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
    created_by      uuid REFERENCES users (id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT events_time_order CHECK (close_minutes > open_minutes),
    CONSTRAINT events_slot_fits CHECK (close_minutes - open_minutes >= slot_minutes)
);
CREATE UNIQUE INDEX events_prefix_date_key ON events (code_prefix, event_date);
CREATE INDEX events_date_status_idx ON events (event_date, status);

CREATE TABLE tickets (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code             text NOT NULL UNIQUE,
    event_id         uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    visitor_name     text NOT NULL,
    slot_start       integer NOT NULL CHECK (slot_start BETWEEN 0 AND 1439),
    status           text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'redeemed', 'cancelled')),
    redeemed_at      timestamptz,
    redeemed_by      uuid REFERENCES users (id) ON DELETE SET NULL,
    redeemed_counter integer,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tickets_redeemed_fields CHECK (
        (status = 'redeemed' AND redeemed_at IS NOT NULL AND redeemed_counter IS NOT NULL)
        OR (status <> 'redeemed' AND redeemed_at IS NULL)
    )
);
CREATE INDEX tickets_event_slot_idx ON tickets (event_id, slot_start, status);
CREATE INDEX tickets_event_status_idx ON tickets (event_id, status);
