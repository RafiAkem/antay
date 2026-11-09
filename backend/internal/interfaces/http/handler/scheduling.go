package handler

import (
	"errors"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/application/scheduling"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// Scheduling melayani admin yang membuat event.
type Scheduling struct {
	scheduling *scheduling.Service
}

func NewScheduling(s *scheduling.Service) *Scheduling { return &Scheduling{scheduling: s} }

type createEventRequest struct {
	Name           string `json:"name"`
	Place          string `json:"place"`
	Item           string `json:"item"`
	Requirement    string `json:"requirement"`
	OpenTime       string `json:"openTime"`
	CloseTime      string `json:"closeTime"`
	SlotMinutes    int32  `json:"slotMinutes"`
	SlotCapacity   int32  `json:"slotCapacity"`
	CounterCount   int32  `json:"counterCount"`
	ServiceSeconds int32  `json:"serviceSeconds"`
}

func (h *Scheduling) CreateEvent(w http.ResponseWriter, r *http.Request) {
	var req createEventRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}
	session, ok := middleware.SessionFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return
	}

	av, err := h.scheduling.Create(r.Context(), event.Draft(req), session.UserID)
	var invalid scheduling.ValidationError
	switch {
	case err == nil:
		response.Created(w, r, "Event dibuat.", map[string]any{"event": dto.EventOf(av)})
	case errors.As(err, &invalid):
		writeScheduleIssues(w, r, invalid.Validation)
	case errors.Is(err, event.ErrPrefixTaken):
		response.Conflict(w, r, "Prefix event untuk tanggal ini sudah dipakai. Pilih nama lain.")
	default:
		response.Internal(w, r)
	}
}

// Isian salah bentuk -> 400, angka di luar batas atau jam yang tidak masuk
// akal -> 422.
func writeScheduleIssues(w http.ResponseWriter, r *http.Request, v event.Validation) {
	switch {
	case len(v.FieldErrors) > 0:
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION",
			"Periksa kembali isian event.", dto.FieldDetails(v.FieldErrors))
	case len(v.RangeErrors) > 0:
		response.FailDetails(w, r, http.StatusUnprocessableEntity, "INVALID_SCHEDULE",
			"Angka jadwal di luar batas.", dto.FieldDetails(v.RangeErrors))
	default:
		response.Unprocessable(w, r, "INVALID_SCHEDULE", v.ScheduleIssue)
	}
}
