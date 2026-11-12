package handler

import (
	"net/http"

	"github.com/google/uuid"

	appseating "github.com/RafiAkem/antay/backend/internal/application/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const msgSeatMapNotFound = "Event atau blok kursi tidak ditemukan."

// Seating melayani editor denah milik penyelenggara dan denah untuk pembeli.
type Seating struct {
	seating *appseating.Service
}

func NewSeating(s *appseating.Service) *Seating { return &Seating{seating: s} }

// target membaca sesi dan ID dari path. ID yang bukan UUID dijawab 404,
// sama seperti ID yang tidak ada.
func (h *Seating) target(w http.ResponseWriter, r *http.Request, param string) (user.Session, uuid.UUID, bool) {
	session, ok := middleware.SessionFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return user.Session{}, uuid.Nil, false
	}
	id, err := uuid.Parse(r.PathValue(param))
	if err != nil {
		response.NotFound(w, r, msgSeatMapNotFound)
		return user.Session{}, uuid.Nil, false
	}
	return session, id, true
}

func (h *Seating) ManageSeatMap(w http.ResponseWriter, r *http.Request) {
	actor, eventID, ok := h.target(w, r, "eventId")
	if !ok {
		return
	}
	m, err := h.seating.SeatMap(r.Context(), actor, eventID)
	if err != nil {
		writeSeatingError(w, r, err)
		return
	}
	response.OK(w, r, "Denah kursi dimuat.", map[string]any{
		"layout": seatLayoutOf(m.Layout),
		"blocks": seatBlocksOf(m.Blocks),
		"seats":  seatListOf(m.Seats, seatManageStatus),
	})
}

func (h *Seating) PutLayout(w http.ResponseWriter, r *http.Request) {
	actor, eventID, ok := h.target(w, r, "eventId")
	if !ok {
		return
	}
	var req seatLayoutRequest
	if err := response.Decode(w, r, &req); err != nil {
		badSeatBody(w, r, nil)
		return
	}
	saved, err := h.seating.PutLayout(r.Context(), actor, seating.Layout{
		EventID: eventID, CanvasWidth: req.CanvasWidth, CanvasHeight: req.CanvasHeight,
		Stage:      seating.Rect{X: req.Stage.X, Y: req.Stage.Y, Width: req.Stage.Width, Height: req.Stage.Height},
		StageLabel: req.Stage.Label,
	})
	if err != nil {
		writeSeatingError(w, r, err)
		return
	}
	response.OK(w, r, "Layout denah disimpan.", map[string]any{"layout": seatLayoutOf(saved)})
}

func (h *Seating) CreateBlock(w http.ResponseWriter, r *http.Request) {
	actor, eventID, ok := h.target(w, r, "eventId")
	if !ok {
		return
	}
	var req seatBlockRequest
	if err := response.Decode(w, r, &req); err != nil {
		badSeatBody(w, r, nil)
		return
	}
	in, issues := req.input()
	if len(issues) > 0 {
		badSeatBody(w, r, issues)
		return
	}
	res, err := h.seating.CreateBlock(r.Context(), actor, eventID, in)
	if err != nil {
		writeSeatingError(w, r, err)
		return
	}
	response.Created(w, r, "Blok kursi dibuat.", seatBlockResultOf(res))
}

func (h *Seating) UpdateBlock(w http.ResponseWriter, r *http.Request) {
	actor, blockID, ok := h.target(w, r, "blockId")
	if !ok {
		return
	}
	var req seatBlockRequest
	if err := response.Decode(w, r, &req); err != nil {
		badSeatBody(w, r, nil)
		return
	}
	patch, issues := req.patch()
	if len(issues) > 0 {
		badSeatBody(w, r, issues)
		return
	}
	res, err := h.seating.UpdateBlock(r.Context(), actor, blockID, patch)
	if err != nil {
		writeSeatingError(w, r, err)
		return
	}
	response.OK(w, r, "Blok kursi diperbarui.", seatBlockResultOf(res))
}

func (h *Seating) DeleteBlock(w http.ResponseWriter, r *http.Request) {
	actor, blockID, ok := h.target(w, r, "blockId")
	if !ok {
		return
	}
	if err := h.seating.DeleteBlock(r.Context(), actor, blockID); err != nil {
		writeSeatingError(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *Seating) UpdateSeats(w http.ResponseWriter, r *http.Request) {
	actor, eventID, ok := h.target(w, r, "eventId")
	if !ok {
		return
	}
	var req seatsRequest
	if err := response.Decode(w, r, &req); err != nil {
		badSeatBody(w, r, nil)
		return
	}
	changed, err := h.seating.UpdateSeats(r.Context(), actor, eventID, req.Disable, req.Enable)
	if err != nil {
		writeSeatingError(w, r, err)
		return
	}
	response.OK(w, r, "Status kursi diperbarui.", map[string]any{"seats": seatListOf(changed, seatManageStatus)})
}

// PreviewBlock tidak punya ID di path; eventId ikut di body karena blok yang
// dipratinjau mungkin belum disimpan.
func (h *Seating) PreviewBlock(w http.ResponseWriter, r *http.Request) {
	actor, ok := middleware.SessionFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return
	}
	var req seatPreviewRequest
	if err := response.Decode(w, r, &req); err != nil {
		badSeatBody(w, r, nil)
		return
	}
	eventID, err := uuid.Parse(req.EventID)
	if err != nil {
		badSeatBody(w, r, []response.ErrorDetail{{Field: "eventId", Issue: "harus UUID"}})
		return
	}
	exclude := uuid.Nil
	if req.BlockID != nil {
		if exclude, err = uuid.Parse(*req.BlockID); err != nil {
			badSeatBody(w, r, []response.ErrorDetail{{Field: "blockId", Issue: "harus UUID"}})
			return
		}
	}
	spec, issues := req.spec()
	if len(issues) > 0 {
		badSeatBody(w, r, issues)
		return
	}
	p, err := h.seating.Preview(r.Context(), actor, eventID, exclude, spec)
	if err != nil {
		writeSeatingError(w, r, err)
		return
	}
	response.OK(w, r, "Pratinjau blok kursi.", map[string]any{"seats": seatPreviewsOf(p.Seats), "warnings": p.Warnings})
}

// PublicSeatMap untuk pembeli. Respons sengaja tetap no-store (bawaan
// response.JSON) karena status kursi berubah tiap ada pesanan.
func (h *Seating) PublicSeatMap(w http.ResponseWriter, r *http.Request) {
	eventID, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		response.NotFound(w, r, msgSeatMapNotFound)
		return
	}
	m, err := h.seating.PublicSeatMap(r.Context(), eventID)
	if err != nil {
		writeSeatingError(w, r, err)
		return
	}
	response.OK(w, r, "Denah kursi dimuat.", map[string]any{
		"layout": seatLayoutOf(m.Layout),
		"blocks": seatPublicBlocksOf(m.Blocks),
		"seats":  seatListOf(m.Seats, seatPublicStatus),
	})
}
