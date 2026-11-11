// Perintah seed mengisi database dengan akun demo, penyelenggara, dan event
// contoh beserta kategori, paket, tiket, dan fotonya. Aman dijalankan berulang:
// tiap bagian hanya menambah yang belum ada, jadi database demo yang sudah
// terisi sebagian tetap bisa dilengkapi tanpa dikosongkan dulu.
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/config"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "seed gagal:", err)
		os.Exit(1)
	}
}

func run() error {
	// Load juga membaca .env ke environment, jadi UPLOAD_DIR dan SEED_MEDIA_DIR
	// di .env ikut terbaca oleh seedMedia.
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

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	// Setelah Commit, Rollback hanya mengembalikan ErrTxClosed.
	defer func() { _ = tx.Rollback(ctx) }()

	acc, err := seedAccounts(ctx, tx)
	if err != nil {
		return err
	}
	now := time.Now().In(shared.Jakarta)
	ids, err := seedEvents(ctx, tx, acc, now)
	if err != nil {
		return err
	}
	tickets, err := seedTickets(ctx, tx, ids, acc.staffID, now)
	if err != nil {
		return fmt.Errorf("tiket contoh: %w", err)
	}
	images, err := seedMedia(ctx, tx, ids)
	if err != nil {
		return fmt.Errorf("foto event: %w", err)
	}
	seats, err := seedSeats(ctx, tx, ids)
	if err != nil {
		return fmt.Errorf("denah kursi: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	fmt.Printf("Ditambahkan sekarang: tiket=%d foto=%d kursi=%d\n", tickets, images, seats)
	return printCounts(ctx, pool)
}

func printCounts(ctx context.Context, pool *pgxpool.Pool) error {
	var users, organizers, customers, events, categories, packages, tickets, images int
	err := pool.QueryRow(ctx, `SELECT
		(SELECT count(*) FROM users),
		(SELECT count(*) FROM organizers),
		(SELECT count(*) FROM customers),
		(SELECT count(*) FROM events),
		(SELECT count(*) FROM ticket_categories),
		(SELECT count(*) FROM packages),
		(SELECT count(*) FROM tickets),
		(SELECT count(*) FROM event_images)`).
		Scan(&users, &organizers, &customers, &events, &categories, &packages, &tickets, &images)
	if err != nil {
		return err
	}
	fmt.Printf("Seed selesai. users=%d organizers=%d customers=%d events=%d kategori=%d paket=%d tiket=%d foto=%d\n",
		users, organizers, customers, events, categories, packages, tickets, images)
	fmt.Println("Akun demo: admin@antay.id/admin123, petugas@antay.id/petugas123, " +
		"organizer@antay.id/organizer123, pembeli@antay.id/pembeli123")
	return nil
}
