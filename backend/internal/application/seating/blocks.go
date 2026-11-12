package seating

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

type BlockInput struct {
	CategoryID uuid.UUID
	Name       string
	SortOrder  int
	Spec       seating.BlockSpec
}

// BlockPatch: field nil artinya tidak diubah.
type BlockPatch struct {
	CategoryID    *uuid.UUID
	Name          *string
	SortOrder     *int
	Code          *string
	X, Y          *int
	Rotation      *int
	RowCount      *int
	SeatsPerRow   *int
	Curve         *int
	SeatSpacing   *int
	RowSpacing    *int
	FirstRowLabel *string
	Numbering     *string
	AisleAfter    *[]int
}

func (p BlockPatch) apply(b seating.Block) seating.Block {
	if p.CategoryID != nil {
		b.CategoryID = *p.CategoryID
	}
	setText(&b.Name, p.Name)
	setInt(&b.SortOrder, p.SortOrder)
	b.Spec = p.ApplySpec(b.Spec)
	return b
}

// ApplySpec menimpa parameter bentuk yang dikirim saja. Handler juga memakainya
// untuk mengisi nilai bawaan di permintaan buat dan pratinjau.
func (p BlockPatch) ApplySpec(s seating.BlockSpec) seating.BlockSpec {
	setText(&s.Code, p.Code)
	setInt(&s.X, p.X)
	setInt(&s.Y, p.Y)
	setInt(&s.Rotation, p.Rotation)
	setInt(&s.RowCount, p.RowCount)
	setInt(&s.SeatsPerRow, p.SeatsPerRow)
	setInt(&s.Curve, p.Curve)
	setInt(&s.SeatSpacing, p.SeatSpacing)
	setInt(&s.RowSpacing, p.RowSpacing)
	setText(&s.FirstRowLabel, p.FirstRowLabel)
	setText(&s.Numbering, p.Numbering)
	if p.AisleAfter != nil {
		s.AisleAfter = slices.Clone(*p.AisleAfter)
	}
	return s
}

func setInt(dst, v *int) {
	if v != nil {
		*dst = *v
	}
}

func setText(dst, v *string) {
	if v != nil {
		*dst = *v
	}
}

// BlockResult membawa peringatan tabrakan. Tabrakan tidak menggagalkan simpan
// karena editor sering melewati posisi bertumpuk saat blok sedang digeser.
type BlockResult struct {
	Block    seating.Block
	Warnings []string
}

func (s *Service) CreateBlock(ctx context.Context, actor user.Session, eventID uuid.UUID, in BlockInput) (BlockResult, error) {
	if _, err := s.authorizeEdit(ctx, actor, eventID); err != nil {
		return BlockResult{}, err
	}
	b := seating.Block{EventID: eventID, CategoryID: in.CategoryID, Name: in.Name, SortOrder: in.SortOrder, Spec: in.Spec}
	return s.save(ctx, b, nil)
}

func (s *Service) UpdateBlock(ctx context.Context, actor user.Session, blockID uuid.UUID, patch BlockPatch) (BlockResult, error) {
	current, err := s.blockForEdit(ctx, actor, blockID)
	if err != nil {
		return BlockResult{}, err
	}
	return s.save(ctx, patch.apply(current), &current)
}

