// Perintah seed mengisi database dengan satu hari acara contoh. Aman dijalankan
// berulang: kalau sudah ada user, program berhenti tanpa menambah baris.
package main

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/RafiAkem/antay/backend/internal/infrastructure/config"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "seed gagal:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg := config.Load()
	ctx := context.Background()

	pool, err := postgres.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		return err
	}
	if err := postgres.Migrate(ctx, pool); err != nil {
		return err
	}

	var users int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&users); err != nil {
		return err
	}
	if users > 0 {
		fmt.Println("Data seed sudah ada (tabel users tidak kosong). Tidak ada yang ditambahkan.")
		return nil
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // setelah Commit ini hanya mengembalikan ErrTxClosed

	adminID, err := insertUser(ctx, tx, "admin@antay.id", adminHash, "Admin Summarecon", "admin")
	if err != nil {
		return err
	}
	staffID, err := insertUser(ctx, tx, "petugas@antay.id", staffHash, "Petugas Loket", "staff")
	if err != nil {
		return err
	}

	// Seed acak tetap: urutan tiket dan pengisian slot selalu sama di mesin mana pun.
	rng := rand.New(rand.NewSource(2026))
	date := time.Now().Format("2006-01-02")
	now := time.Now()
	seen := map[string]bool{}

	for _, spec := range eventSeeds {
		eventID, err := insertEvent(ctx, tx, spec, date, adminID)
		if err != nil {
			return err
		}
		if err := insertTickets(ctx, tx, rng, spec, eventID, staffID, now, seen); err != nil {
			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	return printCounts(ctx, pool)
}

func insertUser(ctx context.Context, tx pgx.Tx, email, hash, name, role string) (uuid.UUID, error) {
	var id uuid.UUID
	err := tx.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
		email, hash, name, role,
	).Scan(&id)
	return id, err
}

func insertEvent(ctx context.Context, tx pgx.Tx, spec eventSeed, date string, createdBy uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := tx.QueryRow(ctx, `
INSERT INTO events (code_prefix, name, place, item, requirement, event_date,
    open_minutes, close_minutes, slot_minutes, slot_capacity, counter_count,
    service_seconds, waiting_count, status, created_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'open',$14)
RETURNING id`,
		spec.prefix, spec.name, spec.place, spec.item, spec.requirement, date,
		spec.open, spec.close, spec.slotMinutes, spec.capacity, spec.counters,
		spec.serviceSeconds, spec.wait, createdBy,
	).Scan(&id)
	return id, err
}

func insertTickets(ctx context.Context, tx pgx.Tx, rng *rand.Rand, spec eventSeed,
	eventID, staffID uuid.UUID, now time.Time, seen map[string]bool) error {
	for start := spec.open; start+spec.slotMinutes <= spec.close; start += spec.slotMinutes {
		// Tiap slot terisi 40-90% supaya angka dasbor tidak terlihat kosong.
		count := int32(float64(spec.capacity) * (0.4 + 0.5*rng.Float64()))
		if count < 1 {
			count = 1
		}
		for i := int32(0); i < count; i++ {
			var (
				status   = "booked"
				redeemed *time.Time
				by       *uuid.UUID
				counter  *int32
			)
			if rng.Float64() < 0.45 {
				status = "redeemed"
				at := now.Add(-time.Duration(rng.Intn(180)) * time.Minute)
				n := int32(1 + rng.Intn(int(spec.counters)))
				redeemed, by, counter = &at, &staffID, &n
			}
			if _, err := tx.Exec(ctx, `
INSERT INTO tickets (code, event_id, visitor_name, slot_start, status,
    redeemed_at, redeemed_by, redeemed_counter)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				newCode(rng, spec.prefix, seen), eventID,
				visitorNames[rng.Intn(len(visitorNames))], start,
				status, redeemed, by, counter,
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func newCode(rng *rand.Rand, prefix string, seen map[string]bool) string {
	for {
		buf := make([]byte, 4)
		for i := range buf {
			buf[i] = ticketAlphabet[rng.Intn(len(ticketAlphabet))]
		}
		code := prefix + "-" + string(buf)
		if !seen[code] {
			seen[code] = true
			return code
		}
	}
}

func printCounts(ctx context.Context, pool *pgxpool.Pool) error {
	var users, events, tickets int
	err := pool.QueryRow(ctx, `SELECT
		(SELECT count(*) FROM users),
		(SELECT count(*) FROM events),
		(SELECT count(*) FROM tickets)`).Scan(&users, &events, &tickets)
	if err != nil {
		return err
	}
	fmt.Printf("Seed selesai. users=%d events=%d tickets=%d\n", users, events, tickets)
	return nil
}
