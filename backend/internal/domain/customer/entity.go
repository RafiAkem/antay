// Package customer adalah akun pembeli. Sengaja terpisah dari akun internal
// (package user) karena pembeli mendaftar sendiri dari internet.
package customer

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/contact"
)

const (
	nameMin = 2
	nameMax = 80
)

var (
	ErrNotFound   = errors.New("pembeli tidak ditemukan")
	ErrEmailTaken = errors.New("email sudah terdaftar")
)

type Customer struct {
	ID        uuid.UUID
	Email     string
	Name      string
	Phone     string
	IsActive  bool
	CreatedAt time.Time
}

// Registration adalah isian mentah form daftar.
type Registration struct {
	Email, Password, Name, Phone string
}

// Normalize mengembalikan isian yang sudah rapi, atau *contact.ValidationError.
// Kata sandi tidak diubah sama sekali, termasuk spasi di ujungnya.
func (r Registration) Normalize() (Registration, error) {
	var issues contact.Issues
	email, issue := contact.Email(r.Email)
	if issue != "" {
		issues.Add("email", issue)
	}
	if issue := contact.Password(r.Password); issue != "" {
		issues.Add("password", issue)
	}
	name, issue := contact.Name(r.Name, nameMin, nameMax)
	if issue != "" {
		issues.Add("name", issue)
	}
	phone, issue := contact.Phone(r.Phone)
	if issue != "" {
		issues.Add("phone", issue)
	}
	return Registration{Email: email, Password: r.Password, Name: name, Phone: phone}, issues.Err()
}

// ProfileUpdate: nil berarti field tidak diubah.
type ProfileUpdate struct {
	Name  *string
	Phone *string
}

func (u ProfileUpdate) Normalize() (ProfileUpdate, error) {
	var issues contact.Issues
	var out ProfileUpdate
	if u.Name == nil && u.Phone == nil {
		issues.Add("name", "isi minimal satu dari name atau phone")
		return out, issues.Err()
	}
	if u.Name != nil {
		name, issue := contact.Name(*u.Name, nameMin, nameMax)
		if issue != "" {
			issues.Add("name", issue)
		}
		out.Name = &name
	}
	if u.Phone != nil {
		phone, issue := contact.Phone(*u.Phone)
		if issue != "" {
			issues.Add("phone", issue)
		}
		out.Phone = &phone
	}
	return out, issues.Err()
}

// NewAccount adalah data yang siap disimpan; kata sandi sudah di-hash.
type NewAccount struct {
	Email, PasswordHash, Name, Phone string
}

type Repository interface {
	// Create mengembalikan ErrEmailTaken bila email sudah dipakai.
	Create(ctx context.Context, a NewAccount) (Customer, error)
	// FindForLogin hanya mencari akun aktif dan ikut mengembalikan hash kata sandi.
	FindForLogin(ctx context.Context, email string) (Customer, string, error)
	// FindActive mengembalikan ErrNotFound bila akun tidak ada atau nonaktif.
	FindActive(ctx context.Context, id uuid.UUID) (Customer, error)
	UpdateProfile(ctx context.Context, id uuid.UUID, u ProfileUpdate) (Customer, error)
}
