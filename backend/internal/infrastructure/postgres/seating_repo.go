package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

// SeatingRepo menyimpan denah kursi. Semua yang mengganti kursi berjalan dalam
// satu transaksi dengan kursi lama dikunci dulu, supaya pesanan yang sedang
// menahan kursi tidak bisa menyelip di tengah penggantian.
type SeatingRepo struct {
	pool *pgxpool.Pool
	q    *store.Queries
}

func NewSeatingRepo(pool *pgxpool.Pool, q *store.Queries) *SeatingRepo {
	return &SeatingRepo{pool: pool, q: q}
}

var _ seating.Repository = (*SeatingRepo)(nil)

const blockCodeKey = "seat_blocks_event_code_key"

func (r *SeatingRepo) EventRef(ctx context.Context, eventID uuid.UUID) (seating.EventRef, error) {
	row, err := r.q.SeatingEventRef(ctx, eventID)
	if err != nil {
		return seating.EventRef{}, seatingNotFound(err, seating.ErrEventNotFound)
	}
	return seating.EventRef{ID: row.ID, OrganizerID: uuidPtr(row.OrganizerID), Status: row.Status}, nil
}

func (r *SeatingRepo) Category(ctx context.Context, id uuid.UUID) (seating.CategoryRef, error) {
	row, err := r.q.SeatingCategory(ctx, id)
	if err != nil {
		return seating.CategoryRef{}, seatingNotFound(err, seating.ErrCategoryNotFound)
	}
	return seating.CategoryRef{ID: row.ID, EventID: row.EventID, Name: row.Name, IsSeated: row.IsSeated}, nil
}

func (r *SeatingRepo) Layout(ctx context.Context, eventID uuid.UUID) (seating.Layout, error) {
	row, err := r.q.GetVenueLayout(ctx, eventID)
	if err != nil {
		return seating.Layout{}, seatingNotFound(err, seating.ErrLayoutNotFound)
	}
	return seatLayoutOf(row), nil
}

func (r *SeatingRepo) SaveLayout(ctx context.Context, l seating.Layout) (seating.Layout, error) {
	row, err := r.q.UpsertVenueLayout(ctx, store.UpsertVenueLayoutParams{
		EventID:      l.EventID,
		CanvasWidth:  int32(l.CanvasWidth),
		CanvasHeight: int32(l.CanvasHeight),
		StageX:       int32(l.Stage.X),
		StageY:       int32(l.Stage.Y),
		StageWidth:   int32(l.Stage.Width),
		StageHeight:  int32(l.Stage.Height),
		StageLabel:   l.StageLabel,
	})
	if err != nil {
		return seating.Layout{}, err
	}
	return seatLayoutOf(row), nil
}

func (r *SeatingRepo) Blocks(ctx context.Context, eventID uuid.UUID) ([]seating.Block, error) {
	rows, err := r.q.ListSeatBlocks(ctx, eventID)
	if err != nil {
		return nil, err
	}
	out := make([]seating.Block, 0, len(rows))
	for _, row := range rows {
		out = append(out, seatBlockOf(store.GetSeatBlockRow(row)))
	}
	return out, nil
}

func (r *SeatingRepo) Block(ctx context.Context, id uuid.UUID) (seating.Block, error) {
	return r.block(ctx, r.q, id)
}

func (r *SeatingRepo) block(ctx context.Context, q *store.Queries, id uuid.UUID) (seating.Block, error) {
	row, err := q.GetSeatBlock(ctx, id)
	if err != nil {
		return seating.Block{}, seatingNotFound(err, seating.ErrBlockNotFound)
	}
	return seatBlockOf(row), nil
}

func (r *SeatingRepo) Seats(ctx context.Context, eventID uuid.UUID) ([]seating.Seat, error) {
	rows, err := r.q.ListEventSeats(ctx, eventID)
	if err != nil {
		return nil, err
	}
	return seatRowsOf(rows), nil
}

func (r *SeatingRepo) SaveBlock(ctx context.Context, b seating.Block, plan seating.SeatPlan) (seating.Block, error) {
	var saved seating.Block
	err := r.inTx(ctx, func(q *store.Queries) error {
		current, err := r.lockBlock(ctx, q, b.ID)
		if err != nil {
			return err
		}
		seats, err := plan(current)
		if err != nil {
			return err
		}
		id, err := r.writeBlock(ctx, q, b)
		if err != nil {
			return err
		}
		if err := q.DeleteBlockSeats(ctx, id); err != nil {
			return err
		}
		if err := q.InsertSeats(ctx, seatInsertParams(id, b, seats)); err != nil {
			return err
		}
		saved, err = r.block(ctx, q, id)
		return err
	})
	return saved, err
}

