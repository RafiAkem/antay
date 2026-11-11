package http

import (
	nethttp "net/http"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
)

// registerSeatingManage: editor denah kursi. Role organizer dicek di sini,
// sedangkan "event ini milik organizer yang mana" dicek service supaya event
// orang lain dijawab 404, bukan 403. Admin lolos lewat RequireRole.
func registerSeatingManage(mux *nethttp.ServeMux, h *handler.Seating, s *middleware.Sessions) {
	manager := func(fn nethttp.HandlerFunc) nethttp.Handler {
		return middleware.Chain(fn, s.Require, middleware.RequireRole(user.RoleOrganizer))
	}
	mux.Handle("GET /operational/v1/manage/events/{eventId}/seat-map", manager(h.ManageSeatMap))
	mux.Handle("PUT /operational/v1/manage/events/{eventId}/layout", manager(h.PutLayout))
	mux.Handle("POST /operational/v1/manage/events/{eventId}/seat-blocks", manager(h.CreateBlock))
	mux.Handle("PATCH /operational/v1/manage/events/{eventId}/seats", manager(h.UpdateSeats))
	mux.Handle("POST /operational/v1/manage/seat-blocks/preview", manager(h.PreviewBlock))
	mux.Handle("PATCH /operational/v1/manage/seat-blocks/{blockId}", manager(h.UpdateBlock))
	mux.Handle("DELETE /operational/v1/manage/seat-blocks/{blockId}", manager(h.DeleteBlock))
}

// registerSeatingPublic: denah untuk pembeli, tanpa sesi.
func registerSeatingPublic(mux *nethttp.ServeMux, h *handler.Seating) {
	mux.HandleFunc("GET /public/v1/events/{eventId}/seat-map", h.PublicSeatMap)
}
