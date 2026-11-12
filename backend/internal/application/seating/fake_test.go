package seating

import (
	"context"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/seating"
)

// fakeRepo menyimpan semuanya di memori. Plan dari service dijalankan persis
// seperti repository asli, hanya tanpa transaksi.
type fakeRepo struct {
	events     map[uuid.UUID]seating.EventRef
	categories map[uuid.UUID]seating.CategoryRef
	layouts    map[uuid.UUID]seating.Layout
	blocks     map[uuid.UUID]seating.Block
	order      []uuid.UUID
	seats      []seating.Seat
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		events:     map[uuid.UUID]seating.EventRef{},
		categories: map[uuid.UUID]seating.CategoryRef{},
		layouts:    map[uuid.UUID]seating.Layout{},
		blocks:     map[uuid.UUID]seating.Block{},
	}
}

func (f *fakeRepo) EventRef(_ context.Context, id uuid.UUID) (seating.EventRef, error) {
	ev, ok := f.events[id]
	if !ok {
		return seating.EventRef{}, seating.ErrEventNotFound
	}
	return ev, nil
}

func (f *fakeRepo) Category(_ context.Context, id uuid.UUID) (seating.CategoryRef, error) {
	c, ok := f.categories[id]
	if !ok {
		return seating.CategoryRef{}, seating.ErrCategoryNotFound
	}
	return c, nil
}

func (f *fakeRepo) Layout(_ context.Context, id uuid.UUID) (seating.Layout, error) {
	l, ok := f.layouts[id]
	if !ok {
		return seating.Layout{}, seating.ErrLayoutNotFound
	}
	return l, nil
}

func (f *fakeRepo) SaveLayout(_ context.Context, l seating.Layout) (seating.Layout, error) {
	f.layouts[l.EventID] = l
	return l, nil
}

func (f *fakeRepo) Blocks(_ context.Context, eventID uuid.UUID) ([]seating.Block, error) {
	var out []seating.Block
	for _, id := range f.order {
		if b, ok := f.blocks[id]; ok && b.EventID == eventID {
			out = append(out, f.withCount(b))
		}
	}
	return out, nil
}

func (f *fakeRepo) Block(_ context.Context, id uuid.UUID) (seating.Block, error) {
	b, ok := f.blocks[id]
	if !ok {
		return seating.Block{}, seating.ErrBlockNotFound
	}
	return f.withCount(b), nil
}

func (f *fakeRepo) withCount(b seating.Block) seating.Block {
	b.SeatCount = len(f.blockSeats(b.ID))
	b.CategoryName = f.categories[b.CategoryID].Name
	return b
}

func (f *fakeRepo) blockSeats(id uuid.UUID) []seating.Seat {
	var out []seating.Seat
	for _, s := range f.seats {
		if s.BlockID == id {
			out = append(out, s)
		}
	}
	return out
}

func (f *fakeRepo) Seats(_ context.Context, eventID uuid.UUID) ([]seating.Seat, error) {
	var out []seating.Seat
	for _, s := range f.seats {
		if s.EventID == eventID {
			out = append(out, s)
		}
	}
	return out, nil
}

func (f *fakeRepo) SaveBlock(ctx context.Context, b seating.Block, plan seating.SeatPlan) (seating.Block, error) {
	next, err := plan(f.blockSeats(b.ID))
	if err != nil {
		return seating.Block{}, err
	}
	for _, o := range f.blocks {
		if o.ID != b.ID && o.EventID == b.EventID && o.Spec.Code == b.Spec.Code {
			return seating.Block{}, seating.ErrCodeTaken
		}
	}
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
		f.order = append(f.order, b.ID)
	}
	f.blocks[b.ID] = b
	f.dropSeats(b.ID)
	for _, s := range next {
		f.seats = append(f.seats, seating.Seat{
			ID: uuid.New(), BlockID: b.ID, CategoryID: b.CategoryID, EventID: b.EventID,
			RowLabel: s.RowLabel, Number: s.Number, Label: s.Label, X: s.X, Y: s.Y, Status: s.Status,
		})
	}
	return f.Block(ctx, b.ID)
}

func (f *fakeRepo) dropSeats(blockID uuid.UUID) {
	kept := f.seats[:0]
	for _, s := range f.seats {
		if s.BlockID != blockID {
			kept = append(kept, s)
		}
	}
	f.seats = kept
}

func (f *fakeRepo) UpdateBlockInfo(ctx context.Context, b seating.Block) (seating.Block, error) {
	cur, ok := f.blocks[b.ID]
	if !ok {
		return seating.Block{}, seating.ErrBlockNotFound
	}
	cur.Name, cur.SortOrder = b.Name, b.SortOrder
	f.blocks[b.ID] = cur
	return f.Block(ctx, b.ID)
}

func (f *fakeRepo) DeleteBlock(_ context.Context, id uuid.UUID, check func([]seating.Seat) error) error {
	if _, ok := f.blocks[id]; !ok {
		return seating.ErrBlockNotFound
	}
	if err := check(f.blockSeats(id)); err != nil {
		return err
	}
	delete(f.blocks, id)
	f.dropSeats(id)
	return nil
}

func (f *fakeRepo) ChangeSeats(_ context.Context, eventID uuid.UUID, labels []string,
	plan func([]seating.Seat) ([]seating.StatusChange, error)) ([]seating.Seat, error) {
	want := map[string]bool{}
	for _, l := range labels {
		want[l] = true
	}
	var current []seating.Seat
	for _, s := range f.seats {
		if s.EventID == eventID && want[s.Label] {
			current = append(current, s)
		}
	}
	changes, err := plan(current)
	if err != nil {
		return nil, err
	}
	var changed []seating.Seat
	for _, c := range changes {
		for i := range f.seats {
			if f.seats[i].ID == c.ID {
				f.seats[i].Status = c.Status
				changed = append(changed, f.seats[i])
			}
		}
	}
	return changed, nil
}

func (f *fakeRepo) setStatus(label, status string) {
	for i := range f.seats {
		if f.seats[i].Label == label {
			f.seats[i].Status = status
		}
	}
}

func (f *fakeRepo) status(label string) string {
	for _, s := range f.seats {
		if s.Label == label {
			return s.Status
		}
	}
	return "tidak ada"
}
