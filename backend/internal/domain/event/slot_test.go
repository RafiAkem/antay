package event

import (
	"testing"

	"github.com/google/uuid"
)

func TestAvailabilityMarksSlotsAndSkipsPastLeft(t *testing.T) {
	ev := Event{OpenMinutes: 600, CloseMinutes: 690, SlotMinutes: 30, SlotCapacity: 10}
	counts := map[int32]SlotCount{600: {Booked: 4}, 630: {Booked: 12, Redeemed: 3}}

	got := ev.Availability(counts, 640) // 10:40, slot 10:30 berjalan

	if len(got.Slots) != 3 {
		t.Fatalf("mau 3 slot, dapat %d", len(got.Slots))
	}
	if !got.Slots[0].Past || got.Slots[0].Left != 6 {
		t.Fatalf("slot 10:00 harus lewat dengan sisa 6, dapat %+v", got.Slots[0])
	}
	if !got.Slots[1].Current || got.Slots[1].Left != 0 {
		t.Fatalf("slot 10:30 harus berjalan dan sisa tidak negatif, dapat %+v", got.Slots[1])
	}
	if got.LeftTotal != 10 {
		t.Fatalf("LeftTotal hanya slot yang belum lewat (0 + 10), dapat %d", got.LeftTotal)
	}
}

func TestOccupiedCountsIncludesRedeemed(t *testing.T) {
	id := uuid.New()
	rows := []SlotBooking{{EventID: id, SlotStart: 600, Booked: 5, Redeemed: 2}}

	if got := OccupiedCounts(rows)[id][600]; got != (SlotCount{Booked: 7, Redeemed: 2}) {
		t.Fatalf("OccupiedCounts = %+v, mau booked 7", got)
	}
}

func TestIsSlotStart(t *testing.T) {
	ev := Event{OpenMinutes: 600, CloseMinutes: 720, SlotMinutes: 30}
	cases := map[int32]bool{600: true, 630: true, 690: true, 720: false, 610: false, 570: false}
	for minutes, want := range cases {
		if got := ev.IsSlotStart(minutes); got != want {
			t.Errorf("IsSlotStart(%d) = %v, mau %v", minutes, got, want)
		}
	}
}

func TestQueue(t *testing.T) {
	cases := []struct {
		name                      string
		waiting, service, counter int32
		want                      Queue
	}{
		{"kosong", 0, 90, 2, Queue{Waiting: 0, WaitMinutes: 0, CountersNeeded: 1}},
		{"dibulatkan ke atas", 3, 90, 2, Queue{Waiting: 3, WaitMinutes: 3, CountersNeeded: 1}},
		{"lewat batas", 34, 72, 3, Queue{Waiting: 34, WaitMinutes: 14, CountersNeeded: 3}},
		{"panjang", 40, 90, 2, Queue{Waiting: 40, WaitMinutes: 30, CountersNeeded: 4, Long: true}},
		{"tanpa loket", 5, 90, 0, Queue{Waiting: 5, WaitMinutes: 0, CountersNeeded: 1}},
	}
	for _, tc := range cases {
		ev := Event{WaitingCount: tc.waiting, ServiceSeconds: tc.service, CounterCount: tc.counter}
		if got := ev.Queue(); got != tc.want {
			t.Errorf("%s: Queue = %+v, mau %+v", tc.name, got, tc.want)
		}
	}
}

func TestQueueUpdateValidate(t *testing.T) {
	neg, zero, ok := int32(-1), int32(0), int32(3)
	if issues := (QueueUpdate{WaitingCount: &neg, CounterCount: &zero}).Validate(); len(issues) != 2 {
		t.Fatalf("mau 2 masalah, dapat %v", issues)
	}
	if issues := (QueueUpdate{WaitingCount: &ok}).Validate(); len(issues) != 0 {
		t.Fatalf("waitingCount 3 seharusnya lolos, dapat %v", issues)
	}
	if !(QueueUpdate{}).Empty() {
		t.Fatal("QueueUpdate kosong harus Empty")
	}
}
