package booking

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
)

type fakeEvents struct {
	event.Repository
	ev event.Event
}

func (f fakeEvents) GetOpen(context.Context, uuid.UUID) (event.Event, error) { return f.ev, nil }

// fakeTickets menjawab Book dengan daftar error berurutan; nil berarti sukses.
type fakeTickets struct {
	ticket.Repository
	results []error
	calls   int
}

func (f *fakeTickets) Book(_ context.Context, b ticket.Booking) (ticket.Ticket, error) {
	err := f.results[f.calls]
	f.calls++
	if err != nil {
		return ticket.Ticket{}, err
	}
	return ticket.Ticket{Code: b.Code, SlotStart: b.SlotStart, VisitorName: b.VisitorName}, nil
}

func newService(results ...error) (*Service, *fakeTickets) {
	at := time.Date(2026, 11, 9, 10, 40, 0, 0, time.Local)
	ev := event.Event{
		ID: uuid.New(), CodePrefix: "GL", Date: "2026-11-09",
		OpenMinutes: 600, CloseMinutes: 720, SlotMinutes: 30, SlotCapacity: 10,
	}
	tickets := &fakeTickets{results: results}
	clock := shared.Clock(func() time.Time { return at })
	return New(fakeEvents{ev: ev}, tickets, clock), tickets
}

func TestBookRetriesOnDuplicateCode(t *testing.T) {
	svc, tickets := newService(ticket.ErrDuplicateCode, ticket.ErrDuplicateCode, nil)

	got, _, err := svc.Book(context.Background(), uuid.New(), "11:00", "Budi Santoso")

	if err != nil {
		t.Fatalf("Book: %v", err)
	}
	if tickets.calls != 3 || got.SlotStart != 660 || len(got.Code) != len("GL-XXXX") {
		t.Fatalf("mau sukses di percobaan ke-3 pada slot 11:00, dapat calls=%d tiket=%+v", tickets.calls, got)
	}
}

func TestBookGivesUpAfterMaxAttempts(t *testing.T) {
	dups := make([]error, maxCodeAttempts)
	for i := range dups {
		dups[i] = ticket.ErrDuplicateCode
	}
	svc, tickets := newService(dups...)

	_, _, err := svc.Book(context.Background(), uuid.New(), "11:00", "Budi Santoso")

	if !errors.Is(err, ticket.ErrDuplicateCode) || tickets.calls != maxCodeAttempts {
		t.Fatalf("mau menyerah setelah %d kali, dapat calls=%d err=%v", maxCodeAttempts, tickets.calls, err)
	}
}

func TestBookStopsOnOtherErrors(t *testing.T) {
	svc, tickets := newService(ticket.ErrSlotFull)

	_, _, err := svc.Book(context.Background(), uuid.New(), "11:00", "Budi Santoso")

	if !errors.Is(err, ticket.ErrSlotFull) || tickets.calls != 1 {
		t.Fatalf("slot penuh tidak boleh dicoba ulang, dapat calls=%d err=%v", tickets.calls, err)
	}
}

func TestBookRejectsBadSlotBeforeSaving(t *testing.T) {
	svc, tickets := newService()

	_, _, err := svc.Book(context.Background(), uuid.New(), "10:00", "Budi Santoso")

	if !errors.Is(err, ticket.ErrSlotPast) || tickets.calls != 0 {
		t.Fatalf("slot 10:00 sudah lewat pada 10:40, dapat calls=%d err=%v", tickets.calls, err)
	}
}
