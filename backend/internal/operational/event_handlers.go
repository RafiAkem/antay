package operational

import (
	"errors"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/auth"
	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

func (h *Handler) listEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.deps.Store.ListEventsForStaff(r.Context(), h.deps.Today())
	if err != nil {
		httpx.Internal(w, r)
		return
	}

	ids := make([]uuid.UUID, 0, len(events))
	for _, ev := range events {
		ids = append(ids, ev.ID)
	}
	var rows []store.EventSlotBookingsRow
	if len(ids) > 0 {
		rows, err = h.deps.Store.EventSlotBookings(r.Context(), ids)
		if err != nil {
			httpx.Internal(w, r)
			return
		}
	}

	grouped := groupCounts(rows)
	now := h.deps.NowMinutes()
	out := make([]app.EventDTO, 0, len(events))
	for _, ev := range events {
		out = append(out, app.BuildEvent(ev, grouped[ev.ID], now))
	}
	httpx.OK(w, r, "Daftar event hari ini.", map[string]any{"events": out})
}

func (h *Handler) createEvent(w http.ResponseWriter, r *http.Request) {
	var req createEventRequest
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}

	v := validateEventInput(req)
	if len(v.fieldErrors) > 0 {
		httpx.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Periksa kembali isian event.", v.fieldErrors)
		return
	}
	if len(v.rangeErrors) > 0 {
		httpx.FailDetails(w, r, http.StatusUnprocessableEntity, "INVALID_SCHEDULE", "Angka jadwal di luar batas.", v.rangeErrors)
		return
	}
	if v.scheduleIssue != "" {
		httpx.Unprocessable(w, r, "INVALID_SCHEDULE", v.scheduleIssue)
		return
	}

	claims, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Unauthorized(w, r, "Sesi tidak ditemukan. Masuk dulu.")
		return
	}

	ev, err := h.deps.Store.CreateEvent(r.Context(), store.CreateEventParams{
		CodePrefix:     codePrefix(v.fields.name),
		Name:           v.fields.name,
		Place:          v.fields.place,
		Item:           v.fields.item,
		Requirement:    v.fields.requirement,
		EventDate:      h.deps.Today(),
		OpenMinutes:    v.fields.openMinutes,
		CloseMinutes:   v.fields.closeMinutes,
		SlotMinutes:    v.fields.slotMinutes,
		SlotCapacity:   v.fields.slotCapacity,
		CounterCount:   v.fields.counterCount,
		ServiceSeconds: v.fields.serviceSeconds,
		Status:         "open",
		CreatedBy:      pgtype.UUID{Bytes: claims.UserID, Valid: true},
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			httpx.Conflict(w, r, "Prefix event untuk tanggal ini sudah dipakai. Pilih nama lain.")
			return
		}
		httpx.Internal(w, r)
		return
	}

	httpx.Created(w, r, "Event dibuat.", map[string]any{
		"event": app.BuildEvent(ev, nil, h.deps.NowMinutes()),
	})
}

func (h *Handler) eventFromPath(w http.ResponseWriter, r *http.Request) (store.Event, bool) {
	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		httpx.NotFound(w, r, "Event tidak ditemukan.")
		return store.Event{}, false
	}
	ev, err := h.deps.Store.GetEvent(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Event tidak ditemukan.")
			return store.Event{}, false
		}
		httpx.Internal(w, r)
		return store.Event{}, false
	}
	return ev, true
}
