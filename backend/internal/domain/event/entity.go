// Package event adalah aggregate acara: jadwal slot, kuota, dan antrean loket.
package event

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// Alur status versi 2: draft -> review -> published -> closed. Admin bisa
// mengembalikan review ke draft, atau membatalkan event published. Status
// "open" versi 1 sudah dimigrasi jadi published.
const (
	StatusDraft     = "draft"
	StatusReview    = "review"
	StatusPublished = "published"
	StatusClosed    = "closed"
	StatusCancelled = "cancelled"
)

// Siapa yang menanggung biaya layanan.
const (
	FeeBearerCustomer  = "customer"
	FeeBearerOrganizer = "organizer"
)

type Event struct {
	ID             uuid.UUID
	CodePrefix     string
	Name           string
	Place          string
	Item           string
	Requirement    string
	Date           string
	OpenMinutes    int32
	CloseMinutes   int32
	SlotMinutes    int32
	SlotCapacity   int32
	CounterCount   int32
	ServiceSeconds int32
	WaitingCount   int32
	Status         string

	// OrganizerID kosong untuk event versi 1 yang dibuat langsung oleh admin mal.
	OrganizerID     *uuid.UUID
	Description     string
	PosterURL       string
	SaleStartsAt    *time.Time
	SaleEndsAt      *time.Time
	RejectionReason *string
	FeeBearer       string
	// FeePercentBP dalam basis poin: 250 artinya 2,5%.
	FeePercentBP int32
	FeeFlat      int64
}

// SlotStarts menghasilkan jam mulai setiap slot untuk satu event.
func (e Event) SlotStarts() []int32 {
	var out []int32
	for m := e.OpenMinutes; m+e.SlotMinutes <= e.CloseMinutes; m += e.SlotMinutes {
		out = append(out, m)
	}
	return out
}

func (e Event) IsSlotStart(minutes int32) bool {
	if minutes < e.OpenMinutes || minutes+e.SlotMinutes > e.CloseMinutes {
		return false
	}
	return (minutes-e.OpenMinutes)%e.SlotMinutes == 0
}

// CodePrefix mengambil dua huruf ASCII pertama dari nama. Karakter di luar A-Z
// dilewati supaya hasilnya selalu lolos CHECK database (^[A-Z]{2}$).
func CodePrefix(name string) string {
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
