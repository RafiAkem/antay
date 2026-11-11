package accounts

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/contact"
	"github.com/RafiAkem/antay/backend/internal/domain/organizer"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

const (
	userNameMin = 2
	userNameMax = 80
)

// NewUser adalah isian mentah form tambah akun. OrganizerID masih string supaya
// semua aturan, termasuk bentuk UUID-nya, diperiksa di satu tempat.
type NewUser struct {
	Email, Password, Name, Role string
	OrganizerID                 *string
}

// UserPatch: nil berarti tidak diubah. Role sengaja tidak bisa diganti, karena
// pindah role berarti pindah keterikatan organizer; lebih aman buat akun baru.
type UserPatch struct {
	Name     *string
	IsActive *bool
	Password *string
}

func (n NewUser) normalize() (NewUserRecord, string, error) {
	var issues contact.Issues
	email, issue := contact.Email(n.Email)
	if issue != "" {
		issues.Add("email", issue)
	}
	if issue := contact.Password(n.Password); issue != "" {
		issues.Add("password", issue)
	}
	name, issue := contact.Name(n.Name, userNameMin, userNameMax)
	if issue != "" {
		issues.Add("name", issue)
	}
	rec := NewUserRecord{Email: email, Name: name, Role: n.Role}
	hasOrganizer := n.OrganizerID != nil && *n.OrganizerID != ""
	switch n.Role {
	case user.RoleStaff, user.RoleAdmin:
		if hasOrganizer {
			issues.Add("organizerId", "hanya untuk role organizer")
		}
	case user.RoleOrganizer:
		if !hasOrganizer {
			issues.Add("organizerId", "wajib untuk role organizer")
			break
		}
		id, err := uuid.Parse(*n.OrganizerID)
		if err != nil {
			issues.Add("organizerId", "harus UUID")
			break
		}
		rec.OrganizerID = &id
	case "":
		issues.Add("role", contact.IssueRequired)
	default:
		issues.Add("role", "harus staff, admin, atau organizer")
	}
	return rec, n.Password, issues.Err()
}

func (s *Service) ListUsers(ctx context.Context) ([]User, error) {
	return s.repo.ListUsers(ctx)
}

// CreateUser memeriksa penyelenggara lebih dulu supaya admin dapat pesan yang
// jelas; FK di database tetap jadi jaring kalau penyelenggaranya terhapus di tengah jalan.
func (s *Service) CreateUser(ctx context.Context, in NewUser) (User, error) {
	rec, password, err := in.normalize()
	if err != nil {
		return User{}, err
	}
	if rec.OrganizerID != nil {
		org, err := s.repo.GetOrganizer(ctx, *rec.OrganizerID)
		if errors.Is(err, organizer.ErrNotFound) || (err == nil && !org.IsActive) {
			return User{}, ErrOrganizerInvalid
		}
		if err != nil {
			return User{}, err
		}
	}
	if rec.PasswordHash, err = s.hasher.Hash(password); err != nil {
		return User{}, err
	}
	return s.repo.CreateUser(ctx, rec)
}

// UpdateUser menolak admin menonaktifkan dirinya sendiri, supaya mal tidak
// sampai terkunci tanpa satu pun admin aktif karena salah klik.
func (s *Service) UpdateUser(ctx context.Context, actor, id uuid.UUID, p UserPatch) (User, error) {
	var issues contact.Issues
	var changes UserChanges
	if p.Name == nil && p.IsActive == nil && p.Password == nil {
		issues.Add("name", "isi minimal satu field yang mau diubah")
		return User{}, issues.Err()
	}
	if p.Name != nil {
		name, issue := contact.Name(*p.Name, userNameMin, userNameMax)
		if issue != "" {
			issues.Add("name", issue)
		}
		changes.Name = &name
	}
	if p.Password != nil {
		if issue := contact.Password(*p.Password); issue != "" {
			issues.Add("password", issue)
		}
	}
	if err := issues.Err(); err != nil {
		return User{}, err
	}
	if p.IsActive != nil && !*p.IsActive && actor == id {
		return User{}, ErrSelfDeactivate
	}
	changes.IsActive = p.IsActive
	if p.Password != nil {
		hash, err := s.hasher.Hash(*p.Password)
		if err != nil {
			return User{}, err
		}
		changes.PasswordHash = &hash
	}
	return s.repo.UpdateUser(ctx, id, changes)
}
