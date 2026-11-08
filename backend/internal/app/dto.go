package app

import (
	"time"

	"github.com/RafiAkem/antay/backend/internal/store"
)

// Bentuk JSON yang dikirim ke frontend. Didefinisikan di satu tempat supaya
// public, operational, dan analytics tidak mengarang versi masing-masing.

type UserDTO struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

type SlotDTO struct {
	Start    string `json:"start"`
	End      string `json:"end"`
	Capacity int32  `json:"capacity"`
	Booked   int32  `json:"booked"`
	Redeemed int32  `json:"redeemed"`
	Left     int32  `json:"left"`
	Past     bool   `json:"past"`
	Current  bool   `json:"current"`
}

type EventDTO struct {
	ID             string    `json:"id"`
	CodePrefix     string    `json:"codePrefix"`
	Name           string    `json:"name"`
	Place          string    `json:"place"`
	Item           string    `json:"item"`
	Requirement    string    `json:"requirement"`
	EventDate      string    `json:"eventDate"`
	OpenTime       string    `json:"openTime"`
	CloseTime      string    `json:"closeTime"`
	SlotMinutes    int32     `json:"slotMinutes"`
	SlotCapacity   int32     `json:"slotCapacity"`
	CounterCount   int32     `json:"counterCount"`
	ServiceSeconds int32     `json:"serviceSeconds"`
	WaitingCount   int32     `json:"waitingCount"`
	Status         string    `json:"status"`
	LeftTotal      int32     `json:"leftTotal"`
	Slots          []SlotDTO `json:"slots"`
}

type EventRefDTO struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Place       string `json:"place"`
	Item        string `json:"item"`
	Requirement string `json:"requirement"`
	SlotMinutes int32  `json:"slotMinutes"`
}

type QueueDTO struct {
	Waiting        int32 `json:"waiting"`
	WaitMinutes    int32 `json:"waitMinutes"`
	CountersNeeded int32 `json:"countersNeeded"`
	Long           bool  `json:"long"`
}

type TicketDTO struct {
	ID              string      `json:"id"`
	Code            string      `json:"code"`
	VisitorName     string      `json:"visitorName"`
	SlotStart       string      `json:"slotStart"`
	SlotEnd         string      `json:"slotEnd"`
	Status          string      `json:"status"`
	RedeemedAt      *time.Time  `json:"redeemedAt"`
	RedeemedCounter *int32      `json:"redeemedCounter"`
	Event           EventRefDTO `json:"event"`
	Queue           QueueDTO    `json:"queue"`
}

type SlotCount struct {
	Booked   int32
	Redeemed int32
}

func QueueOf(ev store.Event) QueueDTO {
	waiting := ev.WaitingCount
	wait := WaitMinutes(waiting, ev.ServiceSeconds, ev.CounterCount)
	return QueueDTO{
		Waiting:        waiting,
		WaitMinutes:    wait,
		CountersNeeded: CountersNeeded(waiting, ev.ServiceSeconds),
		Long:           wait > WaitLimitMinutes,
	}
}

// BuildEvent menyusun daftar slot dari jam buka/tutup, bukan dari baris tiket,
// supaya slot yang belum dipesan tetap muncul.
func BuildEvent(ev store.Event, counts map[int32]SlotCount, nowMinutes int32) EventDTO {
	slots := make([]SlotDTO, 0, 16)
	var leftTotal int32
	for _, start := range SlotStarts(ev) {
		c := counts[start]
		left := ev.SlotCapacity - c.Booked
		if left < 0 {
			left = 0
		}
		end := start + ev.SlotMinutes
		past := end <= nowMinutes
		if !past {
			leftTotal += left
		}
		slots = append(slots, SlotDTO{
			Start:    ClockOf(start),
			End:      ClockOf(end),
			Capacity: ev.SlotCapacity,
			Booked:   c.Booked,
			Redeemed: c.Redeemed,
			Left:     left,
			Past:     past,
			Current:  start <= nowMinutes && nowMinutes < end,
		})
	}
	return EventDTO{
		ID:             ev.ID.String(),
		CodePrefix:     ev.CodePrefix,
		Name:           ev.Name,
		Place:          ev.Place,
		Item:           ev.Item,
		Requirement:    ev.Requirement,
		EventDate:      ev.EventDate,
		OpenTime:       ClockOf(ev.OpenMinutes),
		CloseTime:      ClockOf(ev.CloseMinutes),
		SlotMinutes:    ev.SlotMinutes,
		SlotCapacity:   ev.SlotCapacity,
		CounterCount:   ev.CounterCount,
		ServiceSeconds: ev.ServiceSeconds,
		WaitingCount:   ev.WaitingCount,
		Status:         ev.Status,
		LeftTotal:      leftTotal,
		Slots:          slots,
	}
}

func EventRefOf(ev store.Event) EventRefDTO {
	return EventRefDTO{
		ID:          ev.ID.String(),
		Name:        ev.Name,
		Place:       ev.Place,
		Item:        ev.Item,
		Requirement: ev.Requirement,
		SlotMinutes: ev.SlotMinutes,
	}
}

func BuildTicket(t store.Ticket, ev store.Event) TicketDTO {
	return TicketDTO{
		ID:              t.ID.String(),
		Code:            t.Code,
		VisitorName:     t.VisitorName,
		SlotStart:       ClockOf(t.SlotStart),
		SlotEnd:         ClockOf(t.SlotStart + ev.SlotMinutes),
		Status:          t.Status,
		RedeemedAt:      TimePtr(t.RedeemedAt),
		RedeemedCounter: t.RedeemedCounter,
		Event:           EventRefOf(ev),
		Queue:           QueueOf(ev),
	}
}
