// Package organizer adalah penyelenggara event (EO, klub, promotor) yang
// didaftarkan admin mal. Akun login-nya tetap di tabel users dengan role organizer.
package organizer

import (
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/contact"
)

// Batas nama mengikuti CHECK di tabel organizers.
const (
	nameMin = 2
	nameMax = 100
)

var ErrNotFound = errors.New("penyelenggara tidak ditemukan")

type Organizer struct {
	ID           uuid.UUID
	Name         string
	ContactEmail string
	ContactPhone string
	IsActive     bool
	CreatedAt    time.Time
}

type Draft struct {
	Name, ContactEmail, ContactPhone string
}

// Normalize: nomor kontak boleh kosong (kolomnya default string kosong), email wajib.
func (d Draft) Normalize() (Draft, error) {
	var issues contact.Issues
	name, issue := contact.Name(d.Name, nameMin, nameMax)
	if issue != "" {
		issues.Add("name", issue)
	}
	email, issue := contact.Email(d.ContactEmail)
	if issue != "" {
		issues.Add("contactEmail", issue)
	}
	phone, issue := optionalPhone(d.ContactPhone)
	if issue != "" {
		issues.Add("contactPhone", issue)
	}
	return Draft{Name: name, ContactEmail: email, ContactPhone: phone}, issues.Err()
}

// Patch: nil berarti tidak diubah. ContactPhone berisi "" berarti dikosongkan.
type Patch struct {
	Name, ContactEmail, ContactPhone *string
	IsActive                         *bool
}

func (p Patch) Normalize() (Patch, error) {
	var issues contact.Issues
	out := Patch{IsActive: p.IsActive}
	if p.Name == nil && p.ContactEmail == nil && p.ContactPhone == nil && p.IsActive == nil {
		issues.Add("name", "isi minimal satu field yang mau diubah")
		return out, issues.Err()
	}
	if p.Name != nil {
		v, issue := contact.Name(*p.Name, nameMin, nameMax)
		if issue != "" {
			issues.Add("name", issue)
		}
		out.Name = &v
	}
	if p.ContactEmail != nil {
		v, issue := contact.Email(*p.ContactEmail)
		if issue != "" {
			issues.Add("contactEmail", issue)
		}
		out.ContactEmail = &v
	}
	if p.ContactPhone != nil {
		v, issue := optionalPhone(*p.ContactPhone)
		if issue != "" {
			issues.Add("contactPhone", issue)
		}
		out.ContactPhone = &v
	}
	return out, issues.Err()
}

func optionalPhone(raw string) (string, string) {
	phone, issue := contact.Phone(raw)
	if issue == contact.IssueRequired {
		return "", ""
	}
	return phone, issue
}
