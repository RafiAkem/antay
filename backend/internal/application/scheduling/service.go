// Package scheduling melayani admin mal yang membuat event baru.
package scheduling

import (
	"context"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

// ValidationError membawa hasil validasi lengkap supaya lapisan HTTP bisa
// memilih kode status per jenis masalah.
type ValidationError struct{ Validation event.Validation }

func (e ValidationError) Error() string { return "isian event tidak valid" }

type Service struct {
	events event.Repository
	clock  shared.Clock
}

func New(events event.Repository, clock shared.Clock) *Service {
	return &Service{events: events, clock: clock}
}

// Create membuat event untuk hari ini dan langsung menayangkannya. Ini masih
// alur dasbor versi 1; alur draft -> review -> published menyusul di modul
// event admin, dan sampai saat itu dasbor lama tetap jalan seperti biasa.
func (s *Service) Create(ctx context.Context, draft event.Draft, createdBy uuid.UUID) (event.Availability, error) {
	v := draft.Validate()
	if !v.OK() {
		return event.Availability{}, ValidationError{Validation: v}
	}
	ev, err := s.events.Create(ctx, event.NewEvent{
		Schedule:   v.Schedule,
		CodePrefix: event.CodePrefix(v.Schedule.Name),
		Date:       s.clock.Today(),
		Status:     event.StatusPublished,
		CreatedBy:  createdBy,
	})
	if err != nil {
		return event.Availability{}, err
	}
	return ev.Availability(nil, s.clock.Minutes()), nil
}
