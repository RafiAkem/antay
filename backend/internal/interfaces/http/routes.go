package http

import (
	nethttp "net/http"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
)

func registerSystem(mux *nethttp.ServeMux, h Handlers) {
	mux.HandleFunc("GET /", h.Health.Root)
	mux.HandleFunc("GET /csrf", h.Auth.CSRF)
	mux.HandleFunc("GET /health/live", h.Health.Live)
	mux.HandleFunc("GET /health/ready", h.Health.Ready)
	mux.HandleFunc("GET /health/startup", h.Health.Ready)
	// dependencies untuk dashboard internal; jangan diekspos ke publik.
	mux.HandleFunc("GET /health/dependencies", h.Health.Ready)
}

// registerPublic: halaman pengunjung dan papan antrean, tanpa sesi.
func registerPublic(mux *nethttp.ServeMux, h Handlers) {
	mux.HandleFunc("GET /public/v1/events", h.Public.ListEvents)
	mux.HandleFunc("GET /public/v1/events/{eventId}", h.Public.GetEvent)
	mux.HandleFunc("GET /public/v1/events/{eventId}/board", h.Public.GetBoard)
	mux.HandleFunc("POST /public/v1/tickets", h.Public.CreateTicket)
	mux.HandleFunc("GET /public/v1/tickets/{code}", h.Public.GetTicket)
}

// registerOperational memasang sesi pada semua rute kecuali login. Admin boleh
// melakukan semua aksi staff; RequireRole memperlakukan admin sebagai super.
func registerOperational(mux *nethttp.ServeMux, h Handlers, s *middleware.Sessions) {
	staff := func(fn nethttp.HandlerFunc) nethttp.Handler { return s.Require(fn) }
	admin := func(fn nethttp.HandlerFunc) nethttp.Handler {
		return middleware.Chain(fn, s.Require, middleware.RequireRole(user.RoleAdmin))
	}

	mux.HandleFunc("POST /operational/v1/auth/login", h.Auth.Login)
	mux.Handle("POST /operational/v1/auth/logout", staff(h.Auth.Logout))
	mux.Handle("GET /operational/v1/auth/me", staff(h.Auth.Me))

	mux.Handle("GET /operational/v1/events", staff(h.Counter.ListEvents))
	mux.Handle("POST /operational/v1/events", admin(h.Scheduling.CreateEvent))
	mux.Handle("GET /operational/v1/events/{eventId}/waiting", staff(h.Counter.ListWaiting))
	mux.Handle("PATCH /operational/v1/events/{eventId}/queue", staff(h.Counter.UpdateQueue))

	mux.Handle("GET /operational/v1/tickets/{code}", staff(h.Counter.LookupTicket))
	mux.Handle("POST /operational/v1/tickets/{code}/redemptions", staff(h.Counter.RedeemTicket))
}

// registerAnalytics: dasbor manajemen, khusus admin.
func registerAnalytics(mux *nethttp.ServeMux, h Handlers, s *middleware.Sessions) {
	admin := func(fn nethttp.HandlerFunc) nethttp.Handler {
		return middleware.Chain(fn, s.Require, middleware.RequireRole(user.RoleAdmin))
	}
	mux.Handle("GET /analytics/v1/events/{eventId}/summary", admin(h.Reporting.Summary))
	mux.Handle("GET /analytics/v1/overview", admin(h.Reporting.Overview))
}
