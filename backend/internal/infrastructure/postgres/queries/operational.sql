-- name: ListEventsForStaff :many
SELECT * FROM events
WHERE event_date = sqlc.arg(event_date)
ORDER BY open_minutes, name;

-- name: GetEvent :one
SELECT * FROM events WHERE id = sqlc.arg(id);

-- name: ListWaitingTickets :many
SELECT * FROM tickets
WHERE event_id = sqlc.arg(event_id)
  AND slot_start = ANY(sqlc.arg(slot_starts)::int[])
  AND status = 'booked'
ORDER BY created_at;

-- name: UpdateEventQueue :one
UPDATE events
SET waiting_count = COALESCE(sqlc.narg(waiting_count), waiting_count),
    counter_count = COALESCE(sqlc.narg(counter_count), counter_count),
    updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: RedeemTicket :one
UPDATE tickets
SET status = 'redeemed',
    redeemed_at = now(),
    redeemed_by = sqlc.arg(redeemed_by),
    redeemed_counter = sqlc.arg(redeemed_counter),
    updated_at = now()
WHERE code = sqlc.arg(code)
  AND event_id = sqlc.arg(event_id)
  AND status = 'booked'
RETURNING *;

-- name: CreateEvent :one
INSERT INTO events (
    code_prefix, name, place, item, requirement, event_date,
    open_minutes, close_minutes, slot_minutes, slot_capacity,
    counter_count, service_seconds, status, created_by
) VALUES (
    sqlc.arg(code_prefix), sqlc.arg(name), sqlc.arg(place), sqlc.arg(item),
    sqlc.arg(requirement), sqlc.arg(event_date), sqlc.arg(open_minutes),
    sqlc.arg(close_minutes), sqlc.arg(slot_minutes), sqlc.arg(slot_capacity),
    sqlc.arg(counter_count), sqlc.arg(service_seconds), sqlc.arg(status),
    sqlc.arg(created_by)
) RETURNING *;
