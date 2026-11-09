package ticket

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var (
	ErrNotFound      = errors.New("tiket tidak ditemukan")
	ErrSlotInvalid   = errors.New("slot tidak valid")
	ErrSlotPast      = errors.New("slot sudah lewat")
	ErrSlotFull      = errors.New("slot penuh")
	ErrEventClosed   = errors.New("event sudah tutup hari ini")
	ErrEventGone     = errors.New("event tidak lagi dibuka")
	ErrDuplicateCode = errors.New("kode tiket bentrok")
	ErrNotRedeemable = errors.New("tiket tidak bisa ditukar")
)

type Booking struct {
	EventID      uuid.UUID
	SlotCapacity int32
	SlotStart    int32
	Code         string
	VisitorName  string
}

type Redemption struct {
	Code       string
	EventID    uuid.UUID
	Counter    int32
	RedeemedBy uuid.UUID
}

type Repository interface {
	// Book menyimpan tiket bila kuota slot masih ada. Mengembalikan ErrSlotFull,
	// ErrEventGone, atau ErrDuplicateCode bila kode sudah dipakai.
	Book(ctx context.Context, b Booking) (Ticket, error)
	// GetByCode mengembalikan ErrNotFound bila kode tidak dikenal.
	GetByCode(ctx context.Context, code string) (WithEvent, error)
	ListWaiting(ctx context.Context, eventID uuid.UUID, slotStarts []int32) ([]Ticket, error)
	// Redeem mengembalikan ErrNotRedeemable bila tiket tidak lagi berstatus booked.
	Redeem(ctx context.Context, r Redemption) (Ticket, error)
}
