// Package user adalah akun petugas dan admin mal. Pengunjung tidak punya akun.
package user

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

const (
	RoleStaff = "staff"
	RoleAdmin = "admin"
)

var ErrNotFound = errors.New("pengguna tidak ditemukan")

type User struct {
	ID           uuid.UUID
	Email        string
	PasswordHash string
	Name         string
	Role         string
}

// Session adalah identitas yang dibawa token sesi.
type Session struct {
	UserID uuid.UUID
	Role   string
}

type Repository interface {
	// GetByEmail dan GetByID hanya mengembalikan akun aktif; selain itu ErrNotFound.
	GetByEmail(ctx context.Context, email string) (User, error)
	GetByID(ctx context.Context, id uuid.UUID) (User, error)
}
