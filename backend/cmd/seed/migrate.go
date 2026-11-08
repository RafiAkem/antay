package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"

	"github.com/RafiAkem/antay/backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// migrate menjalankan skema lewat db.Migrate, dengan satu pengecualian: pada
// database kosong db.Migrate membuat tabel schema_migrations lebih dulu,
// sementara 0001_init.sql juga membuatnya di dalam transaksi yang sama. Akibatnya
// migrasi bawaan selalu gagal di database baru. Berkas migrasi dijalankan
// langsung di sini, lalu db.Migrate dipanggil untuk memastikan semuanya tercatat.
func migrate(ctx context.Context, pool *pgxpool.Pool) error {
	var ready bool
	if err := pool.QueryRow(ctx, `SELECT to_regclass('public.users') IS NOT NULL`).Scan(&ready); err != nil {
		return err
	}
	if ready {
		return db.Migrate(ctx, pool)
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

	dir, err := migrationsDir()
	if err != nil {
		return err
	}
	entries, err := os.ReadDir(dir)
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
		body, err := os.ReadFile(filepath.Join(dir, name))
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
	return db.Migrate(ctx, pool)
}

// migrationsDir mencari folder migrasi dari beberapa kemungkinan lokasi supaya
// perintah tetap jalan baik lewat `go run` maupun dari root repo.
func migrationsDir() (string, error) {
	candidates := []string{
		filepath.Join("internal", "db", "migrations"),
		filepath.Join("..", "internal", "db", "migrations"),
	}
	if _, file, _, ok := runtime.Caller(0); ok {
		candidates = append(candidates,
			filepath.Join(filepath.Dir(file), "..", "..", "internal", "db", "migrations"))
	}
	for _, candidate := range candidates {
		if entries, err := os.ReadDir(candidate); err == nil && len(entries) > 0 {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("folder migrations tidak ditemukan dari %s", mustGetwd())
}

func mustGetwd() string {
	dir, err := os.Getwd()
	if err != nil {
		return "direktori tidak diketahui"
	}
	return dir
}
