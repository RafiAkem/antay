// Package customeraccount melayani daftar, login, dan profil pembeli.
package customeraccount

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/contact"
	"github.com/RafiAkem/antay/backend/internal/domain/customer"
)

var ErrInvalidCredentials = errors.New("email atau kata sandi salah")

type Passwords interface {
	Hash(password string) (string, error)
	// Matches dengan hash kosong tetap menjalankan bcrypt lalu false.
	Matches(hash, password string) bool
}

type TokenIssuer interface {
	IssueCustomer(customerID uuid.UUID) (string, error)
}

type Service struct {
	customers customer.Repository
	passwords Passwords
	tokens    TokenIssuer
}

func New(customers customer.Repository, passwords Passwords, tokens TokenIssuer) *Service {
	return &Service{customers: customers, passwords: passwords, tokens: tokens}
}

// Register mengembalikan *contact.ValidationError, customer.ErrEmailTaken, atau
// pembeli baru beserta token sesinya (langsung masuk setelah daftar).
func (s *Service) Register(ctx context.Context, in customer.Registration) (customer.Customer, string, error) {
	reg, err := in.Normalize()
	if err != nil {
		return customer.Customer{}, "", err
	}
	hash, err := s.passwords.Hash(reg.Password)
	if err != nil {
		return customer.Customer{}, "", err
	}
	c, err := s.customers.Create(ctx, customer.NewAccount{
		Email: reg.Email, PasswordHash: hash, Name: reg.Name, Phone: reg.Phone,
	})
	if err != nil {
		return customer.Customer{}, "", err
	}
	token, err := s.tokens.IssueCustomer(c.ID)
	if err != nil {
		return customer.Customer{}, "", err
	}
	return c, token, nil
}

// Login menjawab ErrInvalidCredentials yang sama untuk email asing, akun
// nonaktif, dan kata sandi salah. Untuk dua kasus pertama bcrypt tetap
// dijalankan ke hash dummy supaya lama responsnya tidak membocorkan apa-apa.
func (s *Service) Login(ctx context.Context, email, password string) (customer.Customer, string, error) {
	normalized, issue := contact.Email(email)
	if issue != "" {
		s.passwords.Matches("", password)
		return customer.Customer{}, "", ErrInvalidCredentials
	}
	c, hash, err := s.customers.FindForLogin(ctx, normalized)
	if err != nil {
		if errors.Is(err, customer.ErrNotFound) {
			s.passwords.Matches("", password)
			return customer.Customer{}, "", ErrInvalidCredentials
		}
		return customer.Customer{}, "", err
	}
	if !s.passwords.Matches(hash, password) {
		return customer.Customer{}, "", ErrInvalidCredentials
	}
	token, err := s.tokens.IssueCustomer(c.ID)
	if err != nil {
		return customer.Customer{}, "", err
	}
	return c, token, nil
}

// Get mengembalikan customer.ErrNotFound bila akun sudah nonaktif, supaya
// sesi yang masih tersimpan di ponsel ikut tidak berlaku.
func (s *Service) Get(ctx context.Context, id uuid.UUID) (customer.Customer, error) {
	return s.customers.FindActive(ctx, id)
}

func (s *Service) UpdateProfile(ctx context.Context, id uuid.UUID, in customer.ProfileUpdate) (customer.Customer, error) {
	u, err := in.Normalize()
	if err != nil {
		return customer.Customer{}, err
	}
	return s.customers.UpdateProfile(ctx, id, u)
}
