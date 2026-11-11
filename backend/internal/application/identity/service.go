// Package identity melayani login akun internal: petugas, admin, dan organizer.
package identity

import (
	"context"
	"errors"
	"strings"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

var ErrInvalidCredentials = errors.New("email atau kata sandi salah")

type PasswordChecker interface {
	Matches(hash, password string) bool
}

type TokenIssuer interface {
	Issue(session user.Session) (string, error)
}

type Service struct {
	users     user.Repository
	passwords PasswordChecker
	tokens    TokenIssuer
}

func New(users user.Repository, passwords PasswordChecker, tokens TokenIssuer) *Service {
	return &Service{users: users, passwords: passwords, tokens: tokens}
}

// Login mengembalikan ErrInvalidCredentials yang sama untuk email tidak dikenal
// maupun kata sandi salah, supaya tidak membocorkan email mana yang terdaftar.
func (s *Service) Login(ctx context.Context, email, password string) (user.User, string, error) {
	u, err := s.users.GetByEmail(ctx, strings.TrimSpace(email))
	if err != nil {
		if errors.Is(err, user.ErrNotFound) {
			// Tetap memeriksa kata sandi supaya waktu responsnya sama dengan email terdaftar.
			s.passwords.Matches("", password)
			return user.User{}, "", ErrInvalidCredentials
		}
		return user.User{}, "", err
	}
	if !s.passwords.Matches(u.PasswordHash, password) {
		return user.User{}, "", ErrInvalidCredentials
	}
	token, err := s.tokens.Issue(user.Session{UserID: u.ID, Role: u.Role, OrganizerID: u.OrganizerID})
	if err != nil {
		return user.User{}, "", err
	}
	return u, token, nil
}

// Current mengembalikan user.ErrNotFound bila akun sudah dihapus atau nonaktif.
func (s *Service) Current(ctx context.Context, session user.Session) (user.User, error) {
	return s.users.GetByID(ctx, session.UserID)
}
