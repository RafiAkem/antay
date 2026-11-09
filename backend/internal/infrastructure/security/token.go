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

type claims struct {
	UserID uuid.UUID `json:"uid"`
	Role   string    `json:"role"`
	jwt.RegisteredClaims
}

type TokenService struct {
	priv *rsa.PrivateKey
	pub  *rsa.PublicKey
	ttl  time.Duration
	now  func() time.Time
}

func NewTokenService(privatePEM string, ttl time.Duration) (*TokenService, error) {
	priv, err := loadKey(privatePEM)
	if err != nil {
		return nil, err
	}
	return &TokenService{priv: priv, pub: &priv.PublicKey, ttl: ttl, now: time.Now}, nil
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

func (s *TokenService) Issue(session user.Session) (string, error) {
	now := s.now()
	c := claims{
		UserID: session.UserID,
		Role:   session.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   session.UserID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodRS256, c).SignedString(s.priv)
}

func (s *TokenService) Parse(token string) (user.Session, error) {
	parsed, err := jwt.ParseWithClaims(token, &claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, ErrBadSession
		}
		return s.pub, nil
	}, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil {
		return user.Session{}, ErrBadSession
	}
	c, ok := parsed.Claims.(*claims)
	if !ok {
		return user.Session{}, ErrBadSession
	}
	return user.Session{UserID: c.UserID, Role: c.Role}, nil
}
