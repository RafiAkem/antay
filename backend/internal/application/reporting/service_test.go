package reporting

import (
	"testing"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

func TestBuildSummaryFillsEverySlot(t *testing.T) {
	ev := event.Event{
		CodePrefix: "GL", Name: "Uji", Place: "Lokasi", Item: "Barang",
		Requirement: "Syarat", OpenMinutes: 600, CloseMinutes: 660,
		SlotMinutes: 30, SlotCapacity: 40,
	}
	counts := TicketTotals{Registered: 100, Redeemed: 30, Pending: 70}
	stats := []SlotStat{{SlotStart: 600, Registered: 50, Redeemed: 20}}

	got := buildSummary(ev, counts, 5, stats, 615)

	if len(got.Slots) != 2 {
		t.Fatalf("slot harus lengkap dari jam buka/tutup, dapat %d", len(got.Slots))
	}
	if got.Totals.Capacity != 80 || got.Totals.Left != 0 {
		t.Fatalf("capacity=80 dan left tidak boleh negatif, dapat %+v", got.Totals)
	}
	if !got.Slots[0].Current || got.Slots[0].Past {
		t.Fatalf("slot 10:00 harus current pada 10:15, dapat %+v", got.Slots[0])
	}
	if got.Slots[1].Registered != 0 {
		t.Fatalf("slot tanpa tiket tetap muncul dengan registered 0, dapat %+v", got.Slots[1])
	}
}
