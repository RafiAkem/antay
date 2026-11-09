// Package catalog melayani pengunjung yang melihat event dan papan antrean.
package catalog

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

const maxUpcomingSlots = 4

type Service struct {
	events event.Repository
	clock  shared.Clock
}

func New(events event.Repository, clock shared.Clock) *Service {
	return &Service{events: events, clock: clock}
}

func (s *Service) ListOpen(ctx context.Context) ([]event.Availability, error) {
	events, err := s.events.ListOpen(ctx, s.clock.Today())
	if err != nil {
		return nil, fmt.Errorf("memuat daftar event: %w", err)
	}
	ids := make([]uuid.UUID, 0, len(events))
	for _, ev := range events {
		ids = append(ids, ev.ID)
	}
	counts, err := s.occupied(ctx, ids)
	if err != nil {
		return nil, err
	}
	now := s.clock.Minutes()
	out := make([]event.Availability, 0, len(events))
	for _, ev := range events {
		out = append(out, ev.Availability(counts[ev.ID], now))
	}
	return out, nil
}

// GetOpen mengembalikan event.ErrNotFound bila event tidak ada atau belum dibuka.
func (s *Service) GetOpen(ctx context.Context, id uuid.UUID) (event.Availability, error) {
	ev, err := s.events.GetOpen(ctx, id)
	if err != nil {
		return event.Availability{}, err
	}
	counts, err := s.occupied(ctx, []uuid.UUID{id})
	if err != nil {
		return event.Availability{}, err
	}
	return ev.Availability(counts[id], s.clock.Minutes()), nil
}

type Board struct {
	Event        event.Event
	Now          int32
	Queue        event.Queue
	CurrentSlot  *event.SlotState
	NextOpenSlot *event.SlotState
	Upcoming     []event.SlotState
}

func (s *Service) Board(ctx context.Context, id uuid.UUID) (Board, error) {
	ev, err := s.events.GetOpen(ctx, id)
	if err != nil {
		return Board{}, err
	}
	counts, err := s.occupied(ctx, []uuid.UUID{id})
	if err != nil {
		return Board{}, err
	}
	now := s.clock.Minutes()
	return buildBoard(ev.Availability(counts[id], now), now), nil
}

func buildBoard(av event.Availability, now int32) Board {
	upcoming := make([]event.SlotState, 0, maxUpcomingSlots)
	for _, slot := range av.Slots {
		if !slot.Past && slot.Left > 0 && len(upcoming) < maxUpcomingSlots {
			upcoming = append(upcoming, slot)
		}
	}
	// Kalau semua slot tersisa sudah penuh, papan tetap menampilkan jadwal
	// berikutnya supaya pengunjung tahu harus menunggu sampai jam berapa.
	if len(upcoming) == 0 {
		for _, slot := range av.Slots {
			if slot.Past {
				continue
			}
			upcoming = append(upcoming, slot)
			if len(upcoming) == maxUpcomingSlots {
				break
			}
		}
	}

	board := Board{Event: av.Event, Now: now, Queue: av.Event.Queue(), Upcoming: upcoming}
	for i := range av.Slots {
		slot := av.Slots[i]
		if slot.Current {
			board.CurrentSlot = &slot
		}
		if board.NextOpenSlot == nil && !slot.Past && !slot.Current && slot.Left > 0 {
			board.NextOpenSlot = &slot
		}
	}
	return board
}

func (s *Service) occupied(ctx context.Context, ids []uuid.UUID) (event.Counts, error) {
	if len(ids) == 0 {
		return event.Counts{}, nil
	}
	rows, err := s.events.SlotBookings(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("memuat isi slot: %w", err)
	}
	return event.OccupiedCounts(rows), nil
}
