// Package ticket adalah aggregate tiket: kode, slot kedatangan, dan penukaran.
package ticket

import (
	"crypto/rand"
	"math/big"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

const (
	StatusBooked    = "booked"
	StatusRedeemed  = "redeemed"
	StatusCancelled = "cancelled"
)

const (
	codeAlphabet       = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	codeLength         = 4
	earlyWindowMinutes = 15
)

type Ticket struct {
	ID              uuid.UUID
	Code            string
	EventID         uuid.UUID
	VisitorName     string
	SlotStart       int32
	Status          string
	RedeemedAt      *time.Time
	RedeemedBy      *uuid.UUID
	RedeemedCounter *int32
	CreatedAt       *time.Time
}

// WithEvent adalah tiket beserta event pemiliknya, dibaca sekali jalan.
// Event hanya berisi kolom yang dibutuhkan tampilan tiket dan antrean.
type WithEvent struct {
	Ticket Ticket
	Event  event.Event
}

// NormalizeVisitorName merapikan spasi berlebih sebelum dihitung, karena nama
// yang diketik cepat sering membawa spasi ganda di ujung.
func NormalizeVisitorName(raw string) (string, bool) {
	name := strings.Join(strings.Fields(raw), " ")
	n := utf8.RuneCountInString(name)
	return name, n >= 3 && n <= 60
}

// NormalizeVisitorCode membuat input pengunjung tahan salah ketik: huruf kecil,
// spasi, dan tanda hubung yang lupa ditulis tetap diterima.
func NormalizeVisitorCode(raw string) string {
	code := strings.ToUpper(strings.Join(strings.Fields(raw), ""))
	if !strings.Contains(code, "-") && len(code) > 2 {
		code = code[:2] + "-" + code[2:]
	}
	return code
}

// NormalizeStaffCode menyeragamkan kode tiket yang diketik petugas. Petugas sering
// mengetik huruf kecil atau menyalin kode dengan spasi ikut terbawa.
func NormalizeStaffCode(raw string) string {
	return strings.ToUpper(strings.TrimSpace(raw))
}

func NewCode(prefix string) (string, error) {
	var b strings.Builder
	b.Grow(len(prefix) + 1 + codeLength)
	b.WriteString(prefix)
	b.WriteByte('-')
	for i := 0; i < codeLength; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		if err != nil {
			return "", err
		}
		b.WriteByte(codeAlphabet[n.Int64()])
	}
	return b.String(), nil
}

// Timing menentukan label kedatangan untuk petugas. Jendela 15 menit sebelum
// slot dihitung on_time karena tamu sudah boleh dilayani lebih awal; early hanya
// untuk kedatangan yang jauh sebelum itu.
func Timing(now, slotStart, slotMinutes int32, status string) string {
	switch {
	case now < slotStart-earlyWindowMinutes:
		return "early"
	case now < slotStart+slotMinutes:
		return "on_time"
	case status == StatusRedeemed:
		return "past_slot"
	default:
		return "late"
	}
}
