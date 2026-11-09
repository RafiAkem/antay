package catalog

import (
	"testing"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

func boardEvent() event.Event {
	return event.Event{OpenMinutes: 600, CloseMinutes: 780, SlotMinutes: 30, SlotCapacity: 10}
}

func TestBuildBoardPicksOpenSlots(t *testing.T) {
	// 10:40: slot 10:30 berjalan, 11:00 penuh, sisanya kosong.
	counts := map[int32]event.SlotCount{660: {Booked: 10}}
	av := boardEvent().Availability(counts, 640)

	b := buildBoard(av, 640)

	if b.CurrentSlot == nil || b.CurrentSlot.Start != 630 {
		t.Fatalf("CurrentSlot harus 10:30, dapat %+v", b.CurrentSlot)
	}
	if b.NextOpenSlot == nil || b.NextOpenSlot.Start != 690 {
		t.Fatalf("NextOpenSlot harus melewati slot penuh ke 11:30, dapat %+v", b.NextOpenSlot)
	}
	want := []int32{630, 690, 720, 750}
	if len(b.Upcoming) != len(want) {
		t.Fatalf("Upcoming = %+v, mau %v", b.Upcoming, want)
	}
	for i, s := range b.Upcoming {
		if s.Start != want[i] {
			t.Fatalf("Upcoming[%d] = %d, mau %d", i, s.Start, want[i])
		}
	}
}

func TestBuildBoardShowsFullSlotsWhenNothingLeft(t *testing.T) {
	counts := map[int32]event.SlotCount{}
	for m := int32(600); m < 780; m += 30 {
		counts[m] = event.SlotCount{Booked: 10}
	}
	av := boardEvent().Availability(counts, 700)

	b := buildBoard(av, 700)

	if b.NextOpenSlot != nil {
		t.Fatalf("tidak ada slot tersisa, NextOpenSlot harus nil, dapat %+v", b.NextOpenSlot)
	}
	if len(b.Upcoming) != 3 || b.Upcoming[0].Start != 690 {
		t.Fatalf("papan tetap menampilkan jadwal berikutnya meski penuh, dapat %+v", b.Upcoming)
	}
}
