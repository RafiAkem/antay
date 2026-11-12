package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	appseating "github.com/RafiAkem/antay/backend/internal/application/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// seatBlockRequest dipakai buat, ubah, dan pratinjau. Semua pointer supaya PATCH
// bisa membedakan "tidak dikirim" dari "dikirim nol".
type seatBlockRequest struct {
	CategoryID    *string `json:"categoryId"`
	Code          *string `json:"code"`
	Name          *string `json:"name"`
	X             *int    `json:"x"`
	Y             *int    `json:"y"`
	Rotation      *int    `json:"rotation"`
	RowCount      *int    `json:"rowCount"`
	SeatsPerRow   *int    `json:"seatsPerRow"`
	Curve         *int    `json:"curve"`
	SeatSpacing   *int    `json:"seatSpacing"`
	RowSpacing    *int    `json:"rowSpacing"`
	FirstRowLabel *string `json:"firstRowLabel"`
	Numbering     *string `json:"numbering"`
	AisleAfter    *[]int  `json:"aisleAfter"`
	SortOrder     *int    `json:"sortOrder"`
}

type seatPreviewRequest struct {
	seatBlockRequest
	EventID string `json:"eventId"`
	// BlockID opsional: blok yang sedang diedit, supaya tidak dianggap
	// menabrak posisinya sendiri yang lama.
	BlockID *string `json:"blockId"`
}

type seatLayoutRequest struct {
	CanvasWidth  int           `json:"canvasWidth"`
	CanvasHeight int           `json:"canvasHeight"`
	Stage        seatStageJSON `json:"stage"`
}

type seatsRequest struct {
	Disable []string `json:"disable"`
	Enable  []string `json:"enable"`
}

func (req seatBlockRequest) patch() (appseating.BlockPatch, []response.ErrorDetail) {
	p := appseating.BlockPatch{
		Name: req.Name, SortOrder: req.SortOrder, Code: req.Code, X: req.X, Y: req.Y,
		Rotation: req.Rotation, RowCount: req.RowCount, SeatsPerRow: req.SeatsPerRow, Curve: req.Curve,
		SeatSpacing: req.SeatSpacing, RowSpacing: req.RowSpacing,
		FirstRowLabel: req.FirstRowLabel, Numbering: req.Numbering, AisleAfter: req.AisleAfter,
	}
	if req.CategoryID != nil {
		id, err := uuid.Parse(*req.CategoryID)
		if err != nil {
			return p, []response.ErrorDetail{{Field: "categoryId", Issue: "harus UUID"}}
		}
		p.CategoryID = &id
	}
	return p, nil
}

// spec mengisi nilai bawaan yang sama dengan DEFAULT kolom seat_blocks untuk
// field opsional, dan mewajibkan field yang tidak punya bawaan.
func (req seatBlockRequest) spec() (seating.BlockSpec, []response.ErrorDetail) {
	var missing []response.ErrorDetail
	need := func(field string, ok bool) {
		if !ok {
			missing = append(missing, response.ErrorDetail{Field: field, Issue: "wajib diisi"})
		}
	}
	need("code", req.Code != nil)
	need("x", req.X != nil)
	need("y", req.Y != nil)
	need("rowCount", req.RowCount != nil)
	need("seatsPerRow", req.SeatsPerRow != nil)
	if len(missing) > 0 {
		return seating.BlockSpec{}, missing
	}
	spec := seating.BlockSpec{
		Code: *req.Code, X: *req.X, Y: *req.Y, RowCount: *req.RowCount, SeatsPerRow: *req.SeatsPerRow,
		SeatSpacing: 28, RowSpacing: 32, FirstRowLabel: "A", Numbering: seating.NumberingLTR,
	}
	p, _ := req.patch()
	p.Code, p.X, p.Y, p.RowCount, p.SeatsPerRow = nil, nil, nil, nil, nil
	return p.ApplySpec(spec), nil
}

func (req seatBlockRequest) input() (appseating.BlockInput, []response.ErrorDetail) {
	spec, issues := req.spec()
	if req.Name == nil {
		issues = append(issues, response.ErrorDetail{Field: "name", Issue: "wajib diisi"})
	}
	var category uuid.UUID
	if req.CategoryID == nil {
		issues = append(issues, response.ErrorDetail{Field: "categoryId", Issue: "wajib diisi"})
	} else if id, err := uuid.Parse(*req.CategoryID); err != nil {
		issues = append(issues, response.ErrorDetail{Field: "categoryId", Issue: "harus UUID"})
	} else {
		category = id
	}
	if len(issues) > 0 {
		return appseating.BlockInput{}, issues
	}
	in := appseating.BlockInput{CategoryID: category, Name: *req.Name, Spec: spec}
	if req.SortOrder != nil {
		in.SortOrder = *req.SortOrder
	}
	return in, nil
}

func badSeatBody(w http.ResponseWriter, r *http.Request, details []response.ErrorDetail) {
	response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.", details)
}

// writeSeatingError menerjemahkan error service ke kode error API.
func writeSeatingError(w http.ResponseWriter, r *http.Request, err error) {
	var locked appseating.SeatLockedError
	var unknown appseating.UnknownSeatsError
	if invalid, ok := appseating.IsInvalid(err); ok {
		response.FailDetails(w, r, http.StatusUnprocessableEntity, "INVALID_SEAT_MAP",
			"Periksa kembali isian denah.", seatIssues(invalid))
		return
	}
	switch {
	case errors.As(err, &locked):
		response.FailDetails(w, r, http.StatusConflict, "SEAT_LOCKED",
			"Ada kursi yang sudah ditahan atau terjual, statusnya tidak bisa diubah.",
			seatLabelDetails(locked.Labels, "sudah ditahan atau terjual"))
	case errors.As(err, &unknown):
		response.FailDetails(w, r, http.StatusUnprocessableEntity, "SEAT_NOT_FOUND",
			"Ada label kursi yang tidak ada di denah ini.", seatLabelDetails(unknown.Labels, "tidak ditemukan"))
	case errors.Is(err, appseating.ErrNotFound):
		response.NotFound(w, r, msgSeatMapNotFound)
	case errors.Is(err, appseating.ErrEventNotEditable):
		response.Unprocessable(w, r, "EVENT_NOT_EDITABLE", "Denah event yang sudah ditutup atau dibatalkan tidak bisa diubah.")
	case errors.Is(err, appseating.ErrCategoryNotSeated):
		response.Unprocessable(w, r, "CATEGORY_NOT_SEATED", "Pilih kategori berkursi milik event ini.")
	case errors.Is(err, appseating.ErrCodeTaken):
		response.Fail(w, r, http.StatusConflict, "BLOCK_CODE_TAKEN", "Kode blok sudah dipakai di event ini. Pilih kode lain.")
	case errors.Is(err, appseating.ErrBlockLocked):
		response.Fail(w, r, http.StatusConflict, "BLOCK_LOCKED",
			"Blok ini punya kursi yang ditahan atau terjual, jadi bentuknya tidak bisa diubah atau dihapus.")
	case errors.Is(err, appseating.ErrSeatInBothLists):
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Satu kursi tidak boleh dinonaktifkan dan diaktifkan sekaligus.")
	default:
		response.Internal(w, r)
	}
}

func seatLabelDetails(labels []string, issue string) []response.ErrorDetail {
	out := make([]response.ErrorDetail, 0, len(labels))
	for _, l := range labels {
		out = append(out, response.ErrorDetail{Field: l, Issue: issue})
	}
	return out
}
