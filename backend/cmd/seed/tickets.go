package main

import (
	"context"
	"hash/fnv"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// seedTickets mengisi tiket versi 1 hanya untuk event yang belum punya tiket
// sama sekali, jadi seed ulang di hari yang sama tidak menambah antrean.
func seedTickets(ctx context.Context, tx pgx.Tx, ids map[string]uuid.UUID, staffID uuid.UUID, now time.Time) (int, error) {
	// Seed acak dari tanggal event demo, bukan tanggal seed dijalankan: event
	// Senin yang di-seed hari Kamis tidak boleh menghasilkan kode yang sama
	// persis dengan event Kamis yang di-seed di hari yang sama.
	day := fnv.New64a()
	_, _ = day.Write([]byte(demoDate(now)))
	rng := rand.New(rand.NewSource(int64(day.Sum64() >> 1)))

	total := 0
	for _, spec := range eventSeeds {
		if !spec.sampleTickets {
			continue
		}
		eventID := ids[spec.key]
		var existing int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM tickets WHERE event_id = $1`, eventID).Scan(&existing); err != nil {
			return total, err
		}
		if existing > 0 {
			continue
		}
		n, err := insertTickets(ctx, tx, rng, spec, eventID, staffID, now)
		if err != nil {
			return total, err
		}
		total += n
	}
	return total, nil
}

func insertTickets(ctx context.Context, tx pgx.Tx, rng *rand.Rand, spec eventSeed,
	eventID, staffID uuid.UUID, now time.Time) (int, error) {
	// Event demo bisa bertanggal di depan (hari presentasi). Sebelum harinya,
	// belum ada slot yang mulai, jadi belum boleh ada tiket yang sudah ditukar.
	day, err := time.ParseInLocation("2006-01-02", eventDateOf(spec, now), now.Location())
	if err != nil {
		return 0, err
	}
	inserted := 0
	for start := spec.open; start+spec.slotMinutes <= spec.close; start += spec.slotMinutes {
		// Tiap slot terisi 40-90% supaya angka dasbor tidak terlihat kosong, tapi
		// tidak pernah penuh supaya demo selalu punya slot yang bisa dipesan.
		count := max(int32(float64(spec.capacity)*(0.4+0.5*rng.Float64())), 1)
		slotAt := day.Add(time.Duration(start) * time.Minute)
		started := !slotAt.After(now)
		for i := int32(0); i < count; i++ {
			var (
				status   = "booked"
				redeemed *time.Time
				by       *uuid.UUID
				counter  *int32
			)
			// Tiket baru bisa sudah ditukar kalau slotnya sudah mulai.
			if started && rng.Float64() < 0.45 {
				status = "redeemed"
				at := slotAt.Add(time.Duration(rng.Intn(int(spec.slotMinutes))) * time.Minute)
				if at.After(now) {
					at = now
				}
				n := int32(1 + rng.Intn(int(spec.counters)))
				redeemed, by, counter = &at, &staffID, &n
			}
			tag, err := tx.Exec(ctx, `
INSERT INTO tickets (code, event_id, visitor_name, slot_start, status,
    redeemed_at, redeemed_by, redeemed_counter)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
ON CONFLICT (code) DO NOTHING`,
				newCode(rng, spec.prefix), eventID,
				visitorNames[rng.Intn(len(visitorNames))], start,
				status, redeemed, by, counter,
			)
			if err != nil {
				return inserted, err
			}
			inserted += int(tag.RowsAffected())
		}
	}
	return inserted, nil
}

// newCode tidak perlu memastikan unik sendiri: ON CONFLICT melewati kode yang
// kebetulan sudah dipakai, jadi satu slot paling kurang satu tiket saja.
func newCode(rng *rand.Rand, prefix string) string {
	buf := make([]byte, 4)
	for i := range buf {
		buf[i] = ticketAlphabet[rng.Intn(len(ticketAlphabet))]
	}
	return prefix + "-" + string(buf)
}
