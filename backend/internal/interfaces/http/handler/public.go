package handler

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/booking"
	"github.com/RafiAkem/antay/backend/internal/application/catalog"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const msgEventNotFound = "Event tidak ditemukan."

// Public melayani halaman pengunjung dan papan antrean: tanpa sesi.
type Public struct {
	catalog *catalog.Service
	booking *booking.Service
}

func NewPublic(c *catalog.Service, b *booking.Service) *Public {
	return &Public{catalog: c, booking: b}
}

// internal mencatat penyebab asli di log, tapi klien hanya menerima pesan umum.
// Yang dicatat sengaja cuma error dan trace id supaya nama pengunjung tidak ikut.
func (h *Public) internal(w http.ResponseWriter, r *http.Request, action string, err error) {
	slog.Error("public: "+action, "traceId", response.TraceID(r), "error", err)
	response.Internal(w, r)
}

func (h *Public) ListEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.catalog.ListOpen(r.Context())
	if err != nil {
		h.internal(w, r, "daftar event", err)
		return
	}
	response.OK(w, r, "Data retrieved", map[string]any{"events": dto.EventsOf(events)})
}

func (h *Public) GetEvent(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		response.NotFound(w, r, msgEventNotFound)
		return
	}
	av, err := h.catalog.GetOpen(r.Context(), id)
	if err != nil {
		h.eventError(w, r, err)
		return
	}
	response.OK(w, r, "Data retrieved", map[string]any{"event": dto.EventOf(av)})
}

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
	Event        boardEvent `json:"event"`
	Now          string     `json:"now"`
	Queue        dto.Queue  `json:"queue"`
	CurrentSlot  *dto.Slot  `json:"currentSlot"`
	NextOpenSlot *dto.Slot  `json:"nextOpenSlot"`
	Upcoming     []dto.Slot `json:"upcoming"`
}

func (h *Public) GetBoard(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		response.NotFound(w, r, msgEventNotFound)
		return
	}
	board, err := h.catalog.Board(r.Context(), id)
	if err != nil {
		h.eventError(w, r, err)
		return
	}
	ev := board.Event
	response.OK(w, r, "Data retrieved", boardResponse{
		Event: boardEvent{
			ID:           ev.ID.String(),
			Name:         ev.Name,
			Place:        ev.Place,
			Item:         ev.Item,
			Requirement:  ev.Requirement,
			OpenTime:     shared.ClockOf(ev.OpenMinutes),
			CloseTime:    shared.ClockOf(ev.CloseMinutes),
			SlotMinutes:  ev.SlotMinutes,
			SlotCapacity: ev.SlotCapacity,
			CounterCount: ev.CounterCount,
		},
		Now:          shared.ClockOf(board.Now),
		Queue:        dto.QueueOf(board.Queue),
		CurrentSlot:  dto.SlotPtrOf(board.CurrentSlot),
		NextOpenSlot: dto.SlotPtrOf(board.NextOpenSlot),
		Upcoming:     dto.SlotsOf(board.Upcoming),
	})
}

func (h *Public) eventError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, event.ErrNotFound) {
		response.NotFound(w, r, msgEventNotFound)
		return
	}
	h.internal(w, r, "memuat event", err)
}

type createTicketRequest struct {
	EventID     string `json:"eventId"`
	SlotStart   string `json:"slotStart"`
	VisitorName string `json:"visitorName"`
}

func (h *Public) CreateTicket(w http.ResponseWriter, r *http.Request) {
	var body createTicketRequest
	if err := response.Decode(w, r, &body); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}
	if body.EventID == "" || body.SlotStart == "" {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Event dan slot wajib diisi.")
		return
	}
	name, ok := ticket.NormalizeVisitorName(body.VisitorName)
	if !ok {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION",
			"Nama pengunjung harus 3 sampai 60 karakter.")
		return
	}
	eventID, err := uuid.Parse(body.EventID)
	if err != nil {
		response.NotFound(w, r, msgEventNotFound)
		return
	}

	t, ev, err := h.booking.Book(r.Context(), eventID, body.SlotStart, name)
	switch {
	case err == nil:
		w.Header().Set("Location", "/public/v1/tickets/"+t.Code)
		response.Created(w, r, "Tiket berhasil dibuat.", map[string]any{
			"ticket": dto.TicketOf(t, ev),
		})
	case errors.Is(err, event.ErrNotFound):
		response.NotFound(w, r, msgEventNotFound)
	case errors.Is(err, ticket.ErrEventClosed):
		response.Unprocessable(w, r, "EVENT_CLOSED", "Event sudah tutup hari ini.")
	case errors.Is(err, ticket.ErrSlotPast):
		response.Unprocessable(w, r, "SLOT_PAST", "Slot itu sudah lewat.")
	case errors.Is(err, ticket.ErrSlotInvalid):
		response.Unprocessable(w, r, "SLOT_INVALID", "Slot tidak tersedia untuk event ini.")
	case errors.Is(err, ticket.ErrSlotFull):
		response.FailDetails(w, r, http.StatusUnprocessableEntity, "SLOT_FULL",
			"Slot itu sudah penuh.",
			[]response.ErrorDetail{{Field: "slotStart", Issue: "Sisa kuota 0"}})
	case errors.Is(err, ticket.ErrEventGone):
		response.NotFound(w, r, "Event tidak ditemukan atau sudah ditutup.")
	default:
		h.internal(w, r, "menyimpan tiket", err)
	}
}

func (h *Public) CancelTicket(w http.ResponseWriter, r *http.Request) {
	found, err := h.booking.Cancel(r.Context(), r.PathValue("code"))
	switch {
	case err == nil:
		response.OK(w, r, "Tiket dibatalkan.", map[string]any{
			"ticket": dto.TicketOf(found.Ticket, found.Event),
		})
	case errors.Is(err, ticket.ErrNotFound):
		response.NotFound(w, r, "Kode tiket tidak ditemukan.")
	case errors.Is(err, ticket.ErrNotCancellable):
		response.Conflict(w, r, "Tiket sudah ditukar atau sudah dibatalkan.")
	default:
		h.internal(w, r, "membatalkan tiket", err)
	}
}

func (h *Public) GetTicket(w http.ResponseWriter, r *http.Request) {
	found, err := h.booking.Find(r.Context(), r.PathValue("code"))
	if err != nil {
		if errors.Is(err, ticket.ErrNotFound) {
			response.NotFound(w, r, "Kode tiket tidak ditemukan.")
			return
		}
		h.internal(w, r, "memuat tiket", err)
		return
	}
	response.OK(w, r, "Data retrieved", map[string]any{
		"ticket": dto.TicketOf(found.Ticket, found.Event),
	})
}
