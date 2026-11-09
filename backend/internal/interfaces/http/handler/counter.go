package handler

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/counter"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const msgTicketNotFound = "Tiket dengan kode itu tidak ditemukan."

// Counter melayani petugas loket.
type Counter struct {
	counter *counter.Service
}

func NewCounter(c *counter.Service) *Counter { return &Counter{counter: c} }

func (h *Counter) ListEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.counter.ListEvents(r.Context())
	if err != nil {
		response.Internal(w, r)
		return
	}
	response.OK(w, r, "Daftar event hari ini.", map[string]any{"events": dto.EventsOf(events)})
}

func (h *Counter) ListWaiting(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		response.NotFound(w, r, msgEventNotFound)
		return
	}
	waiting, err := h.counter.Waiting(r.Context(), id, r.URL.Query().Get("slot"))
	switch {
	case errors.Is(err, event.ErrNotFound):
		response.NotFound(w, r, msgEventNotFound)
		return
	case errors.Is(err, counter.ErrInvalidSlots):
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Format slot tidak valid.",
			[]response.ErrorDetail{{Field: "slot", Issue: "gunakan HH:MM dan pisahkan dengan koma"}})
		return
	case err != nil:
		response.Internal(w, r)
		return
	}

	tickets := make([]dto.Ticket, 0, len(waiting.Tickets))
	for _, t := range waiting.Tickets {
		tickets = append(tickets, dto.TicketOf(t, waiting.Event))
	}
	slots := make([]string, 0, len(waiting.Slots))
	for _, start := range waiting.Slots {
		slots = append(slots, shared.ClockOf(start))
	}
	response.OK(w, r, "Daftar pemegang tiket.", map[string]any{
		"tickets": tickets,
		"slots":   slots,
	})
}

type updateQueueRequest struct {
	WaitingCount *int32 `json:"waitingCount"`
	CounterCount *int32 `json:"counterCount"`
}

func (h *Counter) UpdateQueue(w http.ResponseWriter, r *http.Request) {
	var req updateQueueRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}
	update := event.QueueUpdate{WaitingCount: req.WaitingCount, CounterCount: req.CounterCount}
	if update.Empty() {
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Isi minimal satu field.",
			[]response.ErrorDetail{{Field: "body", Issue: "waitingCount atau counterCount wajib diisi"}})
		return
	}
	if issues := update.Validate(); len(issues) > 0 {
		response.FailDetails(w, r, http.StatusUnprocessableEntity, "INVALID_QUEUE",
			"Periksa kembali angka antrean.", dto.FieldDetails(issues))
		return
	}
	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		response.NotFound(w, r, msgEventNotFound)
		return
	}

	av, err := h.counter.UpdateQueue(r.Context(), id, update)
	if err != nil {
		if errors.Is(err, event.ErrNotFound) {
			response.NotFound(w, r, msgEventNotFound)
			return
		}
		response.Internal(w, r)
		return
	}
	response.OK(w, r, "Antrean diperbarui.", map[string]any{"event": dto.EventOf(av)})
}

type ticketCheck struct {
	Timing          string `json:"timing"`
	WrongEvent      bool   `json:"wrongEvent"`
	AlreadyRedeemed bool   `json:"alreadyRedeemed"`
	CanRedeem       bool   `json:"canRedeem"`
}

func (h *Counter) LookupTicket(w http.ResponseWriter, r *http.Request) {
	found, err := h.counter.Lookup(r.Context(), r.PathValue("code"), r.URL.Query().Get("eventId"))
	switch {
	case errors.Is(err, ticket.ErrNotFound):
		response.NotFound(w, r, msgTicketNotFound)
		return
	case errors.Is(err, counter.ErrInvalidEventID):
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "eventId tidak valid.",
			[]response.ErrorDetail{{Field: "eventId", Issue: "harus UUID"}})
		return
	case err != nil:
		response.Internal(w, r)
		return
	}
	response.OK(w, r, "Tiket ditemukan.", map[string]any{
		"ticket": dto.TicketOf(found.Ticket.Ticket, found.Ticket.Event),
		"check": ticketCheck{
			Timing:          found.Check.Timing,
			WrongEvent:      found.Check.WrongEvent,
			AlreadyRedeemed: found.Check.AlreadyRedeemed,
			CanRedeem:       found.Check.CanRedeem,
		},
	})
}

type redeemRequest struct {
	EventID    string `json:"eventId"`
	Counter    int32  `json:"counter"`
	KTPChecked bool   `json:"ktpChecked"`
}

func (h *Counter) RedeemTicket(w http.ResponseWriter, r *http.Request) {
	var req redeemRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}
	if !req.KTPChecked {
		response.Unprocessable(w, r, "KTP_REQUIRED", "KTP harus diperiksa dan dicentang dulu.")
		return
	}
	eventID, err := uuid.Parse(req.EventID)
	if err != nil {
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "eventId tidak valid.",
			[]response.ErrorDetail{{Field: "eventId", Issue: "harus UUID"}})
		return
	}
	session, ok := middleware.SessionFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return
	}

	redeemed, err := h.counter.Redeem(r.Context(), counter.RedeemInput{
		Code:       r.PathValue("code"),
		EventID:    eventID,
		Counter:    req.Counter,
		RedeemedBy: session.UserID,
	})
	var badCounter counter.InvalidCounterError
	switch {
	case err == nil:
		response.OK(w, r, "Tiket berhasil ditukar.", map[string]any{
			"ticket": dto.TicketOf(redeemed.Ticket, redeemed.Event),
		})
	case errors.Is(err, ticket.ErrNotFound):
		response.NotFound(w, r, msgTicketNotFound)
	case errors.Is(err, counter.ErrWrongEvent):
		response.Fail(w, r, http.StatusConflict, "WRONG_EVENT", "Tiket ini milik event lain.")
	case errors.As(err, &badCounter):
		response.Fail(w, r, http.StatusUnprocessableEntity, "INVALID_COUNTER",
			fmt.Sprintf("Loket harus antara 1 dan %d.", badCounter.Max))
	case errors.Is(err, counter.ErrAlreadyRedeemed):
		response.Fail(w, r, http.StatusConflict, "ALREADY_REDEEMED", "Tiket ini sudah ditukar.")
	case errors.Is(err, counter.ErrNotBooked):
		response.Fail(w, r, http.StatusConflict, "NOT_BOOKED", "Tiket ini tidak dalam status yang bisa ditukar.")
	default:
		response.Internal(w, r)
	}
}
