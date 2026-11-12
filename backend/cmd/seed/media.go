package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"math"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// mediaEntry adalah satu baris cmd/seed/media/manifest.json.
type mediaEntry struct {
	File      string `json:"file"`
	Event     string `json:"event"`
	Kind      string `json:"kind"`
	Alt       string `json:"alt"`
	Width     int32  `json:"width"`
	Height    int32  `json:"height"`
	Credit    string `json:"credit"`
	SourceURL string `json:"sourceUrl"`
}

var contentTypes = map[string]string{".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}

// seedMedia menyalin foto demo ke UPLOAD_DIR lalu mencatatnya di event_images.
// Manifest tidak wajib ada: tanpa foto pun demo tetap jalan, cuma kartunya polos.
func seedMedia(ctx context.Context, tx pgx.Tx, ids map[string]uuid.UUID) (int, error) {
	dir := envOr("SEED_MEDIA_DIR", filepath.Join("cmd", "seed", "media"))
	raw, err := os.ReadFile(filepath.Join(dir, "manifest.json"))
	if errors.Is(err, fs.ErrNotExist) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	var entries []mediaEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		return 0, fmt.Errorf("manifest media rusak: %w", err)
	}
	uploadDir := envOr("UPLOAD_DIR", "./uploads")
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return 0, fmt.Errorf("membuat UPLOAD_DIR: %w", err)
	}

	targets := mediaTargets(ids)
	added := 0
	gallerySort := map[uuid.UUID]int32{}
	for _, m := range entries {
		eventIDs := targets[m.Event]
		if len(eventIDs) == 0 || (m.Kind != "poster" && m.Kind != "gallery") || m.Width <= 0 || m.Height <= 0 {
			fmt.Fprintf(os.Stderr, "lewati media %q: event, kind, atau ukuran tidak dikenal\n", m.File)
			continue
		}
		// Nama dari manifest dipakai sebagai nama berkas saja, jangan sampai
		// "../" di manifest membuat seed membaca berkas di luar folder media.
		base := filepath.Base(m.File)
		ext := strings.ToLower(filepath.Ext(base))
		if ext == ".jpeg" {
			ext = ".jpg"
		}
		ctype, ok := contentTypes[ext]
		if base != m.File || !ok {
			fmt.Fprintf(os.Stderr, "lewati media %q: nama atau format tidak didukung\n", m.File)
			continue
		}
		src := filepath.Join(dir, base)
		info, err := os.Stat(src)
		if err != nil || info.Size() <= 0 || info.Size() > math.MaxInt32 {
			fmt.Fprintf(os.Stderr, "lewati media %q: berkas tidak ada atau ukurannya aneh\n", m.File)
			continue
		}

		for _, eventID := range eventIDs {
			var sort int32
			if m.Kind == "gallery" {
				sort = gallerySort[eventID]
				gallerySort[eventID]++
			}
			n, err := attachImage(ctx, tx, m, eventID, src, base, ext, ctype, info.Size(), uploadDir, sort)
			if err != nil {
				return added, err
			}
			added += n
		}
	}
	return added, nil
}

// mediaTargets memetakan kunci media di manifest ke semua event yang memakainya.
// Satu foto bisa dipakai beberapa edisi dari seri yang sama.
func mediaTargets(ids map[string]uuid.UUID) map[string][]uuid.UUID {
	out := map[string][]uuid.UUID{}
	for _, spec := range eventSeeds {
		id, ok := ids[spec.key]
		if !ok {
			continue
		}
		key := spec.media
		if key == "" {
			key = spec.key
		}
		out[key] = append(out[key], id)
	}
	return out
}

// attachImage menyalin satu foto ke UPLOAD_DIR untuk satu event lalu mencatatnya.
func attachImage(ctx context.Context, tx pgx.Tx, m mediaEntry, eventID uuid.UUID,
	src, base, ext, ctype string, size int64, uploadDir string, sort int32) (int, error) {
	name := safeName(base, ext, eventID)
	if err := copyOnce(src, filepath.Join(uploadDir, name), size); err != nil {
		return 0, fmt.Errorf("menyalin %s: %w", base, err)
	}
	// Tanpa target ON CONFLICT supaya dua index unik ikut aman: nama berkas
	// dan satu poster per event.
	tag, err := tx.Exec(ctx, `
INSERT INTO event_images (event_id, kind, file_name, content_type, width, height, size_bytes, alt, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT DO NOTHING`,
		eventID, m.Kind, name, ctype, m.Width, m.Height, int32(size), m.Alt, sort)
	if err != nil {
		return 0, fmt.Errorf("mencatat %s: %w", base, err)
	}
	if m.Kind == "poster" {
		// Poster yang sudah diganti penyelenggara tidak ditimpa.
		url := "/media/" + name
		if _, err := tx.Exec(ctx, `
UPDATE events SET poster_url = $1, updated_at = now()
WHERE id = $2 AND (poster_url = '' OR poster_url = $1)`, url, eventID); err != nil {
			return 0, err
		}
	}
	return int(tag.RowsAffected()), nil
}

// safeName membuat nama yang lolos CHECK event_images (^[a-z0-9-]+\.(jpg|png|webp)$).
// Potongan id event ikut dipasang karena file_name unik global, sementara event
// demo versi 1 dibuat ulang tiap hari dengan id baru.
func safeName(base, ext string, eventID uuid.UUID) string {
	stem := strings.ToLower(strings.TrimSuffix(base, filepath.Ext(base)))
	var b strings.Builder
	dash := false
	for _, r := range stem {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			dash = false
		} else if !dash && b.Len() > 0 {
			b.WriteByte('-')
			dash = true
		}
	}
	slug := strings.TrimSuffix(b.String(), "-")
	if slug == "" {
		slug = "foto"
	}
	return "seed-" + slug + "-" + eventID.String()[:8] + ext
}

// copyOnce melewati berkas tujuan yang sudah ada dengan ukuran sama, supaya seed
// ulang tidak menyalin megabyte yang sama berkali-kali.
func copyOnce(src, dst string, size int64) error {
	if info, err := os.Stat(dst); err == nil && info.Size() == size {
		return nil
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		_ = out.Close()
		return err
	}
	return out.Close()
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
