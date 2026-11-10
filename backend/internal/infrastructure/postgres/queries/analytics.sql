-- name: EventTicketCounts :one
SELECT count(*) FILTER (WHERE status <> 'cancelled')::int AS registered,
       count(*) FILTER (WHERE status = 'redeemed')::int AS redeemed,
       count(*) FILTER (WHERE status = 'booked')::int AS pending,
       count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
FROM tickets
WHERE event_id = sqlc.arg(event_id);

-- name: EventNoShowCount :one
SELECT count(*)::int AS no_show
FROM tickets t
JOIN events e ON e.id = t.event_id
WHERE t.event_id = sqlc.arg(event_id)
  AND t.status = 'booked'
  AND t.slot_start + e.slot_minutes <= sqlc.arg(now_minutes);

-- name: EventSlotStats :many
SELECT slot_start,
       count(*) FILTER (WHERE status <> 'cancelled')::int AS registered,
       count(*) FILTER (WHERE status = 'redeemed')::int AS redeemed
FROM tickets
WHERE event_id = sqlc.arg(event_id)
GROUP BY slot_start
ORDER BY slot_start;

-- name: EventsOverview :many
SELECT e.id, e.code_prefix, e.name, e.place, e.event_date, e.open_minutes,
       e.close_minutes, e.slot_minutes, e.slot_capacity, e.counter_count,
       e.service_seconds, e.waiting_count, e.status,
       count(t.id) FILTER (WHERE t.status <> 'cancelled')::int AS registered,
       count(t.id) FILTER (WHERE t.status = 'redeemed')::int AS redeemed
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
WHERE e.event_date = sqlc.arg(event_date)
GROUP BY e.id
ORDER BY e.open_minutes, e.name;
