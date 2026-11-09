-- name: ListOpenEvents :many
SELECT * FROM events
WHERE event_date = sqlc.arg(event_date) AND status = 'open'
ORDER BY open_minutes, name;

-- name: GetOpenEvent :one
SELECT * FROM events WHERE id = sqlc.arg(id) AND status = 'open';

-- name: LockEvent :one
SELECT id FROM events WHERE id = sqlc.arg(id) AND status = 'open' FOR UPDATE;

-- name: CountSlotBookings :one
SELECT count(*)::int AS booked FROM tickets
WHERE event_id = sqlc.arg(event_id)
  AND slot_start = sqlc.arg(slot_start)
  AND status <> 'cancelled';

-- name: CreateTicket :one
INSERT INTO tickets (code, event_id, visitor_name, slot_start)
VALUES (sqlc.arg(code), sqlc.arg(event_id), sqlc.arg(visitor_name), sqlc.arg(slot_start))
RETURNING *;

-- name: CancelTicket :execrows
UPDATE tickets
SET status = 'cancelled', updated_at = now()
WHERE code = sqlc.arg(code) AND status = 'booked';

-- name: GetTicketByCode :one
SELECT t.id, t.code, t.event_id, t.visitor_name, t.slot_start, t.status,
       t.redeemed_at, t.redeemed_by, t.redeemed_counter, t.created_at,
       e.name AS event_name, e.place AS event_place, e.item AS event_item,
       e.requirement AS event_requirement, e.open_minutes, e.close_minutes,
       e.slot_minutes, e.counter_count, e.service_seconds, e.waiting_count,
       e.event_date, e.status AS event_status
FROM tickets t
JOIN events e ON e.id = t.event_id
WHERE t.code = sqlc.arg(code);

-- name: EventSlotBookings :many
SELECT event_id, slot_start,
       count(*) FILTER (WHERE status = 'booked')::int AS booked,
       count(*) FILTER (WHERE status = 'redeemed')::int AS redeemed
FROM tickets
WHERE event_id = ANY(sqlc.arg(event_ids)::uuid[])
GROUP BY event_id, slot_start
ORDER BY event_id, slot_start;
