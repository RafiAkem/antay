package ticket

import (
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

// ParseSlot memastikan jam yang dikirim memang batas slot event dan belum
// selesai. Slot yang sedang berjalan masih boleh dipesan.
func ParseSlot(ev event.Event, raw string, nowMinutes int32) (int32, error) {
	minutes, err := shared.MinutesOf(raw)
	if err != nil || !ev.IsSlotStart(minutes) {
		return 0, ErrSlotInvalid
	}
	if minutes+ev.SlotMinutes <= nowMinutes {
		return 0, ErrSlotPast
	}
	return minutes, nil
}
