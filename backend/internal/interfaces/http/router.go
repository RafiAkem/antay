// Package http memasang semua handler ke rute dan rantai middleware global.
package http

import (
	"log/slog"
	nethttp "net/http"
	"time"

	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
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

	// v2: akun pembeli, katalog bergambar, kelola event, gambar, dan denah kursi
	CustomerAuth *handler.CustomerAuth
	Accounts     *handler.Accounts
	Storefront   *handler.Storefront
	EventAdmin   *handler.EventAdmin
	Media        *handler.Media
	MediaFiles   *handler.MediaFiles
	Seating      *handler.Seating
}

type Config struct {
	Version  string
	Log      *slog.Logger
	Sessions *middleware.Sessions
	// sesi pembeli sengaja terpisah dari sesi internal (cookie dan audience beda)
	CustomerSessions *middleware.CustomerSessions
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

	requireAdmin := func(next nethttp.Handler) nethttp.Handler {
		return middleware.Chain(next, cfg.Sessions.Require, middleware.RequireRole(user.RoleAdmin))
	}
	// organizer atau admin; RequireRole selalu meloloskan admin
	requireManager := func(next nethttp.Handler) nethttp.Handler {
		return middleware.Chain(next, cfg.Sessions.Require, middleware.RequireRole(user.RoleOrganizer))
	}
	registerCustomer(mux, h.CustomerAuth, cfg.CustomerSessions)
	registerAccounts(mux, h.Accounts, requireAdmin)
	registerStorefrontPublic(mux, h.Storefront)
	// Hitung harga dipanggil setiap kali isi keranjang berubah, jadi punya jatah
	// sendiri. Kalau ikut visitorWrites, pembeli di WiFi mal yang sama bisa
	// menghabiskan kuota pesan tiket pengunjung lain.
	quotes := middleware.NewRateLimit(120, 10*time.Minute)
	registerStorefrontCustomer(mux, h.Storefront, cfg.CustomerSessions.RequireCustomer, quotes.Middleware)
	registerEventAdmin(mux, h.EventAdmin, requireManager, requireAdmin)
	registerMedia(mux, h.Media, cfg.Sessions)
	registerMediaFiles(mux, h.MediaFiles)
	registerSeatingPublic(mux, h.Seating)
	registerSeatingManage(mux, h.Seating, cfg.Sessions)

	return response.WithOptions(middleware.Chain(mux,
		middleware.RequestID,
		middleware.LogRequests(cfg.Log),
		middleware.Recover(cfg.Log),
		middleware.CSRF,
	), response.Options{Version: cfg.Version, Now: jakartaNow})
}

// jakartaNow dipakai untuk meta.timestamp supaya jam di respons sama dengan jam
// event yang dilihat pengguna, bukan jam server.
func jakartaNow() time.Time { return time.Now().In(shared.Jakarta) }
