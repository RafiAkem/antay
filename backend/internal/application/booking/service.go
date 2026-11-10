// Package booking melayani pengunjung yang memesan dan melihat tiketnya.
package booking

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
)

const maxCodeAttempts = 5

type Service struct {
	events  event.Repository
	tickets ticket.Repository
	clock   shared.Clock
}

func New(events event.Repository, tickets ticket.Repository, clock shared.Clock) *Service {
	return &Service{events: events, tickets: tickets, clock: clock}
}

// Book memesan satu slot. visitorName harus sudah lolos ticket.NormalizeVisitorName.
func (s *Service) Book(ctx context.Context, eventID uuid.UUID, slotRaw, visitorName string) (ticket.Ticket, event.Event, error) {
	ev, err := s.events.GetOpen(ctx, eventID)
	if err != nil {
		return ticket.Ticket{}, event.Event{}, err
	}
	if ev.Date != s.clock.Today() {
		return ticket.Ticket{}, ev, ticket.ErrEventClosed
	}
	slotStart, err := ticket.ParseSlot(ev, slotRaw, s.clock.Minutes())
	if err != nil {
		return ticket.Ticket{}, ev, err
	}
	t, err := s.bookWithFreshCode(ctx, ev, visitorName, slotStart)
	return t, ev, err
}

// bookWithFreshCode mencoba beberapa kode sebelum menyerah. Bentrokan kode
// memang jarang, jadi mengulang dari awal murah.
func (s *Service) bookWithFreshCode(ctx context.Context, ev event.Event, name string, slotStart int32) (ticket.Ticket, error) {
	var lastErr error
	for i := 0; i < maxCodeAttempts; i++ {
		code, err := ticket.NewCode(ev.CodePrefix)
		if err != nil {
			return ticket.Ticket{}, err
		}
		t, err := s.tickets.Book(ctx, ticket.Booking{
			EventID:      ev.ID,
			SlotCapacity: ev.SlotCapacity,
			SlotStart:    slotStart,
			Code:         code,
			VisitorName:  name,
		})
		if err == nil {
			return t, nil
		}
		if !errors.Is(err, ticket.ErrDuplicateCode) {
			return ticket.Ticket{}, err
		}
		lastErr = err
	}
	return ticket.Ticket{}, fmt.Errorf("kode tiket bentrok %d kali: %w", maxCodeAttempts, lastErr)
}

// Cancel membatalkan tiket yang belum ditukar, sehingga tempatnya di slot bisa
// dipesan orang lain. Pengunjung tidak punya akun, jadi memegang kode = pemilik.
// Mengembalikan ticket.ErrNotFound atau ticket.ErrNotCancellable.
func (s *Service) Cancel(ctx context.Context, rawCode string) (ticket.WithEvent, error) {
	found, err := s.Find(ctx, rawCode)
	if err != nil {
		return ticket.WithEvent{}, err
	}
	if found.Ticket.Status != ticket.StatusBooked {
		return found, ticket.ErrNotCancellable
	}
	if err := s.tickets.Cancel(ctx, found.Ticket.Code); err != nil {
		return found, err
	}
	found.Ticket.Status = ticket.StatusCancelled
	return found, nil
}

// Find mengembalikan ticket.ErrNotFound bila kode tidak dikenal.
func (s *Service) Find(ctx context.Context, rawCode string) (ticket.WithEvent, error) {
	return s.tickets.GetByCode(ctx, ticket.NormalizeVisitorCode(rawCode))
}
