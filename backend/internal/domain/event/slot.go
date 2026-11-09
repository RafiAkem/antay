package event

import "github.com/google/uuid"

// SlotBooking adalah agregat tiket per slot seperti yang dibaca dari penyimpanan:
// Booked hanya tiket berstatus booked, Redeemed hanya yang sudah ditukar.
type SlotBooking struct {
	EventID   uuid.UUID
	SlotStart int32
	Booked    int32
	Redeemed  int32
}

type SlotCount struct {
	Booked   int32
	Redeemed int32
}

// Counts adalah isi slot per event: peta event -> jam mulai slot -> hitungan.
type Counts map[uuid.UUID]map[int32]SlotCount

// OccupiedCounts menghitung redeemed sebagai terisi juga, sehingga sisa kuota
// sama dengan yang dipakai saat memesan tiket. Dipakai halaman pengunjung.
func OccupiedCounts(rows []SlotBooking) Counts {
	return group(rows, func(r SlotBooking) SlotCount {
		return SlotCount{Booked: r.Booked + r.Redeemed, Redeemed: r.Redeemed}
	})
}

// StatusCounts memakai angka mentah per status. Dipakai halaman petugas.
func StatusCounts(rows []SlotBooking) Counts {
	return group(rows, func(r SlotBooking) SlotCount {
		return SlotCount{Booked: r.Booked, Redeemed: r.Redeemed}
	})
}

func group(rows []SlotBooking, count func(SlotBooking) SlotCount) Counts {
	out := make(Counts, len(rows))
	for _, row := range rows {
		if out[row.EventID] == nil {
			out[row.EventID] = make(map[int32]SlotCount)
		}
		out[row.EventID][row.SlotStart] = count(row)
	}
	return out
}

type SlotState struct {
	Start    int32
	End      int32
	Capacity int32
	Booked   int32
	Redeemed int32
	Left     int32
	Past     bool
	Current  bool
}

// Availability adalah event beserta keadaan setiap slotnya pada satu waktu.
type Availability struct {
	Event     Event
	Slots     []SlotState
	LeftTotal int32
}

// Availability menyusun daftar slot dari jam buka/tutup, bukan dari baris
// tiket, supaya slot yang belum dipesan tetap muncul.
func (e Event) Availability(counts map[int32]SlotCount, nowMinutes int32) Availability {
	slots := make([]SlotState, 0, 16)
	var leftTotal int32
	for _, start := range e.SlotStarts() {
		c := counts[start]
		left := e.SlotCapacity - c.Booked
		if left < 0 {
			left = 0
		}
		end := start + e.SlotMinutes
		past := end <= nowMinutes
		if !past {
			leftTotal += left
		}
		slots = append(slots, SlotState{
			Start:    start,
			End:      end,
			Capacity: e.SlotCapacity,
			Booked:   c.Booked,
			Redeemed: c.Redeemed,
			Left:     left,
			Past:     past,
			Current:  start <= nowMinutes && nowMinutes < end,
		})
	}
	return Availability{Event: e, Slots: slots, LeftTotal: leftTotal}
}

// WaitingSlots memilih slot yang sedang berjalan beserta slot berikutnya.
// Di luar jam event hanya slot terdekat yang diambil, dan setelah semua slot
// lewat hasilnya kosong.
func (e Event) WaitingSlots(now int32) []int32 {
	starts := e.SlotStarts()
	for i, start := range starts {
		if start <= now && now < start+e.SlotMinutes {
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
