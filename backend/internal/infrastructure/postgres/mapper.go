package postgres

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

const uniqueViolation = "23505"

func uniqueViolationOn(err error, constraint string) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != uniqueViolation {
		return false
	}
	return constraint == "" || pgErr.ConstraintName == constraint
}

func timePtr(ts pgtype.Timestamptz) *time.Time {
	if !ts.Valid {
		return nil
	}
	t := ts.Time
	return &t
}

func uuidPtr(id pgtype.UUID) *uuid.UUID {
	if !id.Valid {
		return nil
	}
	u := uuid.UUID(id.Bytes)
	return &u
}

func eventOf(e store.Event) event.Event {
	return event.Event{
		ID:             e.ID,
		CodePrefix:     e.CodePrefix,
		Name:           e.Name,
		Place:          e.Place,
		Item:           e.Item,
		Requirement:    e.Requirement,
		Date:           e.EventDate,
		OpenMinutes:    e.OpenMinutes,
		CloseMinutes:   e.CloseMinutes,
		SlotMinutes:    e.SlotMinutes,
		SlotCapacity:   e.SlotCapacity,
		CounterCount:   e.CounterCount,
		ServiceSeconds: e.ServiceSeconds,
		WaitingCount:   e.WaitingCount,
		Status:         e.Status,

		OrganizerID:     uuidPtr(e.OrganizerID),
		Description:     e.Description,
		PosterURL:       e.PosterUrl,
		SaleStartsAt:    timePtr(e.SaleStartsAt),
		SaleEndsAt:      timePtr(e.SaleEndsAt),
		RejectionReason: e.RejectionReason,
		FeeBearer:       e.FeeBearer,
		FeePercentBP:    e.FeePercentBp,
		FeeFlat:         e.FeeFlat,
	}
}

func eventsOf(rows []store.Event) []event.Event {
	out := make([]event.Event, 0, len(rows))
	for _, row := range rows {
		out = append(out, eventOf(row))
	}
	return out
}

func ticketOf(t store.Ticket) ticket.Ticket {
	return ticket.Ticket{
		ID:              t.ID,
		Code:            t.Code,
		EventID:         t.EventID,
		VisitorName:     t.VisitorName,
		SlotStart:       t.SlotStart,
		Status:          t.Status,
		RedeemedAt:      timePtr(t.RedeemedAt),
		RedeemedBy:      uuidPtr(t.RedeemedBy),
		RedeemedCounter: t.RedeemedCounter,
		CreatedAt:       timePtr(t.CreatedAt),
	}
}

// ticketWithEventOf memakai kolom event yang ikut di-join GetTicketByCode, jadi
// tidak perlu query event kedua hanya untuk menyusun tampilan tiket.
func ticketWithEventOf(row store.GetTicketByCodeRow) ticket.WithEvent {
	return ticket.WithEvent{
		Ticket: ticket.Ticket{
			ID:              row.ID,
			Code:            row.Code,
			EventID:         row.EventID,
			VisitorName:     row.VisitorName,
			SlotStart:       row.SlotStart,
			Status:          row.Status,
			RedeemedAt:      timePtr(row.RedeemedAt),
			RedeemedBy:      uuidPtr(row.RedeemedBy),
			RedeemedCounter: row.RedeemedCounter,
			CreatedAt:       timePtr(row.CreatedAt),
		},
		Event: event.Event{
			ID:             row.EventID,
			Name:           row.EventName,
			Place:          row.EventPlace,
			Item:           row.EventItem,
			Requirement:    row.EventRequirement,
			Date:           row.EventDate,
			OpenMinutes:    row.OpenMinutes,
			CloseMinutes:   row.CloseMinutes,
			SlotMinutes:    row.SlotMinutes,
			CounterCount:   row.CounterCount,
			ServiceSeconds: row.ServiceSeconds,
			WaitingCount:   row.WaitingCount,
			Status:         row.EventStatus,
		},
	}
}
