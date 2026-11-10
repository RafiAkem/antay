// Package http memasang semua handler ke rute dan rantai middleware global.
package http

import (
	"log/slog"
	nethttp "net/http"
	"time"

	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

type Handlers struct {
	Health     *handler.Health
	Auth       *handler.Auth
	Public     *handler.Public
	Counter    *handler.Counter
	Scheduling *handler.Scheduling
	Reporting  *handler.Reporting
}

type Config struct {
	Version  string
	Log      *slog.Logger
	Sessions *middleware.Sessions
}

func NewRouter(cfg Config, h Handlers) nethttp.Handler {
	mux := nethttp.NewServeMux()
	registerSystem(mux, h)
	// Batas longgar karena pengunjung di WiFi mal atau CGNAT operator berbagi satu IP.
	visitorWrites := middleware.NewRateLimit(30, 10*time.Minute)
	logins := middleware.NewRateLimit(10, 10*time.Minute)
	registerPublic(mux, h, visitorWrites.Middleware)
	registerOperational(mux, h, cfg.Sessions, logins.Middleware)
	registerAnalytics(mux, h, cfg.Sessions)

	return response.WithOptions(middleware.Chain(mux,
		middleware.RequestID,
		middleware.LogRequests(cfg.Log),
		middleware.Recover(cfg.Log),
		middleware.CSRF,
	), response.Options{Version: cfg.Version, Now: time.Now})
}
