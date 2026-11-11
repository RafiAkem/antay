// Package accounts melayani panel admin untuk penyelenggara dan akun internal
// (staff, admin, organizer). Akun pembeli tidak lewat sini.
package accounts

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/organizer"
)

var (
	ErrEmailTaken       = errors.New("email sudah dipakai akun lain")
	ErrOrganizerInvalid = errors.New("penyelenggara tidak ada atau nonaktif")
	ErrUserNotFound     = errors.New("akun tidak ditemukan")
	ErrSelfDeactivate   = errors.New("tidak bisa menonaktifkan akun sendiri")
)

// User adalah akun internal versi panel admin: ikut status aktifnya, tanpa hash.
type User struct {
	ID          uuid.UUID
	Email       string
	Name        string
	Role        string
	OrganizerID *uuid.UUID
	IsActive    bool
	CreatedAt   time.Time
}

// NewUserRecord sudah tervalidasi dan kata sandinya sudah di-hash.
type NewUserRecord struct {
	Email, PasswordHash, Name, Role string
	OrganizerID                     *uuid.UUID
}

// UserChanges: nil berarti kolomnya tidak disentuh.
type UserChanges struct {
	Name         *string
	IsActive     *bool
	PasswordHash *string
}

type Repository interface {
	ListOrganizers(ctx context.Context) ([]organizer.Organizer, error)
	// GetOrganizer mengembalikan organizer.ErrNotFound; organizer nonaktif tetap dikembalikan.
	GetOrganizer(ctx context.Context, id uuid.UUID) (organizer.Organizer, error)
	CreateOrganizer(ctx context.Context, d organizer.Draft) (organizer.Organizer, error)
	UpdateOrganizer(ctx context.Context, id uuid.UUID, p organizer.Patch) (organizer.Organizer, error)

	ListUsers(ctx context.Context) ([]User, error)
	// CreateUser mengembalikan ErrEmailTaken, atau ErrOrganizerInvalid bila FK gagal.
	CreateUser(ctx context.Context, rec NewUserRecord) (User, error)
	// UpdateUser mengembalikan ErrUserNotFound.
	UpdateUser(ctx context.Context, id uuid.UUID, c UserChanges) (User, error)
}

type Hasher interface {
	Hash(password string) (string, error)
}

type Service struct {
	repo   Repository
	hasher Hasher
}

func New(repo Repository, hasher Hasher) *Service {
	return &Service{repo: repo, hasher: hasher}
}

func (s *Service) ListOrganizers(ctx context.Context) ([]organizer.Organizer, error) {
	return s.repo.ListOrganizers(ctx)
}

func (s *Service) CreateOrganizer(ctx context.Context, d organizer.Draft) (organizer.Organizer, error) {
	clean, err := d.Normalize()
	if err != nil {
		return organizer.Organizer{}, err
	}
	return s.repo.CreateOrganizer(ctx, clean)
}

// UpdateOrganizer tidak ikut menonaktifkan akun organizer-nya; admin
// menonaktifkan akun itu terpisah bila memang perlu.
func (s *Service) UpdateOrganizer(ctx context.Context, id uuid.UUID, p organizer.Patch) (organizer.Organizer, error) {
	clean, err := p.Normalize()
	if err != nil {
		return organizer.Organizer{}, err
	}
	return s.repo.UpdateOrganizer(ctx, id, clean)
}
