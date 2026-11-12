// Package user adalah akun internal: petugas, admin mal, dan penyelenggara.
// Pembeli punya akun sendiri di tabel customers, bukan di sini.
package user

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

const (
	RoleStaff     = "staff"
	RoleAdmin     = "admin"
	RoleOrganizer = "organizer"
)

var ErrNotFound = errors.New("pengguna tidak ditemukan")

type User struct {
	ID           uuid.UUID
	Email        string
	PasswordHash string
	Name         string
	Role         string
	// OrganizerID hanya terisi untuk role organizer; database menjaganya lewat CHECK.
	OrganizerID *uuid.UUID
}

// Session adalah identitas yang dibawa token sesi.
type Session struct {
	UserID      uuid.UUID
	Role        string
	OrganizerID *uuid.UUID
}

type Repository interface {
	// GetByEmail dan GetByID hanya mengembalikan akun aktif; selain itu ErrNotFound.
	GetByEmail(ctx context.Context, email string) (User, error)
	GetByID(ctx context.Context, id uuid.UUID) (User, error)
}
