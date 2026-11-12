package http

import (
	nethttp "net/http"
	"time"

	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
)

// registerCustomer memasang akun pembeli. Daftar dan login punya kuota sendiri
// (10 per 10 menit per IP) supaya percobaan menebak kata sandi pembeli tidak
// ikut menghabiskan kuota login petugas, dan sebaliknya.
func registerCustomer(mux *nethttp.ServeMux, h *handler.CustomerAuth, cs *middleware.CustomerSessions) {
	registers := middleware.NewRateLimit(10, 10*time.Minute)
	logins := middleware.NewRateLimit(10, 10*time.Minute)
	signedIn := func(fn nethttp.HandlerFunc) nethttp.Handler { return cs.RequireCustomer(fn) }

	mux.Handle("POST /customer/v1/auth/register", registers.Middleware(nethttp.HandlerFunc(h.Register)))
	mux.Handle("POST /customer/v1/auth/login", logins.Middleware(nethttp.HandlerFunc(h.Login)))
	mux.HandleFunc("POST /customer/v1/auth/logout", h.Logout)
	mux.Handle("GET /customer/v1/me", signedIn(h.Me))
	mux.Handle("PATCH /customer/v1/me", signedIn(h.UpdateMe))
}
