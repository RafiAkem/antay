package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
)

func TestCustomerCookieFollowsSecureFlag(t *testing.T) {
	tokens, err := security.NewTokenService("", time.Hour, 48*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	for _, secure := range []bool{true, false} {
		rec := httptest.NewRecorder()
		NewCustomerSessions(tokens, secure).SetCookie(rec, "isi")
		c := rec.Result().Cookies()[0]
		if c.Name != CustomerSessionCookie || c.Secure != secure || !c.HttpOnly || c.MaxAge != 48*60*60 {
			t.Fatalf("secure=%v: cookie = %+v", secure, c)
		}
	}
}
