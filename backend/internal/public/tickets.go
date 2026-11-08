package public

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type createTicketRequest struct {
	EventID     string `json:"eventId"`
	SlotStart   string `json:"slotStart"`
	VisitorName string `json:"visitorName"`
}

func (h *Handler) createTicket(w http.ResponseWriter, r *http.Request) {
	var body createTicketRequest
	if err := httpx.Decode(w, r, &body); err != nil {
		httpx.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}
	if body.EventID == "" || body.SlotStart == "" {
		httpx.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Event dan slot wajib diisi.")
		return
	}
	name, ok := normalizeVisitorName(body.VisitorName)
	if !ok {
		httpx.Fail(w, r, http.StatusBadRequest, "VALIDATION",
			"Nama pengunjung harus 3 sampai 60 karakter.")
		return
	}
	eventID, err := uuid.Parse(body.EventID)
	if err != nil {
		httpx.NotFound(w, r, "Event tidak ditemukan.")
		return
	}
	ev, err := h.deps.Store.GetOpenEvent(r.Context(), eventID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Event tidak ditemukan.")
			return
		}
		h.internal(w, r, "memuat event", err)
		return
	}
	if ev.EventDate != h.deps.Today() {
		httpx.Unprocessable(w, r, "EVENT_CLOSED", "Event sudah tutup hari ini.")
		return
	}
	slotStart, err := parseSlot(ev, body.SlotStart, h.deps.NowMinutes())
	if err != nil {
		if errors.Is(err, errSlotPast) {
			httpx.Unprocessable(w, r, "SLOT_PAST", "Slot itu sudah lewat.")
			return
		}
		httpx.Unprocessable(w, r, "SLOT_INVALID", "Slot tidak tersedia untuk event ini.")
		return
	}

	ticket, err := h.insertTicket(r.Context(), ev, name, slotStart)
	switch {
	case err == nil:
		w.Header().Set("Location", "/public/v1/tickets/"+ticket.Code)
		httpx.Created(w, r, "Tiket berhasil dibuat.", map[string]any{
			"ticket": app.BuildTicket(ticket, ev),
		})
	case errors.Is(err, errSlotFull):
		httpx.FailDetails(w, r, http.StatusUnprocessableEntity, "SLOT_FULL",
			"Slot itu sudah penuh.",
			[]httpx.ErrorDetail{{Field: "slotStart", Issue: "Sisa kuota 0"}})
	case errors.Is(err, errEventGone):
		httpx.NotFound(w, r, "Event tidak ditemukan atau sudah ditutup.")
	default:
		h.internal(w, r, "menyimpan tiket", err)
	}
}

// insertTicket mencoba beberapa kode sebelum menyerah. Setiap percobaan memakai
// transaksi baru supaya unique violation tidak membuat transaksi berikutnya
// ikut batal; bentrokan kode memang jarang, jadi mengulang dari awal murah.
func (h *Handler) insertTicket(ctx context.Context, ev store.Event, name string, slotStart int32) (store.Ticket, error) {
	var lastErr error
	for i := 0; i < maxCodeAttempts; i++ {
		code, err := newTicketCode(ev.CodePrefix)
		if err != nil {
			return store.Ticket{}, err
		}
		ticket, err := h.insertTicketOnce(ctx, ev, code, name, slotStart)
		if err == nil {
			return ticket, nil
		}
		if !isDuplicateCode(err) {
			return store.Ticket{}, err
		}
		lastErr = err
	}
	return store.Ticket{}, fmt.Errorf("kode tiket bentrok %d kali: %w", maxCodeAttempts, lastErr)
}

func (h *Handler) insertTicketOnce(ctx context.Context, ev store.Event, code, name string, slotStart int32) (store.Ticket, error) {
	tx, err := h.deps.Pool.Begin(ctx)
	if err != nil {
		return store.Ticket{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := h.deps.Store.WithTx(tx)
	// Kunci baris event menahan pemesan lain di slot yang sama, sehingga hitung
	// kuota dan insert di bawahnya tidak bisa saling mendahului.
	if _, err := q.LockEvent(ctx, ev.ID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return store.Ticket{}, errEventGone
		}
		return store.Ticket{}, err
	}
	booked, err := q.CountSlotBookings(ctx, store.CountSlotBookingsParams{
		EventID:   ev.ID,
		SlotStart: slotStart,
	})
	if err != nil {
		return store.Ticket{}, err
	}
	if booked >= ev.SlotCapacity {
		return store.Ticket{}, errSlotFull
	}
	ticket, err := q.CreateTicket(ctx, store.CreateTicketParams{
		Code:        code,
		EventID:     ev.ID,
		VisitorName: name,
		SlotStart:   slotStart,
	})
	if err != nil {
		return store.Ticket{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return store.Ticket{}, err
	}
	return ticket, nil
}

func (h *Handler) getTicket(w http.ResponseWriter, r *http.Request) {
	code := normalizeTicketCode(r.PathValue("code"))
	row, err := h.deps.Store.GetTicketByCode(r.Context(), code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Kode tiket tidak ditemukan.")
			return
		}
		h.internal(w, r, "memuat tiket", err)
		return
	}
	httpx.OK(w, r, "Data retrieved", map[string]any{"ticket": ticketDTOOf(row)})
}
