package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/reporting"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// Reporting melayani dasbor manajemen mal.
type Reporting struct {
	reporting *reporting.Service
}

func NewReporting(s *reporting.Service) *Reporting { return &Reporting{reporting: s} }

type summaryTotals struct {
	Registered int32 `json:"registered"`
	Redeemed   int32 `json:"redeemed"`
	Pending    int32 `json:"pending"`
	Cancelled  int32 `json:"cancelled"`
	NoShow     int32 `json:"noShow"`
	Capacity   int32 `json:"capacity"`
	Left       int32 `json:"left"`
}

type summarySlot struct {
	Start      string `json:"start"`
	End        string `json:"end"`
	Registered int32  `json:"registered"`
	Redeemed   int32  `json:"redeemed"`
	Capacity   int32  `json:"capacity"`
	Past       bool   `json:"past"`
	Current    bool   `json:"current"`
}

type summaryBody struct {
	Event  dto.EventRef  `json:"event"`
	Totals summaryTotals `json:"totals"`
	Slots  []summarySlot `json:"slots"`
}

func (h *Reporting) Summary(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		response.NotFound(w, r, msgEventNotFound)
		return
	}
	s, err := h.reporting.Summary(r.Context(), id)
	if err != nil {
		if errors.Is(err, event.ErrNotFound) {
			response.NotFound(w, r, msgEventNotFound)
			return
		}
		response.Internal(w, r)
		return
	}

	slots := make([]summarySlot, 0, len(s.Slots))
	for _, sl := range s.Slots {
		slots = append(slots, summarySlot{
			Start:      shared.ClockOf(sl.Start),
			End:        shared.ClockOf(sl.End),
			Registered: sl.Registered,
			Redeemed:   sl.Redeemed,
			Capacity:   sl.Capacity,
			Past:       sl.Past,
			Current:    sl.Current,
		})
	}
	t := s.Totals
	response.OK(w, r, "Data retrieved", summaryBody{
		Event: dto.EventRefOf(s.Event),
		Totals: summaryTotals{
			Registered: t.Registered,
			Redeemed:   t.Redeemed,
			Pending:    t.Pending,
			Cancelled:  t.Cancelled,
			NoShow:     t.NoShow,
			Capacity:   t.Capacity,
			Left:       t.Left,
		},
		Slots: slots,
	})
}

type overviewEvent struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Place      string    `json:"place"`
	OpenTime   string    `json:"openTime"`
	CloseTime  string    `json:"closeTime"`
	Registered int32     `json:"registered"`
	Redeemed   int32     `json:"redeemed"`
	Queue      dto.Queue `json:"queue"`
}

func (h *Reporting) Overview(w http.ResponseWriter, r *http.Request) {
	rows, err := h.reporting.Overview(r.Context())
	if err != nil {
		response.Internal(w, r)
		return
	}
	events := make([]overviewEvent, 0, len(rows))
	for _, row := range rows {
		events = append(events, overviewEvent{
			ID:         row.ID.String(),
			Name:       row.Name,
			Place:      row.Place,
			OpenTime:   shared.ClockOf(row.OpenMinutes),
			CloseTime:  shared.ClockOf(row.CloseMinutes),
			Registered: row.Registered,
			Redeemed:   row.Redeemed,
			Queue:      dto.QueueOf(row.Queue),
		})
	}
	response.OK(w, r, "Data retrieved", map[string]any{"events": events})
}
