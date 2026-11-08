// Package analytics melayani dasbor manajemen mal.
package analytics

import (
	"errors"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/auth"
	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Handler struct {
	deps app.Deps
}

func New(deps app.Deps) *Handler { return &Handler{deps: deps} }

func (h *Handler) Register(mux *http.ServeMux, session func(http.Handler) http.Handler) {
	admin := auth.Chain(http.HandlerFunc(h.summary), session, auth.RequireRole("admin"))
	mux.Handle("GET /analytics/v1/events/{eventId}/summary", admin)
	mux.Handle("GET /analytics/v1/overview", auth.Chain(http.HandlerFunc(h.overview), session, auth.RequireRole("admin")))
}

type summaryTotals struct {
	Registered int32 `json:"registered"`
	Redeemed   int32 `json:"redeemed"`
	Pending    int32 `json:"pending"`
	Cancelled  int32 `json:"cancelled"`
	NoShow     int32 `json:"noShow"`
	Capacity   int32 `json:"capacity"`
	Left       int32 `json:"left"`
}

type summarySlot struct {
	Start      string `json:"start"`
	End        string `json:"end"`
	Registered int32  `json:"registered"`
	Redeemed   int32  `json:"redeemed"`
	Capacity   int32  `json:"capacity"`
	Past       bool   `json:"past"`
	Current    bool   `json:"current"`
}

type summaryBody struct {
	Event  app.EventRefDTO `json:"event"`
	Totals summaryTotals   `json:"totals"`
	Slots  []summarySlot   `json:"slots"`
}

type overviewEvent struct {
	ID         string       `json:"id"`
	Name       string       `json:"name"`
	Place      string       `json:"place"`
	OpenTime   string       `json:"openTime"`
	CloseTime  string       `json:"closeTime"`
	Registered int32        `json:"registered"`
	Redeemed   int32        `json:"redeemed"`
	Queue      app.QueueDTO `json:"queue"`
}

// summary memakai SlotStarts, bukan baris tiket, supaya slot kosong tetap
// tampil dan penyebut kapasitas tidak ikut mengecil.
func (h *Handler) summary(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		httpx.NotFound(w, r, "Event tidak ditemukan.")
		return
	}

	ctx := r.Context()
	ev, err := h.deps.Store.GetEvent(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Event tidak ditemukan.")
			return
		}
		httpx.Internal(w, r)
		return
	}

	now := h.deps.NowMinutes()
	counts, err := h.deps.Store.EventTicketCounts(ctx, id)
	if err != nil {
		httpx.Internal(w, r)
		return
	}
	noShow, err := h.deps.Store.EventNoShowCount(ctx, store.EventNoShowCountParams{EventID: id, NowMinutes: now})
	if err != nil {
		httpx.Internal(w, r)
		return
	}
	stats, err := h.deps.Store.EventSlotStats(ctx, id)
	if err != nil {
		httpx.Internal(w, r)
		return
	}

	httpx.OK(w, r, "Data retrieved", buildSummary(ev, counts, noShow, stats, now))
}

func buildSummary(ev store.Event, counts store.EventTicketCountsRow, noShow int32,
	stats []store.EventSlotStatsRow, now int32) summaryBody {
	byStart := make(map[int32]store.EventSlotStatsRow, len(stats))
	for _, s := range stats {
		byStart[s.SlotStart] = s
	}

	starts := app.SlotStarts(ev)
	slots := make([]summarySlot, 0, len(starts))
	for _, start := range starts {
		s := byStart[start]
		end := start + ev.SlotMinutes
		slots = append(slots, summarySlot{
			Start:      app.ClockOf(start),
			End:        app.ClockOf(end),
			Registered: s.Registered,
			Redeemed:   s.Redeemed,
			Capacity:   ev.SlotCapacity,
			Past:       end <= now,
			Current:    start <= now && now < end,
		})
	}

	capacity := int32(len(starts)) * ev.SlotCapacity
	left := capacity - counts.Registered
	if left < 0 {
		left = 0
	}

	return summaryBody{
		Event: app.EventRefOf(ev),
		Totals: summaryTotals{
			Registered: counts.Registered,
			Redeemed:   counts.Redeemed,
			Pending:    counts.Pending,
			Cancelled:  counts.Cancelled,
			NoShow:     noShow,
			Capacity:   capacity,
			Left:       left,
		},
		Slots: slots,
	}
}

func (h *Handler) overview(w http.ResponseWriter, r *http.Request) {
	rows, err := h.deps.Store.EventsOverview(r.Context(), h.deps.Today())
	if err != nil {
		httpx.Internal(w, r)
		return
	}

	events := make([]overviewEvent, 0, len(rows))
	for _, row := range rows {
		// QueueOf hanya butuh tiga kolom ini, jadi tidak perlu memuat event penuh.
		queue := app.QueueOf(store.Event{
			WaitingCount:   row.WaitingCount,
			CounterCount:   row.CounterCount,
			ServiceSeconds: row.ServiceSeconds,
		})
		events = append(events, overviewEvent{
			ID:         row.ID.String(),
			Name:       row.Name,
			Place:      row.Place,
			OpenTime:   app.ClockOf(row.OpenMinutes),
			CloseTime:  app.ClockOf(row.CloseMinutes),
			Registered: row.Registered,
			Redeemed:   row.Redeemed,
			Queue:      queue,
		})
	}

	httpx.OK(w, r, "Data retrieved", map[string]any{"events": events})
}
