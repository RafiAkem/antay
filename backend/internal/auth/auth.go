package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	SessionCookie = "antay_session"
	CSRFCookie    = "antay_csrf"
	CSRFHeader    = "X-CSRF-TOKEN"
)

var (
	ErrNoSession  = errors.New("sesi tidak ada")
	ErrBadSession = errors.New("sesi tidak valid")
)

type Claims struct {
	UserID uuid.UUID `json:"uid"`
	Role   string    `json:"role"`
	jwt.RegisteredClaims
}

type Service struct {
	priv   *rsa.PrivateKey
	pub    *rsa.PublicKey
	ttl    time.Duration
	secure bool
	now    func() time.Time
}

func New(privatePEM, publicPEM string, ttl time.Duration, secure bool) (*Service, error) {
	priv, pub, err := loadKeys(privatePEM, publicPEM)
	if err != nil {
		return nil, err
	}
	return &Service{priv: priv, pub: pub, ttl: ttl, secure: secure, now: time.Now}, nil
}

// loadKeys memakai pasangan dari environment bila ada. Tanpa itu, kunci dev
// dibangkitkan di memori: cukup untuk lokal, dan token otomatis tidak valid
// setelah restart.
func loadKeys(privatePEM, publicPEM string) (*rsa.PrivateKey, *rsa.PublicKey, error) {
	if privatePEM == "" {
		priv, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			return nil, nil, err
		}
		return priv, &priv.PublicKey, nil
	}
	block, _ := pem.Decode([]byte(strings.ReplaceAll(privatePEM, `\n`, "\n")))
	if block == nil {
		return nil, nil, errors.New("JWT_PRIVATE_KEY_PEM tidak bisa dibaca")
	}
	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		key, err2 := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err2 != nil {
			return nil, nil, fmt.Errorf("parse private key: %w", err)
		}
		rsaKey, ok := key.(*rsa.PrivateKey)
		if !ok {
			return nil, nil, errors.New("private key bukan RSA")
		}
		priv = rsaKey
	}
	return priv, &priv.PublicKey, nil
}

func (s *Service) Sign(userID uuid.UUID, role string) (string, error) {
	now := s.now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(s.priv)
}

func (s *Service) Parse(token string) (Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, ErrBadSession
		}
		return s.pub, nil
	}, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil {
		return Claims{}, ErrBadSession
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok {
		return Claims{}, ErrBadSession
	}
	return *claims, nil
}

func (s *Service) SetSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(s.ttl.Seconds()),
	})
}

func (s *Service) ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookie,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
}

func (s *Service) TTL() time.Duration { return s.ttl }

type sessionKey struct{}

// Middleware menolak request tanpa sesi valid dengan 401.
func (s *Service) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(SessionCookie)
		if err != nil || cookie.Value == "" {
			httpx.Unauthorized(w, r, "Sesi tidak ditemukan. Masuk dulu.")
			return
		}
		claims, err := s.Parse(cookie.Value)
		if err != nil {
			httpx.Unauthorized(w, r, "Sesi sudah berakhir. Masuk lagi.")
			return
		}
		next.ServeHTTP(w, r.WithContext(WithClaims(r.Context(), claims)))
	})
}

// RequireRole dipasang setelah Middleware; admin selalu boleh.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles)+1)
	allowed["admin"] = true
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := FromContext(r.Context())
			if !ok {
				httpx.Unauthorized(w, r, "Sesi tidak ditemukan. Masuk dulu.")
				return
			}
			if !allowed[claims.Role] {
				httpx.Forbidden(w, r, "Akun ini tidak punya akses ke tindakan tersebut.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func WithClaims(ctx context.Context, claims Claims) context.Context {
	return context.WithValue(ctx, sessionKey{}, claims)
}

func FromContext(ctx context.Context) (Claims, bool) {
	claims, ok := ctx.Value(sessionKey{}).(Claims)
	return claims, ok
}

// Chain menyusun middleware dari kiri ke kanan.
func Chain(h http.Handler, mw ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}

// --- CSRF double-submit ---

func (s *Service) IssueCSRF(w http.ResponseWriter) string {
	token := randomToken()
	http.SetCookie(w, &http.Cookie{
		Name:     CSRFCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: false, // harus bisa dibaca JS untuk dikirim balik di header
		Secure:   s.secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   8 * 60 * 60,
	})
	return token
}

// CSRFMiddleware memeriksa token pada semua metode yang mengubah state.
func CSRFMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}
		cookie, err := r.Cookie(CSRFCookie)
		header := r.Header.Get(CSRFHeader)
		if err != nil || cookie.Value == "" || header == "" || header != cookie.Value {
			httpx.Fail(w, r, http.StatusForbidden, "CSRF_MISSING", "Token keamanan tidak cocok. Muat ulang halaman lalu coba lagi.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func randomToken() string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		panic("gagal membuat token acak: " + err.Error())
	}
	return hex.EncodeToString(buf)
}
