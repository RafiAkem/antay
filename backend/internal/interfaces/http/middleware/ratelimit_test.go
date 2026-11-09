package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimitBlocksAfterMaxThenResets(t *testing.T) {
	now := time.Date(2026, 11, 9, 10, 0, 0, 0, time.UTC)
	l := NewRateLimit(2, 10*time.Minute)
	l.now = func() time.Time { return now }
	h := l.Middleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }))

	call := func(addr string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/public/v1/tickets", nil)
		req.RemoteAddr = addr
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}

	for i := 0; i < 2; i++ {
		if rec := call("203.0.113.5:4000"); rec.Code != http.StatusOK {
			t.Fatalf("request ke-%d: mau 200, dapat %d", i+1, rec.Code)
		}
	}
	rec := call("203.0.113.5:4001")
	if rec.Code != http.StatusTooManyRequests || rec.Header().Get("Retry-After") != "600" {
		t.Fatalf("request ke-3: mau 429 dengan Retry-After 600, dapat %d %q", rec.Code, rec.Header().Get("Retry-After"))
	}
	if rec := call("198.51.100.7:4000"); rec.Code != http.StatusOK {
		t.Fatalf("IP lain tidak boleh ikut terblokir, dapat %d", rec.Code)
	}

	now = now.Add(10 * time.Minute)
	if rec := call("203.0.113.5:4000"); rec.Code != http.StatusOK {
		t.Fatalf("setelah jendela habis mau 200, dapat %d", rec.Code)
	}
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		name, remote, realIP, xff, want string
	}{
		{"klien langsung", "203.0.113.5:4000", "", "", "203.0.113.5"},
		{"klien langsung memalsukan header", "203.0.113.5:4000", "1.2.3.4", "1.2.3.4", "203.0.113.5"},
		{"nginx dengan X-Real-IP", "127.0.0.1:5000", "203.0.113.9", "", "203.0.113.9"},
		{"nginx dengan X-Forwarded-For", "127.0.0.1:5000", "", "1.2.3.4, 203.0.113.9", "203.0.113.9"},
		{"proxy tanpa header", "127.0.0.1:5000", "", "", ""},
		{"IPv6 dipotong ke /64", "[2001:db8:1:2:aaaa::1]:4000", "", "", "2001:db8:1:2::/64"},
	}
	for _, c := range cases {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = c.remote
		if c.realIP != "" {
			req.Header.Set("X-Real-IP", c.realIP)
		}
		if c.xff != "" {
			req.Header.Set("X-Forwarded-For", c.xff)
		}
		if got := ClientIP(req); got != c.want {
			t.Errorf("%s: mau %q, dapat %q", c.name, c.want, got)
		}
	}
}
