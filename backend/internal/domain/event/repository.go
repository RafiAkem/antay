package event

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var (
	ErrNotFound    = errors.New("event tidak ditemukan")
	ErrPrefixTaken = errors.New("prefix event untuk tanggal ini sudah dipakai")
)

// NewEvent adalah event yang siap disimpan; ID dibangkitkan penyimpanan.
type NewEvent struct {
	Schedule
	CodePrefix string
	Date       string
	Status     string
	CreatedBy  uuid.UUID
}

type Repository interface {
	ListOpen(ctx context.Context, date string) ([]Event, error)
	ListByDate(ctx context.Context, date string) ([]Event, error)
	// GetOpen dan Get mengembalikan ErrNotFound bila event tidak ada.
	GetOpen(ctx context.Context, id uuid.UUID) (Event, error)
	Get(ctx context.Context, id uuid.UUID) (Event, error)
	// Create mengembalikan ErrPrefixTaken bila prefix+tanggal sudah dipakai.
	Create(ctx context.Context, ev NewEvent) (Event, error)
	UpdateQueue(ctx context.Context, id uuid.UUID, update QueueUpdate) (Event, error)
	SlotBookings(ctx context.Context, ids []uuid.UUID) ([]SlotBooking, error)
}
