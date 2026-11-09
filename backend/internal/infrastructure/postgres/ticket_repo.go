package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

type TicketRepo struct {
	pool *pgxpool.Pool
	q    *store.Queries
}

func NewTicketRepo(pool *pgxpool.Pool, q *store.Queries) *TicketRepo {
	return &TicketRepo{pool: pool, q: q}
}

// Book memakai transaksi baru per panggilan supaya unique violation tidak
// membuat percobaan kode berikutnya ikut batal.
func (r *TicketRepo) Book(ctx context.Context, b ticket.Booking) (ticket.Ticket, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return ticket.Ticket{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := r.q.WithTx(tx)
	// Kunci baris event menahan pemesan lain di slot yang sama, sehingga hitung
	// kuota dan insert di bawahnya tidak bisa saling mendahului.
	if _, err := q.LockEvent(ctx, b.EventID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ticket.Ticket{}, ticket.ErrEventGone
		}
		return ticket.Ticket{}, err
	}
	booked, err := q.CountSlotBookings(ctx, store.CountSlotBookingsParams{
		EventID:   b.EventID,
		SlotStart: b.SlotStart,
	})
	if err != nil {
		return ticket.Ticket{}, err
	}
	if booked >= b.SlotCapacity {
		return ticket.Ticket{}, ticket.ErrSlotFull
	}
	row, err := q.CreateTicket(ctx, store.CreateTicketParams{
		Code:        b.Code,
		EventID:     b.EventID,
		VisitorName: b.VisitorName,
		SlotStart:   b.SlotStart,
	})
	if err != nil {
		// Hanya bentrokan kode tiket yang ditandai, bukan pelanggaran unik lain,
		// supaya kesalahan data tidak dicoba ulang dengan sia-sia.
		if uniqueViolationOn(err, "tickets_code_key") {
			return ticket.Ticket{}, ticket.ErrDuplicateCode
		}
		return ticket.Ticket{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ticket.Ticket{}, err
	}
	return ticketOf(row), nil
}

func (r *TicketRepo) GetByCode(ctx context.Context, code string) (ticket.WithEvent, error) {
	row, err := r.q.GetTicketByCode(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ticket.WithEvent{}, ticket.ErrNotFound
		}
		return ticket.WithEvent{}, err
	}
	return ticketWithEventOf(row), nil
}

func (r *TicketRepo) ListWaiting(ctx context.Context, eventID uuid.UUID, slotStarts []int32) ([]ticket.Ticket, error) {
	rows, err := r.q.ListWaitingTickets(ctx, store.ListWaitingTicketsParams{
		EventID:    eventID,
		SlotStarts: slotStarts,
	})
	if err != nil {
		return nil, err
	}
	out := make([]ticket.Ticket, 0, len(rows))
	for _, row := range rows {
		out = append(out, ticketOf(row))
	}
	return out, nil
}

func (r *TicketRepo) Cancel(ctx context.Context, code string) error {
	n, err := r.q.CancelTicket(ctx, code)
	if err != nil {
		return err
	}
	if n == 0 {
		return ticket.ErrNotCancellable
	}
	return nil
}

func (r *TicketRepo) Redeem(ctx context.Context, in ticket.Redemption) (ticket.Ticket, error) {
	counter := in.Counter
	row, err := r.q.RedeemTicket(ctx, store.RedeemTicketParams{
		RedeemedBy:      pgtype.UUID{Bytes: in.RedeemedBy, Valid: true},
		RedeemedCounter: &counter,
		Code:            in.Code,
		EventID:         in.EventID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ticket.Ticket{}, ticket.ErrNotRedeemable
		}
		return ticket.Ticket{}, err
	}
	return ticketOf(row), nil
}
