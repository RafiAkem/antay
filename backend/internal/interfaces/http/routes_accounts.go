package http

import (
	nethttp "net/http"

	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
)

// registerAccounts: kelola penyelenggara dan akun internal, khusus admin.
// requireAdmin harus sudah memasang sesi (UpdateUser membaca SessionFrom).
func registerAccounts(mux *nethttp.ServeMux, h *handler.Accounts, requireAdmin func(nethttp.Handler) nethttp.Handler) {
	admin := func(fn nethttp.HandlerFunc) nethttp.Handler { return requireAdmin(fn) }

	mux.Handle("GET /operational/v1/organizers", admin(h.ListOrganizers))
	mux.Handle("POST /operational/v1/organizers", admin(h.CreateOrganizer))
	mux.Handle("PATCH /operational/v1/organizers/{organizerId}", admin(h.UpdateOrganizer))

	mux.Handle("GET /operational/v1/users", admin(h.ListUsers))
	mux.Handle("POST /operational/v1/users", admin(h.CreateUser))
	mux.Handle("PATCH /operational/v1/users/{userId}", admin(h.UpdateUser))
}
