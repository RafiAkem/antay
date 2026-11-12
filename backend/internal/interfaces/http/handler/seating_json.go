package handler

import (
	"github.com/google/uuid"

	appseating "github.com/RafiAkem/antay/backend/internal/application/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

type seatStageJSON struct {
	X      int    `json:"x"`
	Y      int    `json:"y"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Label  string `json:"label"`
}

type seatLayoutJSON struct {
	CanvasWidth  int           `json:"canvasWidth"`
	CanvasHeight int           `json:"canvasHeight"`
	Stage        seatStageJSON `json:"stage"`
}

type seatBlockJSON struct {
	ID            uuid.UUID `json:"id"`
	CategoryID    uuid.UUID `json:"categoryId"`
	CategoryName  string    `json:"categoryName"`
	Code          string    `json:"code"`
	Name          string    `json:"name"`
	X             int       `json:"x"`
	Y             int       `json:"y"`
	Rotation      int       `json:"rotation"`
	RowCount      int       `json:"rowCount"`
	SeatsPerRow   int       `json:"seatsPerRow"`
	Curve         int       `json:"curve"`
	SeatSpacing   int       `json:"seatSpacing"`
	RowSpacing    int       `json:"rowSpacing"`
	FirstRowLabel string    `json:"firstRowLabel"`
	Numbering     string    `json:"numbering"`
	AisleAfter    []int     `json:"aisleAfter"`
	SortOrder     int       `json:"sortOrder"`
	SeatCount     int       `json:"seatCount"`
}

// seatJSON dipakai editor dan pembeli; bedanya hanya isi status.
type seatJSON struct {
	ID         uuid.UUID `json:"id"`
	Label      string    `json:"label"`
	Row        string    `json:"row"`
	Number     int       `json:"number"`
	X          int       `json:"x"`
	Y          int       `json:"y"`
	BlockID    uuid.UUID `json:"blockId"`
	CategoryID uuid.UUID `json:"categoryId"`
	Status     string    `json:"status"`
}

type seatPublicBlockJSON struct {
	ID           uuid.UUID `json:"id"`
	Code         string    `json:"code"`
	Name         string    `json:"name"`
	CategoryID   uuid.UUID `json:"categoryId"`
	CategoryName string    `json:"categoryName"`
}

type seatPreviewJSON struct {
	Label  string `json:"label"`
	Row    string `json:"row"`
	Number int    `json:"number"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

func seatLayoutOf(l seating.Layout) seatLayoutJSON {
	return seatLayoutJSON{
		CanvasWidth: l.CanvasWidth, CanvasHeight: l.CanvasHeight,
		Stage: seatStageJSON{X: l.Stage.X, Y: l.Stage.Y, Width: l.Stage.Width, Height: l.Stage.Height, Label: l.StageLabel},
	}
}

func seatBlockOf(b seating.Block) seatBlockJSON {
	s := b.Spec
	aisles := s.AisleAfter
	if aisles == nil {
		aisles = []int{}
	}
	return seatBlockJSON{
		ID: b.ID, CategoryID: b.CategoryID, CategoryName: b.CategoryName, Code: s.Code, Name: b.Name,
		X: s.X, Y: s.Y, Rotation: s.Rotation, RowCount: s.RowCount, SeatsPerRow: s.SeatsPerRow,
		Curve: s.Curve, SeatSpacing: s.SeatSpacing, RowSpacing: s.RowSpacing,
		FirstRowLabel: s.FirstRowLabel, Numbering: s.Numbering, AisleAfter: aisles,
		SortOrder: b.SortOrder, SeatCount: b.SeatCount,
	}
}

func seatBlocksOf(blocks []seating.Block) []seatBlockJSON {
	out := make([]seatBlockJSON, 0, len(blocks))
	for _, b := range blocks {
		out = append(out, seatBlockOf(b))
	}
	return out
}

// seatsOf menerima pengubah status supaya denah publik bisa menyamarkan
// held dan sold tanpa menyalin seluruh fungsi.
func seatListOf(seats []seating.Seat, status func(seating.Seat) string) []seatJSON {
	out := make([]seatJSON, 0, len(seats))
	for _, s := range seats {
		out = append(out, seatJSON{
			ID: s.ID, Label: s.Label, Row: s.RowLabel, Number: s.Number, X: s.X, Y: s.Y,
			BlockID: s.BlockID, CategoryID: s.CategoryID, Status: status(s),
		})
	}
	return out
}

func seatManageStatus(s seating.Seat) string { return s.Status }

func seatPublicStatus(s seating.Seat) string { return s.PublicStatus() }

func seatPublicBlocksOf(blocks []seating.Block) []seatPublicBlockJSON {
	out := make([]seatPublicBlockJSON, 0, len(blocks))
	for _, b := range blocks {
		out = append(out, seatPublicBlockJSON{
			ID: b.ID, Code: b.Spec.Code, Name: b.Name, CategoryID: b.CategoryID, CategoryName: b.CategoryName,
		})
	}
	return out
}

func seatPreviewsOf(seats []seating.SeatPos) []seatPreviewJSON {
	out := make([]seatPreviewJSON, 0, len(seats))
	for _, s := range seats {
		out = append(out, seatPreviewJSON{Label: s.Label, Row: s.RowLabel, Number: s.Number, X: s.X, Y: s.Y})
	}
	return out
}

func seatBlockResultOf(res appseating.BlockResult) map[string]any {
	return map[string]any{"block": seatBlockOf(res.Block), "seatCount": res.Block.SeatCount, "warnings": res.Warnings}
}

func seatIssues(invalid seating.InvalidError) []response.ErrorDetail {
	out := make([]response.ErrorDetail, 0, len(invalid.Issues))
	for _, i := range invalid.Issues {
		out = append(out, response.ErrorDetail{Field: i.Field, Issue: i.Message})
	}
	return out
}
