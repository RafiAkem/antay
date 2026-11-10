// Package counter melayani petugas loket: daftar event, antrean, cek dan tukar tiket.
package counter

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
)

var (
	ErrInvalidSlots    = errors.New("format slot tidak valid")
	ErrInvalidEventID  = errors.New("eventId tidak valid")
	ErrWrongEvent      = errors.New("tiket milik event lain")
	ErrAlreadyRedeemed = errors.New("tiket sudah ditukar")
	ErrNotBooked       = errors.New("tiket tidak dalam status booked")
)

// InvalidCounterError membawa jumlah loket supaya pesannya bisa menyebut batas.
type InvalidCounterError struct{ Max int32 }

func (e InvalidCounterError) Error() string {
	return fmt.Sprintf("loket harus antara 1 dan %d", e.Max)
}

type Service struct {
	events  event.Repository
	tickets ticket.Repository
	clock   shared.Clock
}

func New(events event.Repository, tickets ticket.Repository, clock shared.Clock) *Service {
	return &Service{events: events, tickets: tickets, clock: clock}
}

func (s *Service) ListEvents(ctx context.Context) ([]event.Availability, error) {
	events, err := s.events.ListByDate(ctx, s.clock.Today())
	if err != nil {
		return nil, err
	}
	ids := make([]uuid.UUID, 0, len(events))
	for _, ev := range events {
		ids = append(ids, ev.ID)
	}
	var rows []event.SlotBooking
	if len(ids) > 0 {
		if rows, err = s.events.SlotBookings(ctx, ids); err != nil {
			return nil, err
		}
	}
	counts := event.OccupiedCounts(rows)
	now := s.clock.Minutes()
	out := make([]event.Availability, 0, len(events))
	for _, ev := range events {
		out = append(out, ev.Availability(counts[ev.ID], now))
	}
	return out, nil
}

type Waiting struct {
	Event   event.Event
	Slots   []int32
	Tickets []ticket.Ticket
}

// Waiting membaca pemegang tiket yang belum ditukar. rawSlots berisi jam
// dipisah koma; bila kosong, dipakai slot yang sedang berjalan dan berikutnya.
func (s *Service) Waiting(ctx context.Context, eventID uuid.UUID, rawSlots string) (Waiting, error) {
	ev, err := s.events.Get(ctx, eventID)
	if err != nil {
		return Waiting{}, err
	}
	starts, err := parseSlots(rawSlots)
	if err != nil {
		return Waiting{}, ErrInvalidSlots
	}
	if len(starts) == 0 {
		starts = ev.WaitingSlots(s.clock.Minutes())
	}
	out := Waiting{Event: ev, Slots: starts, Tickets: []ticket.Ticket{}}
	if len(starts) == 0 {
		return out, nil
	}
	if out.Tickets, err = s.tickets.ListWaiting(ctx, ev.ID, starts); err != nil {
		return Waiting{}, err
	}
	return out, nil
}

func parseSlots(raw string) ([]int32, error) {
	var out []int32
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		minutes, err := shared.MinutesOf(part)
		if err != nil {
			return nil, err
		}
		out = append(out, minutes)
	}
	return out, nil
}

// UpdateQueue menyimpan koreksi antrean; update harus sudah lolos Validate.
func (s *Service) UpdateQueue(ctx context.Context, eventID uuid.UUID, update event.QueueUpdate) (event.Availability, error) {
	ev, err := s.events.UpdateQueue(ctx, eventID, update)
	if err != nil {
		return event.Availability{}, err
	}
	rows, err := s.events.SlotBookings(ctx, []uuid.UUID{ev.ID})
	if err != nil {
		return event.Availability{}, err
	}
	return ev.Availability(event.OccupiedCounts(rows)[ev.ID], s.clock.Minutes()), nil
}

type Check struct {
	Timing          string
	WrongEvent      bool
	AlreadyRedeemed bool
	CanRedeem       bool
}

type Lookup struct {
	Ticket ticket.WithEvent
	Check  Check
}

// Lookup mencari tiket untuk petugas. rawEventID opsional: bila diisi, tiket
// dari event lain ditandai WrongEvent.
func (s *Service) Lookup(ctx context.Context, rawCode, rawEventID string) (Lookup, error) {
	found, err := s.tickets.GetByCode(ctx, ticket.NormalizeStaffCode(rawCode))
	if err != nil {
		return Lookup{}, err
	}
	wrongEvent := false
	if rawEventID != "" {
		id, err := uuid.Parse(rawEventID)
		if err != nil {
			return Lookup{}, ErrInvalidEventID
		}
		wrongEvent = id != found.Ticket.EventID
	}
	t := found.Ticket
	return Lookup{
		Ticket: found,
		Check: Check{
			Timing:          ticket.Timing(s.clock.Minutes(), t.SlotStart, found.Event.SlotMinutes, t.Status),
			WrongEvent:      wrongEvent,
			AlreadyRedeemed: t.Status == ticket.StatusRedeemed,
			CanRedeem:       t.Status == ticket.StatusBooked && !wrongEvent,
		},
	}, nil
}

type RedeemInput struct {
	Code       string
	EventID    uuid.UUID
	Counter    int32
	RedeemedBy uuid.UUID
}

func (s *Service) Redeem(ctx context.Context, in RedeemInput) (ticket.WithEvent, error) {
	code := ticket.NormalizeStaffCode(in.Code)
	found, err := s.tickets.GetByCode(ctx, code)
	if err != nil {
		return ticket.WithEvent{}, err
	}
	if found.Ticket.EventID != in.EventID {
		return ticket.WithEvent{}, ErrWrongEvent
	}
	if in.Counter < 1 || in.Counter > found.Event.CounterCount {
		return ticket.WithEvent{}, InvalidCounterError{Max: found.Event.CounterCount}
	}
	redeemed, err := s.tickets.Redeem(ctx, ticket.Redemption{
		Code:       found.Ticket.Code,
		EventID:    in.EventID,
		Counter:    in.Counter,
		RedeemedBy: in.RedeemedBy,
	})
	if err != nil {
		if errors.Is(err, ticket.ErrNotRedeemable) {
			return ticket.WithEvent{}, s.explainRedeemFailure(ctx, code)
		}
		return ticket.WithEvent{}, err
	}
	return ticket.WithEvent{Ticket: redeemed, Event: found.Event}, nil
}

// Nol baris dari penukaran bisa berarti tiket sudah ditukar atau statusnya bukan
// booked. Membaca ulang membuat pesannya tepat, termasuk saat dua loket
// menukar tiket yang sama hampir bersamaan.
func (s *Service) explainRedeemFailure(ctx context.Context, code string) error {
	found, err := s.tickets.GetByCode(ctx, code)
	if err != nil {
		return err
	}
	if found.Ticket.Status == ticket.StatusRedeemed {
		return ErrAlreadyRedeemed
	}
	return ErrNotBooked
}