// lockBlock mengunci baris blok dan semua kursinya. Blok baru belum punya
// kursi, jadi langsung kosong.
func (r *SeatingRepo) lockBlock(ctx context.Context, q *store.Queries, id uuid.UUID) ([]seating.Seat, error) {
	if id == uuid.Nil {
		return nil, nil
	}
	if _, err := q.LockSeatBlock(ctx, id); err != nil {
		return nil, seatingNotFound(err, seating.ErrBlockNotFound)
	}
	rows, err := q.LockBlockSeats(ctx, id)
	if err != nil {
		return nil, err
	}
	return seatRowsOf(rows), nil
}

func (r *SeatingRepo) writeBlock(ctx context.Context, q *store.Queries, b seating.Block) (uuid.UUID, error) {
	s := b.Spec
	aisles := make([]int32, 0, len(s.AisleAfter))
	for _, a := range s.AisleAfter {
		aisles = append(aisles, int32(a))
	}
	var err error
	id := b.ID
	if id == uuid.Nil {
		id, err = q.InsertSeatBlock(ctx, store.InsertSeatBlockParams{
			EventID: b.EventID, CategoryID: b.CategoryID, Code: s.Code, Name: b.Name,
			X: int32(s.X), Y: int32(s.Y), Rotation: int32(s.Rotation),
			RowCount: int32(s.RowCount), SeatsPerRow: int32(s.SeatsPerRow), Curve: int32(s.Curve),
			SeatSpacing: int32(s.SeatSpacing), RowSpacing: int32(s.RowSpacing),
			FirstRowLabel: s.FirstRowLabel, Numbering: s.Numbering, AisleAfter: aisles,
			SortOrder: int32(b.SortOrder),
		})
	} else {
		err = q.UpdateSeatBlock(ctx, store.UpdateSeatBlockParams{
			ID: id, CategoryID: b.CategoryID, Code: s.Code, Name: b.Name,
			X: int32(s.X), Y: int32(s.Y), Rotation: int32(s.Rotation),
			RowCount: int32(s.RowCount), SeatsPerRow: int32(s.SeatsPerRow), Curve: int32(s.Curve),
			SeatSpacing: int32(s.SeatSpacing), RowSpacing: int32(s.RowSpacing),
			FirstRowLabel: s.FirstRowLabel, Numbering: s.Numbering, AisleAfter: aisles,
			SortOrder: int32(b.SortOrder),
		})
	}
	if uniqueViolationOn(err, blockCodeKey) {
		return uuid.Nil, seating.ErrCodeTaken
	}
	return id, err
}

func (r *SeatingRepo) UpdateBlockInfo(ctx context.Context, b seating.Block) (seating.Block, error) {
	n, err := r.q.UpdateSeatBlockInfo(ctx, store.UpdateSeatBlockInfoParams{
		ID: b.ID, Name: b.Name, SortOrder: int32(b.SortOrder),
	})
	if err != nil {
		return seating.Block{}, err
	}
	if n == 0 {
		return seating.Block{}, seating.ErrBlockNotFound
	}
	return r.Block(ctx, b.ID)
}

func (r *SeatingRepo) DeleteBlock(ctx context.Context, id uuid.UUID, check func([]seating.Seat) error) error {
	return r.inTx(ctx, func(q *store.Queries) error {
		current, err := r.lockBlock(ctx, q, id)
		if err != nil {
			return err
		}
		if err := check(current); err != nil {
			return err
		}
		return q.DeleteSeatBlock(ctx, id)
	})
}

func (r *SeatingRepo) ChangeSeats(ctx context.Context, eventID uuid.UUID, labels []string,
	plan func([]seating.Seat) ([]seating.StatusChange, error)) ([]seating.Seat, error) {
	var changed []seating.Seat
	err := r.inTx(ctx, func(q *store.Queries) error {
		rows, err := q.LockSeatsByLabel(ctx, store.LockSeatsByLabelParams{EventID: eventID, Labels: labels})
		if err != nil {
			return err
		}
		changes, err := plan(seatRowsOf(rows))
		if err != nil {
			return err
		}
		byStatus := map[string][]uuid.UUID{}
		for _, c := range changes {
			byStatus[c.Status] = append(byStatus[c.Status], c.ID)
		}
		for status, ids := range byStatus {
			updated, err := q.SetSeatStatus(ctx, store.SetSeatStatusParams{Status: status, Ids: ids})
			if err != nil {
				return err
			}
			changed = append(changed, seatRowsOf(updated)...)
		}
		return nil
	})
	return changed, err
}

func (r *SeatingRepo) inTx(ctx context.Context, fn func(q *store.Queries) error) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := fn(r.q.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func seatingNotFound(err, sentinel error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return sentinel
	}
	return err
}
