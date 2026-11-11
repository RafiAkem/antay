package postgres

import (
	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

func seatLayoutOf(row store.VenueLayout) seating.Layout {
	return seating.Layout{
		EventID:      row.EventID,
		CanvasWidth:  int(row.CanvasWidth),
		CanvasHeight: int(row.CanvasHeight),
		Stage: seating.Rect{
			X: int(row.StageX), Y: int(row.StageY),
			Width: int(row.StageWidth), Height: int(row.StageHeight),
		},
		StageLabel: row.StageLabel,
	}
}

func seatBlockOf(row store.GetSeatBlockRow) seating.Block {
	aisles := make([]int, 0, len(row.AisleAfter))
	for _, a := range row.AisleAfter {
		aisles = append(aisles, int(a))
	}
	return seating.Block{
		ID:           row.ID,
		EventID:      row.EventID,
		CategoryID:   row.CategoryID,
		CategoryName: row.CategoryName,
		Name:         row.Name,
		SortOrder:    int(row.SortOrder),
		SeatCount:    int(row.SeatCount),
		Spec: seating.BlockSpec{
			Code: row.Code, X: int(row.X), Y: int(row.Y), Rotation: int(row.Rotation),
			RowCount: int(row.RowCount), SeatsPerRow: int(row.SeatsPerRow), Curve: int(row.Curve),
			SeatSpacing: int(row.SeatSpacing), RowSpacing: int(row.RowSpacing),
			FirstRowLabel: row.FirstRowLabel, Numbering: row.Numbering, AisleAfter: aisles,
		},
	}
}

func seatRowsOf(rows []store.Seat) []seating.Seat {
	out := make([]seating.Seat, 0, len(rows))
	for _, s := range rows {
		out = append(out, seating.Seat{
			ID: s.ID, BlockID: s.BlockID, CategoryID: s.CategoryID, EventID: s.EventID,
			RowLabel: s.RowLabel, Number: int(s.Number), Label: s.Label,
			X: int(s.X), Y: int(s.Y), Status: s.Status,
		})
	}
	return out
}

// seatInsertParams memecah kursi jadi array sejajar untuk InsertSeats.
func seatInsertParams(blockID uuid.UUID, b seating.Block, seats []seating.NewSeat) store.InsertSeatsParams {
	p := store.InsertSeatsParams{
		BlockID: blockID, CategoryID: b.CategoryID, EventID: b.EventID,
		RowLabels: make([]string, 0, len(seats)), Numbers: make([]int32, 0, len(seats)),
		Labels: make([]string, 0, len(seats)), Xs: make([]int32, 0, len(seats)),
		Ys: make([]int32, 0, len(seats)), Statuses: make([]string, 0, len(seats)),
	}
	for _, s := range seats {
		p.RowLabels = append(p.RowLabels, s.RowLabel)
		p.Numbers = append(p.Numbers, int32(s.Number))
		p.Labels = append(p.Labels, s.Label)
		p.Xs = append(p.Xs, int32(s.X))
		p.Ys = append(p.Ys, int32(s.Y))
		p.Statuses = append(p.Statuses, s.Status)
	}
	return p
}
