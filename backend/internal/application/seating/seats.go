package seating

import (
	"context"
	"errors"
	"sort"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

// SetSeatsDisabled menandai kursi tidak dipakai (tiang, meja teknis) atau
// mengaktifkannya lagi.
func (s *Service) SetSeatsDisabled(ctx context.Context, actor user.Session, eventID uuid.UUID, labels []string, disabled bool) ([]seating.Seat, error) {
	if disabled {
		return s.UpdateSeats(ctx, actor, eventID, labels, nil)
	}
	return s.UpdateSeats(ctx, actor, eventID, nil, labels)
}

// UpdateSeats menjalankan nonaktif dan aktif sekaligus dalam satu transaksi,
// supaya klik beruntun di editor bisa dikirim sebagai satu permintaan.
// Hanya available <-> disabled; kursi held atau sold menggagalkan semuanya.
func (s *Service) UpdateSeats(ctx context.Context, actor user.Session, eventID uuid.UUID, disable, enable []string) ([]seating.Seat, error) {
	if _, err := s.authorizeEdit(ctx, actor, eventID); err != nil {
		return nil, err
	}
	target := make(map[string]string, len(disable)+len(enable))
	for _, l := range disable {
		target[l] = seating.StatusDisabled
	}
	for _, l := range enable {
		if target[l] == seating.StatusDisabled {
			return nil, ErrSeatInBothLists
		}
		target[l] = seating.StatusAvailable
	}
	if len(target) == 0 {
		return []seating.Seat{}, nil
	}
	labels := make([]string, 0, len(target))
	for l := range target {
		labels = append(labels, l)
	}
	sort.Strings(labels)

	changed, err := s.repo.ChangeSeats(ctx, eventID, labels, func(current []seating.Seat) ([]seating.StatusChange, error) {
		return planStatus(labels, target, current)
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(changed, func(i, j int) bool { return changed[i].Label < changed[j].Label })
	return changed, nil
}

func planStatus(labels []string, target map[string]string, current []seating.Seat) ([]seating.StatusChange, error) {
	found := make(map[string]seating.Seat, len(current))
	for _, c := range current {
		found[c.Label] = c
	}
	var unknown, locked []string
	for _, l := range labels {
		seat, ok := found[l]
		switch {
		case !ok:
			unknown = append(unknown, l)
		case seat.Locked():
			locked = append(locked, l)
		}
	}
	if len(unknown) > 0 {
		return nil, UnknownSeatsError{Labels: unknown}
	}
	if len(locked) > 0 {
		return nil, SeatLockedError{Labels: locked}
	}
	changes := make([]seating.StatusChange, 0, len(labels))
	for _, l := range labels {
		// Kursi yang sudah berstatus tujuan dilewati, jadi kirim ulang aman.
		if seat := found[l]; seat.Status != target[l] {
			changes = append(changes, seating.StatusChange{ID: seat.ID, Status: target[l]})
		}
	}
	return changes, nil
}

// IsInvalid membantu handler mengenali error validasi dari domain.
func IsInvalid(err error) (seating.InvalidError, bool) {
	var invalid seating.InvalidError
	ok := errors.As(err, &invalid)
	return invalid, ok
}
