package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

type EventRepo struct {
	q *store.Queries
}

func NewEventRepo(q *store.Queries) *EventRepo { return &EventRepo{q: q} }

func (r *EventRepo) ListOpen(ctx context.Context, date string) ([]event.Event, error) {
	rows, err := r.q.ListOpenEvents(ctx, date)
	if err != nil {
		return nil, err
	}
	return eventsOf(rows), nil
}

func (r *EventRepo) ListByDate(ctx context.Context, date string) ([]event.Event, error) {
	rows, err := r.q.ListEventsForStaff(ctx, date)
	if err != nil {
		return nil, err
	}
	return eventsOf(rows), nil
}

func (r *EventRepo) GetOpen(ctx context.Context, id uuid.UUID) (event.Event, error) {
	return oneEvent(r.q.GetOpenEvent(ctx, id))
}

func (r *EventRepo) Get(ctx context.Context, id uuid.UUID) (event.Event, error) {
	return oneEvent(r.q.GetEvent(ctx, id))
}

func (r *EventRepo) Create(ctx context.Context, ev event.NewEvent) (event.Event, error) {
	row, err := r.q.CreateEvent(ctx, store.CreateEventParams{
		CodePrefix:     ev.CodePrefix,
		Name:           ev.Name,
		Place:          ev.Place,
		Item:           ev.Item,
		Requirement:    ev.Requirement,
		EventDate:      ev.Date,
		OpenMinutes:    ev.OpenMinutes,
		CloseMinutes:   ev.CloseMinutes,
		SlotMinutes:    ev.SlotMinutes,
		SlotCapacity:   ev.SlotCapacity,
		CounterCount:   ev.CounterCount,
		ServiceSeconds: ev.ServiceSeconds,
		Status:         ev.Status,
		CreatedBy:      pgtype.UUID{Bytes: ev.CreatedBy, Valid: true},
	})
	if err != nil {
		if uniqueViolationOn(err, "") {
			return event.Event{}, event.ErrPrefixTaken
		}
		return event.Event{}, err
	}
	return eventOf(row), nil
}

func (r *EventRepo) UpdateQueue(ctx context.Context, id uuid.UUID, update event.QueueUpdate) (event.Event, error) {
	return oneEvent(r.q.UpdateEventQueue(ctx, store.UpdateEventQueueParams{
		WaitingCount: update.WaitingCount,
		CounterCount: update.CounterCount,
		ID:           id,
	}))
}

func (r *EventRepo) SlotBookings(ctx context.Context, ids []uuid.UUID) ([]event.SlotBooking, error) {
	rows, err := r.q.EventSlotBookings(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]event.SlotBooking, 0, len(rows))
	for _, row := range rows {
		out = append(out, event.SlotBooking{
			EventID:   row.EventID,
			SlotStart: row.SlotStart,
			Booked:    row.Booked,
			Redeemed:  row.Redeemed,
		})
	}
	return out, nil
}

func oneEvent(row store.Event, err error) (event.Event, error) {
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return event.Event{}, event.ErrNotFound
		}
		return event.Event{}, err
	}
	return eventOf(row), nil
}
