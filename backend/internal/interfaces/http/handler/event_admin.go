package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const msgManageBadBody = "Body permintaan tidak valid."

// EventAdmin melayani organizer dan admin yang menyusun event versi 2.
type EventAdmin struct {
	svc *eventadmin.Service
}

func NewEventAdmin(svc *eventadmin.Service) *EventAdmin { return &EventAdmin{svc: svc} }

type manageEventCreateRequest struct {
	Name           string  `json:"name"`
	Place          string  `json:"place"`
	Item           string  `json:"item"`
	Requirement    string  `json:"requirement"`
	EventDate      string  `json:"eventDate"`
	OpenTime       string  `json:"openTime"`
	CloseTime      string  `json:"closeTime"`
	SlotMinutes    int32   `json:"slotMinutes"`
	SlotCapacity   int32   `json:"slotCapacity"`
	CounterCount   int32   `json:"counterCount"`
	ServiceSeconds int32   `json:"serviceSeconds"`
	Description    string  `json:"description"`
	SaleStartsAt   *string `json:"saleStartsAt"`
	SaleEndsAt     *string `json:"saleEndsAt"`
	FeeBearer      string  `json:"feeBearer"`
	FeePercentBP   int32   `json:"feePercentBp"`
	FeeFlat        int64   `json:"feeFlat"`
	OrganizerID    *string `json:"organizerId"`
}

// posterUrl sengaja tidak ada: poster diurus endpoint media, dan Decode menolak
// key yang tidak dikenal sehingga kirim posterUrl langsung jadi 400.
type manageEventPatchRequest struct {
	Name           *string              `json:"name"`
	Place          *string              `json:"place"`
	Item           *string              `json:"item"`
	Requirement    *string              `json:"requirement"`
	EventDate      *string              `json:"eventDate"`
	OpenTime       *string              `json:"openTime"`
	CloseTime      *string              `json:"closeTime"`
	SlotMinutes    *int32               `json:"slotMinutes"`
	SlotCapacity   *int32               `json:"slotCapacity"`
	CounterCount   *int32               `json:"counterCount"`
	ServiceSeconds *int32               `json:"serviceSeconds"`
	Description    *string              `json:"description"`
	SaleStartsAt   dto.Nullable[string] `json:"saleStartsAt"`
	SaleEndsAt     dto.Nullable[string] `json:"saleEndsAt"`
	FeeBearer      *string              `json:"feeBearer"`
	FeePercentBP   *int32               `json:"feePercentBp"`
	FeeFlat        *int64               `json:"feeFlat"`
}

type manageRejectRequest struct {
	Reason string `json:"reason"`
}

func (h *EventAdmin) ListEvents(w http.ResponseWriter, r *http.Request) {
	actor, ok := manageActor(w, r)
	if !ok {
		return
	}
	list, err := h.svc.List(r.Context(), actor, r.URL.Query().Get("status"))
	if err != nil {
		writeManageErr(w, r, err)
		return
	}
	response.OK(w, r, "Data retrieved", map[string]any{"events": dto.ManagedEventSummariesOf(list)})
}

func (h *EventAdmin) GetEvent(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "eventId")
	if !ok {
		return
	}
	h.respondEvent(w, r, http.StatusOK, "Data retrieved")(h.svc.Get(r.Context(), actor, id))
}

func (h *EventAdmin) CreateEvent(w http.ResponseWriter, r *http.Request) {
	actor, ok := manageActor(w, r)
	if !ok {
		return
	}
	var req manageEventCreateRequest
	if !decodeManage(w, r, &req) {
		return
	}
	var organizerID *uuid.UUID
	if req.OrganizerID != nil {
		id, err := uuid.Parse(*req.OrganizerID)
		if err != nil {
			response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Periksa kembali isian event.",
				[]response.ErrorDetail{{Field: "organizerId", Issue: "harus UUID"}})
			return
		}
		organizerID = &id
	}
	in := eventadmin.EventInput{
		Name: req.Name, Place: req.Place, Item: req.Item, Requirement: req.Requirement,
		EventDate: req.EventDate, OpenTime: req.OpenTime, CloseTime: req.CloseTime,
		SlotMinutes: req.SlotMinutes, SlotCapacity: req.SlotCapacity,
		CounterCount: req.CounterCount, ServiceSeconds: req.ServiceSeconds,
		Description: req.Description, SaleStartsAt: req.SaleStartsAt, SaleEndsAt: req.SaleEndsAt,
		FeeBearer: req.FeeBearer, FeePercentBP: req.FeePercentBP, FeeFlat: req.FeeFlat,
	}
	h.respondEvent(w, r, http.StatusCreated, "Event dibuat.")(h.svc.Create(r.Context(), actor, in, organizerID))
}