func (s *Service) save(ctx context.Context, b seating.Block, previous *seating.Block) (BlockResult, error) {
	b.Name = seating.CleanText(b.Name)
	if err := b.Validate(); err != nil {
		return BlockResult{}, err
	}
	seats, err := seating.Generate(b.Spec)
	if err != nil {
		return BlockResult{}, err
	}
	if previous == nil || previous.CategoryID != b.CategoryID {
		if err := s.checkCategory(ctx, b); err != nil {
			return BlockResult{}, err
		}
	}
	others, err := s.repo.Blocks(ctx, b.EventID)
	if err != nil {
		return BlockResult{}, fmt.Errorf("memuat blok kursi: %w", err)
	}
	// Dicek di sini supaya pesannya ramah; unique index tetap jadi penjaga
	// terakhir kalau dua editor menyimpan kode yang sama bersamaan.
	for _, o := range others {
		if o.ID != b.ID && o.Spec.Code == b.Spec.Code {
			return BlockResult{}, ErrCodeTaken
		}
	}

	var saved seating.Block
	if previous != nil && sameShape(*previous, b) {
		// Ganti nama atau urutan saja tidak perlu menulis ulang kursi, jadi
		// tetap bisa dilakukan walau kursinya sudah terjual.
		saved, err = s.repo.UpdateBlockInfo(ctx, b)
	} else {
		saved, err = s.repo.SaveBlock(ctx, b, regeneratePlan(seats))
	}
	if errors.Is(err, seating.ErrBlockNotFound) {
		return BlockResult{}, ErrNotFound
	}
	if err != nil {
		return BlockResult{}, err
	}
	layout, err := s.layout(ctx, b.EventID)
	if err != nil {
		return BlockResult{}, err
	}
	return BlockResult{Block: saved, Warnings: warningsFor(b.Spec.Code, b.ID, seats, layout, others)}, nil
}

func (s *Service) checkCategory(ctx context.Context, b seating.Block) error {
	c, err := s.repo.Category(ctx, b.CategoryID)
	if errors.Is(err, seating.ErrCategoryNotFound) {
		return ErrCategoryNotSeated
	}
	if err != nil {
		return fmt.Errorf("memuat kategori: %w", err)
	}
	if c.EventID != b.EventID || !c.IsSeated {
		return ErrCategoryNotSeated
	}
	return nil
}

func sameShape(a, b seating.Block) bool {
	if a.CategoryID != b.CategoryID || !slices.Equal(a.Spec.AisleAfter, b.Spec.AisleAfter) {
		return false
	}
	return shapeOf(a.Spec) == shapeOf(b.Spec)
}

// shape adalah BlockSpec tanpa slice supaya bisa dibandingkan dengan ==.
type shape struct {
	code, firstRow, numbering                   string
	x, y, rotation, rows, perRow, curve, ss, rs int
}

func shapeOf(s seating.BlockSpec) shape {
	return shape{s.Code, s.FirstRowLabel, s.Numbering, s.X, s.Y, s.Rotation,
		s.RowCount, s.SeatsPerRow, s.Curve, s.SeatSpacing, s.RowSpacing}
}

type seatKey struct {
	row    string
	number int
}

// regeneratePlan menolak bila ada kursi terkunci, lalu menulis ulang kursi.
// Kursi nonaktif dicocokkan lewat baris dan nomor, bukan label penuh, supaya
// tiang dan meja teknis tetap tertandai walau kode bloknya diganti.
func regeneratePlan(seats []seating.SeatPos) seating.SeatPlan {
	return func(current []seating.Seat) ([]seating.NewSeat, error) {
		disabled := make(map[seatKey]bool)
		for _, c := range current {
			if c.Locked() {
				return nil, ErrBlockLocked
			}
			if c.Status == seating.StatusDisabled {
				disabled[seatKey{c.RowLabel, c.Number}] = true
			}
		}
		out := make([]seating.NewSeat, 0, len(seats))
		for _, p := range seats {
			status := seating.StatusAvailable
			if disabled[seatKey{p.RowLabel, p.Number}] {
				status = seating.StatusDisabled
			}
			out = append(out, seating.NewSeat{SeatPos: p, Status: status})
		}
		return out, nil
	}
}

func (s *Service) DeleteBlock(ctx context.Context, actor user.Session, blockID uuid.UUID) error {
	if _, err := s.blockForEdit(ctx, actor, blockID); err != nil {
		return err
	}
	err := s.repo.DeleteBlock(ctx, blockID, func(current []seating.Seat) error {
		for _, c := range current {
			if c.Locked() {
				return ErrBlockLocked
			}
		}
		return nil
	})
	if errors.Is(err, seating.ErrBlockNotFound) {
		return ErrNotFound
	}
	return err
}
