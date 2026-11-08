package public

import (
	"errors"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const maxUpcomingSlots = 4

type boardEvent struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Place        string `json:"place"`
	Item         string `json:"item"`
	Requirement  string `json:"requirement"`
	OpenTime     string `json:"openTime"`
	CloseTime    string `json:"closeTime"`
	SlotMinutes  int32  `json:"slotMinutes"`
	SlotCapacity int32  `json:"slotCapacity"`
	CounterCount int32  `json:"counterCount"`
}

type boardResponse struct {
	Event        boardEvent    `json:"event"`
	Now          string        `json:"now"`
	Queue        app.QueueDTO  `json:"queue"`
	CurrentSlot  *app.SlotDTO  `json:"currentSlot"`
	NextOpenSlot *app.SlotDTO  `json:"nextOpenSlot"`
	Upcoming     []app.SlotDTO `json:"upcoming"`
}

func (h *Handler) listEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.deps.Store.ListOpenEvents(r.Context(), h.deps.Today())
	if err != nil {
		h.internal(w, r, "memuat daftar event", err)
		return
	}
	ids := make([]uuid.UUID, 0, len(events))
	for _, ev := range events {
		ids = append(ids, ev.ID)
	}
	counts, err := h.slotCounts(r.Context(), ids)
	if err != nil {
		h.internal(w, r, "memuat isi slot", err)
		return
	}
	now := h.deps.NowMinutes()
	out := make([]app.EventDTO, 0, len(events))
	for _, ev := range events {
		out = append(out, app.BuildEvent(ev, counts[ev.ID], now))
	}
	httpx.OK(w, r, "Data retrieved", map[string]any{"events": out})
}

func (h *Handler) getEvent(w http.ResponseWriter, r *http.Request) {
	id, ok := eventIDFrom(r)
	if !ok {
		httpx.NotFound(w, r, "Event tidak ditemukan.")
		return
	}
	ev, err := h.deps.Store.GetOpenEvent(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Event tidak ditemukan.")
			return
		}
		h.internal(w, r, "memuat event", err)
		return
	}
	counts, err := h.slotCounts(r.Context(), []uuid.UUID{id})
	if err != nil {
		h.internal(w, r, "memuat isi slot", err)
		return
	}
	httpx.OK(w, r, "Data retrieved", map[string]any{
		"event": app.BuildEvent(ev, counts[id], h.deps.NowMinutes()),
	})
}

func (h *Handler) getBoard(w http.ResponseWriter, r *http.Request) {
	id, ok := eventIDFrom(r)
	if !ok {
		httpx.NotFound(w, r, "Event tidak ditemukan.")
		return
	}
	ev, err := h.deps.Store.GetOpenEvent(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Event tidak ditemukan.")
			return
		}
		h.internal(w, r, "memuat event", err)
		return
	}
	counts, err := h.slotCounts(r.Context(), []uuid.UUID{id})
	if err != nil {
		h.internal(w, r, "memuat isi slot", err)
		return
	}

	now := h.deps.NowMinutes()
	dto := app.BuildEvent(ev, counts[id], now)
	upcoming := make([]app.SlotDTO, 0, maxUpcomingSlots)
	for _, slot := range dto.Slots {
		if slot.Past {
			continue
		}
		if slot.Left > 0 && len(upcoming) < maxUpcomingSlots {
			upcoming = append(upcoming, slot)
		}
	}
	// Kalau semua slot tersisa sudah penuh, papan tetap menampilkan jadwal
	// berikutnya supaya pengunjung tahu harus menunggu sampai jam berapa.
	if len(upcoming) == 0 {
		for _, slot := range dto.Slots {
			if slot.Past {
				continue
			}
			upcoming = append(upcoming, slot)
			if len(upcoming) == maxUpcomingSlots {
				break
			}
		}
	}

	resp := boardResponse{
		Event: boardEvent{
			ID:           ev.ID.String(),
			Name:         ev.Name,
			Place:        ev.Place,
			Item:         ev.Item,
			Requirement:  ev.Requirement,
			OpenTime:     app.ClockOf(ev.OpenMinutes),
			CloseTime:    app.ClockOf(ev.CloseMinutes),
			SlotMinutes:  ev.SlotMinutes,
			SlotCapacity: ev.SlotCapacity,
			CounterCount: ev.CounterCount,
		},
		Now:      app.ClockOf(now),
		Queue:    app.QueueOf(ev),
		Upcoming: upcoming,
	}
	for i := range dto.Slots {
		slot := dto.Slots[i]
		if slot.Current {
			resp.CurrentSlot = &slot
		}
		if resp.NextOpenSlot == nil && !slot.Past && !slot.Current && slot.Left > 0 {
			resp.NextOpenSlot = &slot
		}
	}
	httpx.OK(w, r, "Data retrieved", resp)
}

func eventIDFrom(r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(r.PathValue("eventId"))
	return id, err == nil
}
