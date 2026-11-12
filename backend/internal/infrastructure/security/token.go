// Package security membungkus kriptografi sesi: JWT RS256 dan hash bcrypt.
package security

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

var ErrBadSession = errors.New("sesi tidak valid")

// Audiens memisahkan token akun internal dan token pembeli. Keduanya ditandatangani
// kunci yang sama, jadi tanpa cek aud token pembeli bisa dipakai membuka rute
// petugas (atau sebaliknya) asal formatnya cocok.
const (
	audienceInternal = "antay-internal"
	audienceCustomer = "antay-customer"
)

type claims struct {
	UserID      uuid.UUID  `json:"uid"`
	Role        string     `json:"role"`
	OrganizerID *uuid.UUID `json:"oid,omitempty"`
	jwt.RegisteredClaims
}

type customerClaims struct {
	CustomerID uuid.UUID `json:"cid"`
	jwt.RegisteredClaims
}

type TokenService struct {
	priv        *rsa.PrivateKey
	pub         *rsa.PublicKey
	ttl         time.Duration
	customerTTL time.Duration
	now         func() time.Time
}

// NewTokenService: ttl untuk sesi internal, customerTTL untuk sesi pembeli.
// Sesi pembeli dibuat lebih panjang karena mereka belanja dari ponsel dan
// kesal kalau harus login ulang di tengah checkout.
func NewTokenService(privatePEM string, ttl, customerTTL time.Duration) (*TokenService, error) {
	priv, err := loadKey(privatePEM)
	if err != nil {
		return nil, err
	}
	return &TokenService{
		priv: priv, pub: &priv.PublicKey,
		ttl: ttl, customerTTL: customerTTL,
		now: time.Now,
	}, nil
}

// loadKey memakai kunci dari environment bila ada. Tanpa itu, kunci dev
// dibangkitkan di memori: cukup untuk lokal, dan token otomatis tidak valid
// setelah restart.
func loadKey(privatePEM string) (*rsa.PrivateKey, error) {
	if privatePEM == "" {
		return rsa.GenerateKey(rand.Reader, 2048)
	}
	block, _ := pem.Decode([]byte(strings.ReplaceAll(privatePEM, `\n`, "\n")))
	if block == nil {
		return nil, errors.New("JWT_PRIVATE_KEY_PEM tidak bisa dibaca")
	}
	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err == nil {
		return priv, nil
	}
	key, err2 := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err2 != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("private key bukan RSA")
	}
	return rsaKey, nil
}

func (s *TokenService) TTL() time.Duration { return s.ttl }

func (s *TokenService) CustomerTTL() time.Duration { return s.customerTTL }

func (s *TokenService) registered(subject, audience string, ttl time.Duration) jwt.RegisteredClaims {
	now := s.now()
	return jwt.RegisteredClaims{
		Subject:   subject,
		Audience:  jwt.ClaimStrings{audience},
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
	}
}

func (s *TokenService) sign(c jwt.Claims) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodRS256, c).SignedString(s.priv)
}

// parse memverifikasi tanda tangan, umur, dan audiens sekaligus. Token tanpa
// aud (format lama) juga ditolak, jadi sesi lama cukup login ulang.
func (s *TokenService) parse(token, audience string, into jwt.Claims) error {
	_, err := jwt.ParseWithClaims(token, into, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, ErrBadSession
		}
		return s.pub, nil
	},
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithAudience(audience),
		jwt.WithTimeFunc(s.now),
	)
	if err != nil {
		return ErrBadSession
	}
	return nil
}

// Issue membuat token sesi akun internal (staff, admin, organizer).
func (s *TokenService) Issue(session user.Session) (string, error) {
	return s.sign(claims{
		UserID:           session.UserID,
		Role:             session.Role,
		OrganizerID:      session.OrganizerID,
		RegisteredClaims: s.registered(session.UserID.String(), audienceInternal, s.ttl),
	})
}

// Parse hanya menerima token akun internal.
func (s *TokenService) Parse(token string) (user.Session, error) {
	var c claims
	if err := s.parse(token, audienceInternal, &c); err != nil {
		return user.Session{}, err
	}
	return user.Session{UserID: c.UserID, Role: c.Role, OrganizerID: c.OrganizerID}, nil
}

// IssueCustomer membuat token sesi pembeli.
func (s *TokenService) IssueCustomer(customerID uuid.UUID) (string, error) {
	return s.sign(customerClaims{
		CustomerID:       customerID,
		RegisteredClaims: s.registered(customerID.String(), audienceCustomer, s.customerTTL),
	})
}

// ParseCustomer hanya menerima token pembeli dan mengembalikan id pembelinya.
func (s *TokenService) ParseCustomer(token string) (uuid.UUID, error) {
	var c customerClaims
	if err := s.parse(token, audienceCustomer, &c); err != nil {
		return uuid.Nil, err
	}
	if c.CustomerID == uuid.Nil {
		return uuid.Nil, ErrBadSession
	}
	return c.CustomerID, nil
}
