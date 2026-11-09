// Package reporting melayani dasbor manajemen mal. Datanya dibaca lewat
// ReadModel, bukan aggregate, karena isinya agregat lintas tiket.
package reporting

import (
	"context"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

type TicketTotals struct {
	Registered int32
	Redeemed   int32
	Pending    int32
	Cancelled  int32
}

type SlotStat struct {
	SlotStart  int32
	Registered int32
	Redeemed   int32
}

type OverviewRow struct {
	ID             uuid.UUID
	Name           string
	Place          string
	OpenMinutes    int32
	CloseMinutes   int32
	CounterCount   int32
	ServiceSeconds int32
	WaitingCount   int32
	Registered     int32
	Redeemed       int32
}

type ReadModel interface {
	TicketTotals(ctx context.Context, eventID uuid.UUID) (TicketTotals, error)
	NoShowCount(ctx context.Context, eventID uuid.UUID, nowMinutes int32) (int32, error)
	SlotStats(ctx context.Context, eventID uuid.UUID) ([]SlotStat, error)
	Overview(ctx context.Context, date string) ([]OverviewRow, error)
}

type Service struct {
	events event.Repository
	read   ReadModel
	clock  shared.Clock
}

func New(events event.Repository, read ReadModel, clock shared.Clock) *Service {
	return &Service{events: events, read: read, clock: clock}
}

type Totals struct {
	TicketTotals
	NoShow   int32
	Capacity int32
	Left     int32
}

type SummarySlot struct {
	Start      int32
	End        int32
	Registered int32
	Redeemed   int32
	Capacity   int32
	Past       bool
	Current    bool
}

type Summary struct {
	Event  event.Event
	Totals Totals
	Slots  []SummarySlot
}

// Summary mengembalikan event.ErrNotFound bila event tidak ada.
func (s *Service) Summary(ctx context.Context, eventID uuid.UUID) (Summary, error) {
	ev, err := s.events.Get(ctx, eventID)
	if err != nil {
		return Summary{}, err
	}
	now := s.clock.Minutes()
	totals, err := s.read.TicketTotals(ctx, eventID)
	if err != nil {
		return Summary{}, err
	}
	noShow, err := s.read.NoShowCount(ctx, eventID, now)
	if err != nil {
		return Summary{}, err
	}
	stats, err := s.read.SlotStats(ctx, eventID)
	if err != nil {
		return Summary{}, err
	}
	return buildSummary(ev, totals, noShow, stats, now), nil
}

// buildSummary memakai SlotStarts, bukan baris tiket, supaya slot kosong tetap
// tampil dan penyebut kapasitas tidak ikut mengecil.
func buildSummary(ev event.Event, totals TicketTotals, noShow int32, stats []SlotStat, now int32) Summary {
	byStart := make(map[int32]SlotStat, len(stats))
	for _, st := range stats {
		byStart[st.SlotStart] = st
	}

	starts := ev.SlotStarts()
	slots := make([]SummarySlot, 0, len(starts))
	for _, start := range starts {
		st := byStart[start]
		end := start + ev.SlotMinutes
		slots = append(slots, SummarySlot{
			Start:      start,
			End:        end,
			Registered: st.Registered,
			Redeemed:   st.Redeemed,
			Capacity:   ev.SlotCapacity,
			Past:       end <= now,
			Current:    start <= now && now < end,
		})
	}

	capacity := int32(len(starts)) * ev.SlotCapacity
	left := capacity - totals.Registered
	if left < 0 {
		left = 0
	}
	return Summary{
		Event:  ev,
		Totals: Totals{TicketTotals: totals, NoShow: noShow, Capacity: capacity, Left: left},
		Slots:  slots,
	}
}

type OverviewEvent struct {
	OverviewRow
	Queue event.Queue
}

func (s *Service) Overview(ctx context.Context) ([]OverviewEvent, error) {
	rows, err := s.read.Overview(ctx, s.clock.Today())
	if err != nil {
		return nil, err
	}
	out := make([]OverviewEvent, 0, len(rows))
	for _, row := range rows {
		// Queue hanya butuh tiga kolom ini, jadi tidak perlu memuat event penuh.
		queue := event.Event{
			WaitingCount:   row.WaitingCount,
			CounterCount:   row.CounterCount,
			ServiceSeconds: row.ServiceSeconds,
		}.Queue()
		out = append(out, OverviewEvent{OverviewRow: row, Queue: queue})
	}
	return out, nil
}
