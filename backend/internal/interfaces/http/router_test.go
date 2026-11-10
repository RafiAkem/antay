package http

import (
	"context"
	"encoding/json"
	"log/slog"
	nethttp "net/http"
	"net/http/httptest"
	"testing"

	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
)

type upPinger struct{}

func (upPinger) Ping(context.Context) error { return nil }

func testRouter() nethttp.Handler {
	sessions := middleware.NewSessions(nil, false)
	return NewRouter(
		Config{Version: "test", Log: slog.New(slog.DiscardHandler), Sessions: sessions},
		Handlers{
			Health: handler.NewHealth(upPinger{}, "test"),
			Auth:   handler.NewAuth(nil, sessions),
		},
	)
}

func get(path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	testRouter().ServeHTTP(rec, httptest.NewRequest(nethttp.MethodGet, path, nil))
	return rec
}

func TestUnknownGetPathReturnsAPINotFound(t *testing.T) {
	paths := []string{"/tidak-ada", "/public/v1/tidak-ada", "/public/v1/events/", "/operational/v1/tidak-ada"}
	for _, path := range paths {
		rec := get(path)
		if rec.Code != nethttp.StatusNotFound {
			t.Fatalf("GET %s = %d, mau 404", path, rec.Code)
		}
		var body struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("GET %s body bukan JSON: %v", path, err)
		}
		if body.Error.Code != "NOT_FOUND" {
			t.Fatalf("GET %s error.code = %q, mau NOT_FOUND", path, body.Error.Code)
		}
	}
}

func TestRootStillAnswers(t *testing.T) {
	if rec := get("/"); rec.Code != nethttp.StatusOK {
		t.Fatalf("GET / = %d, mau 200", rec.Code)
	}
}

func TestCSRFIsNotCacheable(t *testing.T) {
	rec := get("/csrf")
	if rec.Code != nethttp.StatusNoContent {
		t.Fatalf("GET /csrf = %d, mau 204", rec.Code)
	}
	if got := rec.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q, mau no-store", got)
	}
}
