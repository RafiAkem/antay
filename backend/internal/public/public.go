// Package public melayani halaman pengunjung dan papan antrean: tanpa sesi.
package public

import (
	"log/slog"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/httpx"
)

type Handler struct {
	deps app.Deps
}

func New(deps app.Deps) *Handler { return &Handler{deps: deps} }

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /public/v1/events", h.listEvents)
	mux.HandleFunc("GET /public/v1/events/{eventId}", h.getEvent)
	mux.HandleFunc("GET /public/v1/events/{eventId}/board", h.getBoard)
	mux.HandleFunc("POST /public/v1/tickets", h.createTicket)
	mux.HandleFunc("GET /public/v1/tickets/{code}", h.getTicket)
}

// internal mencatat penyebab asli di log, tapi klien hanya menerima pesan umum.
// Yang dicatat sengaja cuma error dan trace id supaya nama pengunjung tidak ikut.
func (h *Handler) internal(w http.ResponseWriter, r *http.Request, action string, err error) {
	slog.Error("public: "+action, "traceId", httpx.TraceID(r), "error", err)
	httpx.Internal(w, r)
}
