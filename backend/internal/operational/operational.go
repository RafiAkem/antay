// Package operational melayani petugas loket dan admin mal.
package operational

import (
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/auth"
)

type Handler struct {
	deps app.Deps
}

func New(deps app.Deps) *Handler { return &Handler{deps: deps} }

// Register memasang sesi pada semua rute kecuali login. Admin boleh melakukan
// semua aksi staff; RequireRole sudah memperlakukan admin sebagai super.
func (h *Handler) Register(mux *http.ServeMux, session func(http.Handler) http.Handler) {
	mux.HandleFunc("POST /operational/v1/auth/login", h.login)

	mux.Handle("POST /operational/v1/auth/logout", session(http.HandlerFunc(h.logout)))
	mux.Handle("GET /operational/v1/auth/me", session(http.HandlerFunc(h.me)))

	mux.Handle("GET /operational/v1/events", session(http.HandlerFunc(h.listEvents)))
	mux.Handle("POST /operational/v1/events", auth.Chain(http.HandlerFunc(h.createEvent), session, auth.RequireRole("admin")))
	mux.Handle("GET /operational/v1/events/{eventId}/waiting", session(http.HandlerFunc(h.listWaiting)))
	mux.Handle("PATCH /operational/v1/events/{eventId}/queue", session(http.HandlerFunc(h.updateQueue)))

	mux.Handle("GET /operational/v1/tickets/{code}", session(http.HandlerFunc(h.lookupTicket)))
	mux.Handle("POST /operational/v1/tickets/{code}/redemptions", session(http.HandlerFunc(h.redeemTicket)))
}
