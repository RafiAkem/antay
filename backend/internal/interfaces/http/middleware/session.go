package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const (
	SessionCookie = "antay_session"
	CSRFCookie    = "antay_csrf"
	CSRFHeader    = "X-CSRF-TOKEN"
	csrfMaxAge    = 8 * 60 * 60
)

// Sessions mengelola cookie sesi (JWT HttpOnly) dan token CSRF double submit.
type Sessions struct {
	tokens *security.TokenService
	secure bool
}

func NewSessions(tokens *security.TokenService, secure bool) *Sessions {
	return &Sessions{tokens: tokens, secure: secure}
}

func (s *Sessions) SetCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(s.tokens.TTL().Seconds()),
	})
}

func (s *Sessions) ClearCookie(w http.ResponseWriter) {
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

type sessionKey struct{}

// Require menolak request tanpa sesi valid dengan 401.
func (s *Sessions) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(SessionCookie)
		if err != nil || cookie.Value == "" {
			response.Unauthorized(w, r, "Sesi tidak ditemukan. Masuk dulu.")
			return
		}
		session, err := s.tokens.Parse(cookie.Value)
		if err != nil {
			response.Unauthorized(w, r, "Sesi sudah berakhir. Masuk lagi.")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), sessionKey{}, session)))
	})
}

func SessionFrom(ctx context.Context) (user.Session, bool) {
	session, ok := ctx.Value(sessionKey{}).(user.Session)
	return session, ok
}

// RequireRole dipasang setelah Require; admin selalu boleh.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles)+1)
	allowed[user.RoleAdmin] = true
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session, ok := SessionFrom(r.Context())
			if !ok {
				response.Unauthorized(w, r, "Sesi tidak ditemukan. Masuk dulu.")
				return
			}
			if !allowed[session.Role] {
				response.Forbidden(w, r, "Akun ini tidak punya akses ke tindakan tersebut.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (s *Sessions) IssueCSRF(w http.ResponseWriter) string {
	token := randomToken()
	http.SetCookie(w, &http.Cookie{
		Name:     CSRFCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: false, // harus bisa dibaca JS untuk dikirim balik di header
		Secure:   s.secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   csrfMaxAge,
	})
	return token
}

// CSRF memeriksa token pada semua metode yang mengubah state.
func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}
		cookie, err := r.Cookie(CSRFCookie)
		header := r.Header.Get(CSRFHeader)
		if err != nil || cookie.Value == "" || header == "" || header != cookie.Value {
			response.Fail(w, r, http.StatusForbidden, "CSRF_MISSING", "Token keamanan tidak cocok. Muat ulang halaman lalu coba lagi.")
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