func (h *EventAdmin) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "eventId")
	if !ok {
		return
	}
	var req manageEventPatchRequest
	if !decodeManage(w, r, &req) {
		return
	}
	patch := eventadmin.EventPatch{
		Name: req.Name, Place: req.Place, Item: req.Item, Requirement: req.Requirement,
		EventDate: req.EventDate, OpenTime: req.OpenTime, CloseTime: req.CloseTime,
		SlotMinutes: req.SlotMinutes, SlotCapacity: req.SlotCapacity,
		CounterCount: req.CounterCount, ServiceSeconds: req.ServiceSeconds,
		Description: req.Description, FeeBearer: req.FeeBearer,
		FeePercentBP: req.FeePercentBP, FeeFlat: req.FeeFlat,
		SaleStartsAt: eventadmin.Nullable[string](req.SaleStartsAt),
		SaleEndsAt:   eventadmin.Nullable[string](req.SaleEndsAt),
	}
	h.respondEvent(w, r, http.StatusOK, "Event diperbarui.")(h.svc.Update(r.Context(), actor, id, patch))
}

func (h *EventAdmin) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "eventId")
	if !ok {
		return
	}
	if err := h.svc.Delete(r.Context(), actor, id); err != nil {
		writeManageErr(w, r, err)
		return
	}
	response.OK(w, r, "Event dihapus.", map[string]any{"id": id.String()})
}

// Aksi alur status. Rute sudah membatasi siapa yang boleh, service mengecek
// ulang supaya aturan tidak hanya bergantung pada urutan middleware.
func (h *EventAdmin) Submit(w http.ResponseWriter, r *http.Request) {
	h.transit(w, r, event.ActionSubmit, "", "Event diajukan untuk tayang.")
}

func (h *EventAdmin) Approve(w http.ResponseWriter, r *http.Request) {
	h.transit(w, r, event.ActionApprove, "", "Event disetujui dan sudah tayang.")
}

func (h *EventAdmin) Cancel(w http.ResponseWriter, r *http.Request) {
	h.transit(w, r, event.ActionCancel, "", "Event dibatalkan.")
}

func (h *EventAdmin) Close(w http.ResponseWriter, r *http.Request) {
	h.transit(w, r, event.ActionClose, "", "Event ditutup.")
}

func (h *EventAdmin) Reject(w http.ResponseWriter, r *http.Request) {
	var req manageRejectRequest
	if !decodeManage(w, r, &req) {
		return
	}
	h.transit(w, r, event.ActionReject, req.Reason, "Event dikembalikan ke draft.")
}

func (h *EventAdmin) transit(w http.ResponseWriter, r *http.Request, action event.Action, reason, message string) {
	actor, id, ok := manageTarget(w, r, "eventId")
	if !ok {
		return
	}
	h.respondEvent(w, r, http.StatusOK, message)(h.svc.Transit(r.Context(), actor, id, action, reason))
}

// respondEvent dibuat berbentuk fungsi yang menerima (Detail, error) supaya
// pemanggil bisa langsung meneruskan hasil service dalam satu baris.
func (h *EventAdmin) respondEvent(w http.ResponseWriter, r *http.Request, status int, message string) func(eventadmin.Detail, error) {
	return func(d eventadmin.Detail, err error) {
		if err != nil {
			writeManageErr(w, r, err)
			return
		}
		response.JSON(w, r, status, message, map[string]any{"event": dto.ManagedEventOf(d)})
	}
}

func manageActor(w http.ResponseWriter, r *http.Request) (eventadmin.Actor, bool) {
	s, ok := middleware.SessionFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return eventadmin.Actor{}, false
	}
	return eventadmin.Actor{UserID: s.UserID, Role: s.Role, OrganizerID: s.OrganizerID}, true
}

// manageTarget: id di path yang bukan UUID dijawab 404, sama seperti id yang
// tidak ada, supaya bentuk id tidak memberi petunjuk apa pun.
func manageTarget(w http.ResponseWriter, r *http.Request, param string) (eventadmin.Actor, uuid.UUID, bool) {
	actor, ok := manageActor(w, r)
	if !ok {
		return actor, uuid.Nil, false
	}
	id, err := uuid.Parse(r.PathValue(param))
	if err != nil {
		writeManageErr(w, r, notFoundFor(param))
		return actor, uuid.Nil, false
	}
	return actor, id, true
}

func notFoundFor(param string) error {
	switch param {
	case "categoryId":
		return eventadmin.ErrCategoryNotFound
	case "packageId":
		return eventadmin.ErrPackageNotFound
	}
	return event.ErrNotFound
}
