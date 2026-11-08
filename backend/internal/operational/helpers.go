package operational

import (
	"strings"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/google/uuid"
)

const earlyWindowMinutes = 15

// normalizeCode menyeragamkan kode tiket. Petugas sering mengetik huruf kecil
// atau menyalin kode dengan spasi ikut terbawa, jadi keduanya dibuang dulu.
func normalizeCode(raw string) string {
	return strings.ToUpper(strings.TrimSpace(raw))
}

// codePrefix mengambil dua huruf ASCII pertama dari nama. Karakter di luar A-Z
// dilewati supaya hasilnya selalu lolos CHECK database (^[A-Z]{2}$).
func codePrefix(name string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(name) {
		if r < 'A' || r > 'Z' {
			continue
		}
		b.WriteRune(r)
		if b.Len() == 2 {
			return b.String()
		}
	}
	for b.Len() < 2 {
		b.WriteByte('X')
	}
	return b.String()
}

// classifyTiming menentukan label untuk petugas. Jendela 15 menit sebelum slot
// dihitung on_time karena tamu sudah boleh dilayani lebih awal; early hanya
// untuk kedatangan yang jauh sebelum itu.
func classifyTiming(now, slotStart, slotMinutes int32, status string) string {
	switch {
	case now < slotStart-earlyWindowMinutes:
		return "early"
	case now < slotStart+slotMinutes:
		return "on_time"
	case status == "redeemed":
		return "past_slot"
	default:
		return "late"
	}
}

// waitingSlots memilih slot yang sedang berjalan beserta slot berikutnya.
// Di luar jam event hanya slot terdekat yang diambil, dan setelah semua slot
// lewat hasilnya kosong.
func waitingSlots(starts []int32, now, slotMinutes int32) []int32 {
	for i, start := range starts {
		if start <= now && now < start+slotMinutes {
			out := []int32{start}
			if i+1 < len(starts) {
				out = append(out, starts[i+1])
			}
			return out
		}
	}
	for _, start := range starts {
		if start > now {
			return []int32{start}
		}
	}
	return nil
}

// parseSlots membaca query "slot" yang berisi jam dipisah koma.
func parseSlots(raw string) ([]int32, error) {
	var out []int32
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		minutes, err := app.MinutesOf(part)
		if err != nil {
			return nil, err
		}
		out = append(out, minutes)
	}
	return out, nil
}

// groupCounts mengubah baris agregat menjadi peta per event, supaya builder
// event tinggal mengambil peta milik satu event.
func groupCounts(rows []store.EventSlotBookingsRow) map[uuid.UUID]map[int32]app.SlotCount {
	out := make(map[uuid.UUID]map[int32]app.SlotCount, len(rows))
	for _, row := range rows {
		if out[row.EventID] == nil {
			out[row.EventID] = make(map[int32]app.SlotCount)
		}
		out[row.EventID][row.SlotStart] = app.SlotCount{Booked: row.Booked, Redeemed: row.Redeemed}
	}
	return out
}

// eventFromTicketRow memakai kolom event yang ikut di-join GetTicketByCode,
// jadi tidak perlu query event kedua hanya untuk menyusun EventRef.
func eventFromTicketRow(row store.GetTicketByCodeRow) store.Event {
	return store.Event{
		ID:             row.EventID,
		Name:           row.EventName,
		Place:          row.EventPlace,
		Item:           row.EventItem,
		Requirement:    row.EventRequirement,
		EventDate:      row.EventDate,
		OpenMinutes:    row.OpenMinutes,
		CloseMinutes:   row.CloseMinutes,
		SlotMinutes:    row.SlotMinutes,
		CounterCount:   row.CounterCount,
		ServiceSeconds: row.ServiceSeconds,
		WaitingCount:   row.WaitingCount,
		Status:         row.EventStatus,
	}
}

func ticketFromRow(row store.GetTicketByCodeRow) store.Ticket {
	return store.Ticket{
		ID:              row.ID,
		Code:            row.Code,
		EventID:         row.EventID,
		VisitorName:     row.VisitorName,
		SlotStart:       row.SlotStart,
		Status:          row.Status,
		RedeemedAt:      row.RedeemedAt,
		RedeemedBy:      row.RedeemedBy,
		RedeemedCounter: row.RedeemedCounter,
		CreatedAt:       row.CreatedAt,
	}
}
