// Package dto memuat bentuk JSON yang dikirim ke frontend. Didefinisikan di satu
// tempat supaya semua handler tidak mengarang versi masing-masing. Kontraknya
// ada di docs/api-contract.md dan openapi.yaml.
package dto

import (
	"time"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

func UserOf(u user.User) User {
	return User{ID: u.ID.String(), Email: u.Email, Name: u.Name, Role: u.Role}
}

type Slot struct {
	Start    string `json:"start"`
	End      string `json:"end"`
	Capacity int32  `json:"capacity"`
	Booked   int32  `json:"booked"`
	Redeemed int32  `json:"redeemed"`
	Left     int32  `json:"left"`
	Past     bool   `json:"past"`
	Current  bool   `json:"current"`
}

func SlotOf(s event.SlotState) Slot {
	return Slot{
		Start:    shared.ClockOf(s.Start),
		End:      shared.ClockOf(s.End),
		Capacity: s.Capacity,
		Booked:   s.Booked,
		Redeemed: s.Redeemed,
		Left:     s.Left,
		Past:     s.Past,
		Current:  s.Current,
	}
}

func SlotPtrOf(s *event.SlotState) *Slot {
	if s == nil {
		return nil
	}
	out := SlotOf(*s)
	return &out
}

func SlotsOf(states []event.SlotState) []Slot {
	out := make([]Slot, 0, len(states))
	for _, s := range states {
		out = append(out, SlotOf(s))
	}
	return out
}

type Event struct {
	ID             string `json:"id"`
	CodePrefix     string `json:"codePrefix"`
	Name           string `json:"name"`
	Place          string `json:"place"`
	Item           string `json:"item"`
	Requirement    string `json:"requirement"`
	EventDate      string `json:"eventDate"`
	OpenTime       string `json:"openTime"`
	CloseTime      string `json:"closeTime"`
	SlotMinutes    int32  `json:"slotMinutes"`
	SlotCapacity   int32  `json:"slotCapacity"`
	CounterCount   int32  `json:"counterCount"`
	ServiceSeconds int32  `json:"serviceSeconds"`
	WaitingCount   int32  `json:"waitingCount"`
	Status         string `json:"status"`
	LeftTotal      int32  `json:"leftTotal"`
	Slots          []Slot `json:"slots"`
}

func EventOf(av event.Availability) Event {
	ev := av.Event
	return Event{
		ID:             ev.ID.String(),
		CodePrefix:     ev.CodePrefix,
		Name:           ev.Name,
		Place:          ev.Place,
		Item:           ev.Item,
		Requirement:    ev.Requirement,
		EventDate:      ev.Date,
		OpenTime:       shared.ClockOf(ev.OpenMinutes),
		CloseTime:      shared.ClockOf(ev.CloseMinutes),
		SlotMinutes:    ev.SlotMinutes,
		SlotCapacity:   ev.SlotCapacity,
		CounterCount:   ev.CounterCount,
		ServiceSeconds: ev.ServiceSeconds,
		WaitingCount:   ev.WaitingCount,
		Status:         ev.Status,
		LeftTotal:      av.LeftTotal,
		Slots:          SlotsOf(av.Slots),
	}
}

func EventsOf(list []event.Availability) []Event {
	out := make([]Event, 0, len(list))
	for _, av := range list {
		out = append(out, EventOf(av))
	}
	return out
}

type EventRef struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Place       string `json:"place"`
	Item        string `json:"item"`
	Requirement string `json:"requirement"`
	SlotMinutes int32  `json:"slotMinutes"`
}

func EventRefOf(ev event.Event) EventRef {
	return EventRef{
		ID:          ev.ID.String(),
		Name:        ev.Name,
		Place:       ev.Place,
		Item:        ev.Item,
		Requirement: ev.Requirement,
		SlotMinutes: ev.SlotMinutes,
	}
}

type Queue struct {
	Waiting        int32 `json:"waiting"`
	WaitMinutes    int32 `json:"waitMinutes"`
	CountersNeeded int32 `json:"countersNeeded"`
	Long           bool  `json:"long"`
}

func QueueOf(q event.Queue) Queue {
	return Queue{
		Waiting:        q.Waiting,
		WaitMinutes:    q.WaitMinutes,
		CountersNeeded: q.CountersNeeded,
		Long:           q.Long,
	}
}

type Ticket struct {
	ID              string     `json:"id"`
	Code            string     `json:"code"`
	VisitorName     string     `json:"visitorName"`
	SlotStart       string     `json:"slotStart"`
	SlotEnd         string     `json:"slotEnd"`
	Status          string     `json:"status"`
	RedeemedAt      *time.Time `json:"redeemedAt"`
	RedeemedCounter *int32     `json:"redeemedCounter"`
	Event           EventRef   `json:"event"`
	Queue           Queue      `json:"queue"`
}

func TicketOf(t ticket.Ticket, ev event.Event) Ticket {
	return Ticket{
		ID:              t.ID.String(),
		Code:            t.Code,
		VisitorName:     t.VisitorName,
		SlotStart:       shared.ClockOf(t.SlotStart),
		SlotEnd:         shared.ClockOf(t.SlotStart + ev.SlotMinutes),
		Status:          t.Status,
		RedeemedAt:      t.RedeemedAt,
		RedeemedCounter: t.RedeemedCounter,
		Event:           EventRefOf(ev),
		Queue:           QueueOf(ev.Queue()),
	}
}

func FieldDetails(issues []event.FieldIssue) []response.ErrorDetail {
	out := make([]response.ErrorDetail, 0, len(issues))
	for _, i := range issues {
		out = append(out, response.ErrorDetail{Field: i.Field, Issue: i.Issue})
	}
	return out
}
