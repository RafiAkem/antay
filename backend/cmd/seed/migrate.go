package main

import (
	"context"
	"fmt"
	"io/fs"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres"
)

// migrate menjalankan skema lewat postgres.Migrate, dengan satu pengecualian: pada
// database kosong postgres.Migrate membuat tabel schema_migrations lebih dulu,
// sementara 0001_init.sql juga membuatnya di dalam transaksi yang sama. Akibatnya
// migrasi bawaan selalu gagal di database baru. Berkas migrasi dijalankan
// langsung di sini, lalu postgres.Migrate dipanggil untuk memastikan semuanya tercatat.
func migrate(ctx context.Context, pool *pgxpool.Pool) error {
	var ready bool
	if err := pool.QueryRow(ctx, `SELECT to_regclass('public.users') IS NOT NULL`).Scan(&ready); err != nil {
		return err
	}
	if ready {
		return postgres.Migrate(ctx, pool)
	}

	// Sisa percobaan Migrate yang gagal bisa meninggalkan tabel riwayat kosong.
	var hasHistory bool
	if err := pool.QueryRow(ctx, `SELECT to_regclass('public.schema_migrations') IS NOT NULL`).Scan(&hasHistory); err != nil {
		return err
	}
	if hasHistory {
		var count int
		if err := pool.QueryRow(ctx, `SELECT count(*) FROM schema_migrations`).Scan(&count); err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("database berisi riwayat migrasi tapi tabel users tidak ada; periksa manual")
		}
		if _, err := pool.Exec(ctx, `DROP TABLE schema_migrations`); err != nil {
			return err
		}
	}

	migrations := postgres.Migrations()
	entries, err := fs.ReadDir(migrations, ".")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		body, err := fs.ReadFile(migrations, name)
		if err != nil {
			return err
		}
		if _, err := pool.Exec(ctx, string(body)); err != nil {
			return fmt.Errorf("migrasi %s: %w", name, err)
		}
		if _, err := pool.Exec(ctx,
			`INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`, name); err != nil {
			return err
		}
	}
	return postgres.Migrate(ctx, pool)
}
