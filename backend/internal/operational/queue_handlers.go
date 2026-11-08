package operational

import (
	"errors"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (h *Handler) listWaiting(w http.ResponseWriter, r *http.Request) {
	ev, ok := h.eventFromPath(w, r)
	if !ok {
		return
	}

	starts, err := parseSlots(r.URL.Query().Get("slot"))
	if err != nil {
		httpx.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Format slot tidak valid.",
			[]httpx.ErrorDetail{{Field: "slot", Issue: "gunakan HH:MM dan pisahkan dengan koma"}})
		return
	}
	if len(starts) == 0 {
		starts = waitingSlots(app.SlotStarts(ev), h.deps.NowMinutes(), ev.SlotMinutes)
	}

	ticketsOut := make([]app.TicketDTO, 0)
	slotsOut := make([]string, 0, len(starts))
	if len(starts) > 0 {
		tickets, err := h.deps.Store.ListWaitingTickets(r.Context(), store.ListWaitingTicketsParams{
			EventID:    ev.ID,
			SlotStarts: starts,
		})
		if err != nil {
			httpx.Internal(w, r)
			return
		}
		for _, t := range tickets {
			ticketsOut = append(ticketsOut, app.BuildTicket(t, ev))
		}
		for _, start := range starts {
			slotsOut = append(slotsOut, app.ClockOf(start))
		}
	}

	httpx.OK(w, r, "Daftar pemegang tiket.", map[string]any{
		"tickets": ticketsOut,
		"slots":   slotsOut,
	})
}

type updateQueueRequest struct {
	WaitingCount *int32 `json:"waitingCount"`
	CounterCount *int32 `json:"counterCount"`
}

func (h *Handler) updateQueue(w http.ResponseWriter, r *http.Request) {
	var req updateQueueRequest
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}
	if req.WaitingCount == nil && req.CounterCount == nil {
		httpx.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Isi minimal satu field.",
			[]httpx.ErrorDetail{{Field: "body", Issue: "waitingCount atau counterCount wajib diisi"}})
		return
	}
	var details []httpx.ErrorDetail
	if req.WaitingCount != nil && *req.WaitingCount < 0 {
		details = append(details, httpx.ErrorDetail{Field: "waitingCount", Issue: "tidak boleh negatif"})
	}
	if req.CounterCount != nil && (*req.CounterCount < 1 || *req.CounterCount > 20) {
		details = append(details, httpx.ErrorDetail{Field: "counterCount", Issue: "harus antara 1 dan 20"})
	}
	if len(details) > 0 {
		httpx.FailDetails(w, r, http.StatusUnprocessableEntity, "INVALID_QUEUE", "Periksa kembali angka antrean.", details)
		return
	}

	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		httpx.NotFound(w, r, "Event tidak ditemukan.")
		return
	}

	ev, err := h.deps.Store.UpdateEventQueue(r.Context(), store.UpdateEventQueueParams{
		WaitingCount: req.WaitingCount,
		CounterCount: req.CounterCount,
		ID:           id,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Event tidak ditemukan.")
			return
		}
		httpx.Internal(w, r)
		return
	}

	counts, err := h.deps.Store.EventSlotBookings(r.Context(), []uuid.UUID{ev.ID})
	if err != nil {
		httpx.Internal(w, r)
		return
	}
	httpx.OK(w, r, "Antrean diperbarui.", map[string]any{
		"event": app.BuildEvent(ev, groupCounts(counts)[ev.ID], h.deps.NowMinutes()),
	})
}
