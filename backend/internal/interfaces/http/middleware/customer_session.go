package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// CustomerSessionCookie sengaja beda nama dengan cookie internal. Token di
// dalamnya juga beda audiens, jadi menukar isi kedua cookie tetap ditolak.
const CustomerSessionCookie = "antay_customer_session"

// CustomerSessions mengelola cookie sesi pembeli. CSRF tetap memakai cookie
// dan middleware yang sama dengan sisi internal.
type CustomerSessions struct {
	tokens *security.TokenService
	secure bool
}

// NewCustomerSessions: secure diisi nilai yang sama dengan NewSessions
// (cfg.CookieSecure) supaya kedua cookie berperilaku sama di dev dan produksi.
func NewCustomerSessions(tokens *security.TokenService, secure bool) *CustomerSessions {
	return &CustomerSessions{tokens: tokens, secure: secure}
}

func (s *CustomerSessions) SetCookie(w http.ResponseWriter, token string) {
	s.write(w, token, int(s.tokens.CustomerTTL().Seconds()))
}

func (s *CustomerSessions) ClearCookie(w http.ResponseWriter) {
	s.write(w, "", -1)
}

func (s *CustomerSessions) write(w http.ResponseWriter, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     CustomerSessionCookie,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   maxAge,
	})
}

type customerKey struct{}

// RequireCustomer menolak request tanpa sesi pembeli yang valid dengan 401.
// Akun yang sudah nonaktif baru ketahuan di handler yang membaca database.
func (s *CustomerSessions) RequireCustomer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(CustomerSessionCookie)
		if err != nil || cookie.Value == "" {
			response.Unauthorized(w, r, "Sesi tidak ditemukan. Masuk dulu.")
			return
		}
		id, err := s.tokens.ParseCustomer(cookie.Value)
		if err != nil {
			response.Unauthorized(w, r, "Sesi sudah berakhir. Masuk lagi.")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), customerKey{}, id)))
	})
}

// CustomerFrom mengembalikan id pembeli yang dipasang RequireCustomer.
func CustomerFrom(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(customerKey{}).(uuid.UUID)
	return id, ok
}
