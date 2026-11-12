package seating

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

type Preview struct {
	Seats    []seating.SeatPos
	Warnings []string
}

// Preview menghitung kursi tanpa menyimpan, untuk editor yang menggeser
// slider. exclude diisi ID blok yang sedang diedit supaya tidak dianggap
// menabrak dirinya sendiri.
func (s *Service) Preview(ctx context.Context, actor user.Session, eventID, exclude uuid.UUID, spec seating.BlockSpec) (Preview, error) {
	if _, err := s.authorize(ctx, actor, eventID); err != nil {
		return Preview{}, err
	}
	seats, err := seating.Generate(spec)
	if err != nil {
		return Preview{}, err
	}
	others, err := s.repo.Blocks(ctx, eventID)
	if err != nil {
		return Preview{}, fmt.Errorf("memuat blok kursi: %w", err)
	}
	layout, err := s.layout(ctx, eventID)
	if err != nil {
		return Preview{}, err
	}
	return Preview{Seats: seats, Warnings: warningsFor(spec.Code, exclude, seats, layout, others)}, nil
}

// warningsFor memakai posisi blok lain yang dihitung ulang dari parameternya.
// Hasilnya sama dengan yang tersimpan, dan jauh lebih murah daripada memuat
// ribuan kursi dari database tiap kali slider bergeser.
func warningsFor(code string, self uuid.UUID, seats []seating.SeatPos, layout seating.Layout, others []seating.Block) []string {
	warnings := []string{}
	for _, o := range others {
		if self != uuid.Nil && o.ID == self {
			continue
		}
		theirs, err := seating.Generate(o.Spec)
		if err != nil {
			continue // data lama yang tidak lolos validasi baru, lewati saja
		}
		if seating.Overlaps(seats, theirs, seating.MinSeatGap) {
			warnings = append(warnings, fmt.Sprintf("Blok %s bertabrakan dengan blok %s", code, o.Spec.Code))
		}
	}
	if seating.HitsRect(seats, layout.Stage, seating.SeatRadius) {
		warnings = append(warnings, fmt.Sprintf("Blok %s menabrak panggung", code))
	}
	if seating.OutsideCanvas(seats, layout.CanvasWidth, layout.CanvasHeight, seating.SeatRadius) {
		warnings = append(warnings, fmt.Sprintf("Sebagian kursi blok %s berada di luar kanvas", code))
	}
	return warnings
}
