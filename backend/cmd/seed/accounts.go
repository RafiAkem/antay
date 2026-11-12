package main

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type accounts struct {
	adminID, staffID, organizerID uuid.UUID
}

// seedAccounts membuat akun yang belum ada dan membiarkan yang sudah ada apa
// adanya, termasuk kata sandinya. Jadi kalau ada yang sudah ganti sandi di
// database demo, seed ulang tidak mengembalikannya diam-diam.
func seedAccounts(ctx context.Context, tx pgx.Tx) (accounts, error) {
	var a accounts
	var err error
	if a.adminID, err = ensureUser(ctx, tx, "admin@antay.id", adminHash, "Admin Summarecon", "admin", nil); err != nil {
		return a, err
	}
	if a.staffID, err = ensureUser(ctx, tx, "petugas@antay.id", staffHash, "Petugas Loket", "staff", nil); err != nil {
		return a, err
	}
	if a.organizerID, err = ensureOrganizer(ctx, tx); err != nil {
		return a, err
	}
	orgHash, err := hash("organizer123")
	if err != nil {
		return a, err
	}
	if _, err = ensureUser(ctx, tx, "organizer@antay.id", orgHash, "Tim Event Summarecon", "organizer", &a.organizerID); err != nil {
		return a, err
	}
	buyerHash, err := hash("pembeli123")
	if err != nil {
		return a, err
	}
	_, err = tx.Exec(ctx, `
INSERT INTO customers (email, password_hash, name, phone)
VALUES ('pembeli@antay.id', $1, 'Raka Pratama', '6281234567890')
ON CONFLICT (email) DO NOTHING`, buyerHash)
	if err != nil {
		return a, fmt.Errorf("akun pembeli: %w", err)
	}
	return a, nil
}

func hash(password string) (string, error) {
	out, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(out), err
}

func ensureUser(ctx context.Context, tx pgx.Tx, email, hash, name, role string, organizerID *uuid.UUID) (uuid.UUID, error) {
	_, err := tx.Exec(ctx, `
INSERT INTO users (email, password_hash, name, role, organizer_id)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT ((lower(email))) DO NOTHING`, email, hash, name, role, organizerID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("akun %s: %w", email, err)
	}
	var id uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM users WHERE lower(email) = lower($1)`, email).Scan(&id)
	return id, err
}

// organizers tidak punya kolom unik selain id, jadi dicari lewat nama dulu.
func ensureOrganizer(ctx context.Context, tx pgx.Tx) (uuid.UUID, error) {
	var id uuid.UUID
	err := tx.QueryRow(ctx, `SELECT id FROM organizers WHERE name = $1 ORDER BY created_at LIMIT 1`, organizerName).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, err
	}
	err = tx.QueryRow(ctx, `
INSERT INTO organizers (name, contact_email, contact_phone)
VALUES ($1, 'organizer@antay.id', '6281200001111')
RETURNING id`, organizerName).Scan(&id)
	return id, err
}
