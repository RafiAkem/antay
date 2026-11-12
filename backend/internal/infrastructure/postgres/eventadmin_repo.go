package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

// EventAdminRepo melayani eventadmin.Repository. pool dipakai hanya untuk
// transaksi hapus event; sisanya cukup lewat q.
type EventAdminRepo struct {
	pool *pgxpool.Pool
	q    *store.Queries
}

func NewEventAdminRepo(pool *pgxpool.Pool, q *store.Queries) *EventAdminRepo {
	return &EventAdminRepo{pool: pool, q: q}
}

var _ eventadmin.Repository = (*EventAdminRepo)(nil)

// manageScope: nil (admin) jadi NULL di SQL, sehingga filter organizer mati.
func manageScope(scope *uuid.UUID) pgtype.UUID {
	if scope == nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: *scope, Valid: true}
}

func manageTime(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

func manageOf(e store.Event) eventadmin.Managed {
	return eventadmin.Managed{
		Event:       eventOf(e),
		SubmittedAt: timePtr(e.SubmittedAt),
		PublishedAt: timePtr(e.PublishedAt),
	}
}

func manageOne(row store.Event, err error) (eventadmin.Managed, error) {
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return eventadmin.Managed{}, event.ErrNotFound
		}
		if uniqueViolationOn(err, "events_prefix_date_key") {
			return eventadmin.Managed{}, event.ErrPrefixTaken
		}
		return eventadmin.Managed{}, err
	}
	return manageOf(row), nil
}

func (r *EventAdminRepo) ListEvents(ctx context.Context, scope *uuid.UUID, status *string) ([]eventadmin.Managed, error) {
	rows, err := r.q.ManageListEvents(ctx, store.ManageListEventsParams{
		Status:      status,
		OrganizerID: manageScope(scope),
	})
	if err != nil {
		return nil, err
	}
	out := make([]eventadmin.Managed, 0, len(rows))
	for _, row := range rows {
		m := manageOf(row.Event)
		m.OrganizerName = row.OrganizerName
		out = append(out, m)
	}
	return out, nil
}

func (r *EventAdminRepo) GetEvent(ctx context.Context, scope *uuid.UUID, id uuid.UUID) (eventadmin.Managed, error) {
	return manageOne(r.q.ManageGetEvent(ctx, store.ManageGetEventParams{ID: id, OrganizerID: manageScope(scope)}))
}

func (r *EventAdminRepo) OrganizerActive(ctx context.Context, id uuid.UUID) (bool, error) {
	active, err := r.q.ManageOrganizerActive(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return active, err
}

func (r *EventAdminRepo) CreateEvent(ctx context.Context, ev eventadmin.NewEvent) (eventadmin.Managed, error) {
	return manageOne(r.q.ManageCreateEvent(ctx, store.ManageCreateEventParams{
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
		CreatedBy:      pgtype.UUID{Bytes: ev.CreatedBy, Valid: true},
		OwnerID:        manageScope(ev.OrganizerID),
		Description:    ev.Description,
		SaleStartsAt:   manageTime(ev.SaleStartsAt),
		SaleEndsAt:     manageTime(ev.SaleEndsAt),
		FeeBearer:      ev.FeeBearer,
		FeePercentBp:   ev.FeePercentBP,
		FeeFlat:        ev.FeeFlat,
	}))
}

func (r *EventAdminRepo) UpdateEvent(ctx context.Context, scope *uuid.UUID, id uuid.UUID, expectedStatus, codePrefix string, v eventadmin.EventValues) (eventadmin.Managed, error) {
	return manageOne(r.q.ManageUpdateEvent(ctx, store.ManageUpdateEventParams{
		CodePrefix:     codePrefix,
		Name:           v.Name,
		Place:          v.Place,
		Item:           v.Item,
		Requirement:    v.Requirement,
		EventDate:      v.Date,
		OpenMinutes:    v.OpenMinutes,
		CloseMinutes:   v.CloseMinutes,
		SlotMinutes:    v.SlotMinutes,
		SlotCapacity:   v.SlotCapacity,
		CounterCount:   v.CounterCount,
		ServiceSeconds: v.ServiceSeconds,
		Description:    v.Description,
		SaleStartsAt:   manageTime(v.SaleStartsAt),
		SaleEndsAt:     manageTime(v.SaleEndsAt),
		FeeBearer:      v.FeeBearer,
		FeePercentBp:   v.FeePercentBP,
		FeeFlat:        v.FeeFlat,
		ID:             id,
		ExpectedStatus: expectedStatus,
		OrganizerID:    manageScope(scope),
	}))
}

func (r *EventAdminRepo) TransitionEvent(ctx context.Context, scope *uuid.UUID, id uuid.UUID, c event.StatusChange) (eventadmin.Managed, error) {
	return manageOne(r.q.ManageTransitionEvent(ctx, store.ManageTransitionEventParams{
		ToStatus:        c.To,
		StampSubmitted:  c.StampSubmitted,
		StampPublished:  c.StampPublished,
		RejectionReason: c.RejectionReason,
		ID:              id,
		FromStatus:      c.From,
		OrganizerID:     manageScope(scope),
	}))
}

// DeleteDraftEvent mengunci baris event dulu supaya tidak ada yang mengajukan
// event ini di tengah proses hapus, lalu membersihkan kursi dan blok sebelum
// event-nya sendiri (lihat catatan di eventadmin.sql).
func (r *EventAdminRepo) DeleteDraftEvent(ctx context.Context, scope *uuid.UUID, id uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := r.q.WithTx(tx)
	if _, err := q.ManageLockDraftEvent(ctx, store.ManageLockDraftEventParams{ID: id, OrganizerID: manageScope(scope)}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return event.ErrNotFound
		}
		return err
	}
	if err := q.ManageDeleteEventSeats(ctx, id); err != nil {
		return err
	}
	if err := q.ManageDeleteEventBlocks(ctx, id); err != nil {
		return err
	}
	n, err := q.ManageDeleteEvent(ctx, store.ManageDeleteEventParams{ID: id, OrganizerID: manageScope(scope)})
	if err != nil {
		return err
	}
	if n == 0 {
		return event.ErrNotFound
	}
	return tx.Commit(ctx)
}
