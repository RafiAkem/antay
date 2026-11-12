// Package seating melayani editor denah kursi milik penyelenggara dan denah
// baca-saja untuk pembeli. Bentuk kursi dihitung domain/seating; di sini
// tinggal aturan siapa boleh mengubah apa dan kapan.
package seating

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

var (
	// ErrNotFound juga dipakai untuk event milik penyelenggara lain, supaya
	// orang luar tidak bisa menebak ID event mana yang ada.
	ErrNotFound          = errors.New("denah tidak ditemukan")
	ErrEventNotEditable  = errors.New("event sudah ditutup atau dibatalkan")
	ErrCategoryNotSeated = errors.New("kategori bukan milik event ini atau tidak memakai kursi")
	ErrBlockLocked       = errors.New("blok punya kursi yang ditahan atau terjual")
	ErrSeatInBothLists   = errors.New("kursi yang sama ada di daftar nonaktif dan aktif")
	ErrCodeTaken         = seating.ErrCodeTaken
)

// SeatLockedError mendaftar kursi yang sudah ditahan atau terjual.
type SeatLockedError struct{ Labels []string }

func (e SeatLockedError) Error() string {
	return fmt.Sprintf("%d kursi sudah ditahan atau terjual", len(e.Labels))
}

// UnknownSeatsError mendaftar label yang tidak ada di denah event ini.
type UnknownSeatsError struct{ Labels []string }

func (e UnknownSeatsError) Error() string {
	return fmt.Sprintf("%d label kursi tidak dikenal", len(e.Labels))
}

type Service struct {
	repo seating.Repository
}

func New(repo seating.Repository) *Service { return &Service{repo: repo} }

// SeatMap adalah satu denah utuh, dipakai editor maupun halaman pembeli.
type SeatMap struct {
	Layout seating.Layout
	Blocks []seating.Block
	Seats  []seating.Seat
}

func (s *Service) SeatMap(ctx context.Context, actor user.Session, eventID uuid.UUID) (SeatMap, error) {
	if _, err := s.authorize(ctx, actor, eventID); err != nil {
		return SeatMap{}, err
	}
	return s.load(ctx, eventID)
}

// PublicSeatMap hanya untuk event yang sudah tayang. Status held dan sold
// disamarkan jadi taken di lapisan handler lewat Seat.PublicStatus.
func (s *Service) PublicSeatMap(ctx context.Context, eventID uuid.UUID) (SeatMap, error) {
	ev, err := s.repo.EventRef(ctx, eventID)
	if errors.Is(err, seating.ErrEventNotFound) || (err == nil && ev.Status != event.StatusPublished) {
		return SeatMap{}, ErrNotFound
	}
	if err != nil {
		return SeatMap{}, err
	}
	return s.load(ctx, eventID)
}

func (s *Service) load(ctx context.Context, eventID uuid.UUID) (SeatMap, error) {
	layout, err := s.layout(ctx, eventID)
	if err != nil {
		return SeatMap{}, err
	}
	blocks, err := s.repo.Blocks(ctx, eventID)
	if err != nil {
		return SeatMap{}, fmt.Errorf("memuat blok kursi: %w", err)
	}
	seats, err := s.repo.Seats(ctx, eventID)
	if err != nil {
		return SeatMap{}, fmt.Errorf("memuat kursi: %w", err)
	}
	return SeatMap{Layout: layout, Blocks: blocks, Seats: seats}, nil
}

func (s *Service) GetLayout(ctx context.Context, actor user.Session, eventID uuid.UUID) (seating.Layout, error) {
	if _, err := s.authorize(ctx, actor, eventID); err != nil {
		return seating.Layout{}, err
	}
	return s.layout(ctx, eventID)
}

func (s *Service) PutLayout(ctx context.Context, actor user.Session, l seating.Layout) (seating.Layout, error) {
	if _, err := s.authorizeEdit(ctx, actor, l.EventID); err != nil {
		return seating.Layout{}, err
	}
	l.StageLabel = seating.CleanText(l.StageLabel)
	if err := l.Validate(); err != nil {
		return seating.Layout{}, err
	}
	return s.repo.SaveLayout(ctx, l)
}

func (s *Service) layout(ctx context.Context, eventID uuid.UUID) (seating.Layout, error) {
	l, err := s.repo.Layout(ctx, eventID)
	if errors.Is(err, seating.ErrLayoutNotFound) {
		return seating.DefaultLayout(eventID), nil
	}
	if err != nil {
		return seating.Layout{}, fmt.Errorf("memuat layout: %w", err)
	}
	return l, nil
}

// authorize: admin boleh semua event, organizer hanya event miliknya. Event
// lama tanpa penyelenggara hanya bisa disentuh admin.
func (s *Service) authorize(ctx context.Context, actor user.Session, eventID uuid.UUID) (seating.EventRef, error) {
	ev, err := s.repo.EventRef(ctx, eventID)
	if errors.Is(err, seating.ErrEventNotFound) {
		return seating.EventRef{}, ErrNotFound
	}
	if err != nil {
		return seating.EventRef{}, fmt.Errorf("memuat event: %w", err)
	}
	if actor.Role == user.RoleAdmin {
		return ev, nil
	}
	if actor.Role != user.RoleOrganizer || actor.OrganizerID == nil ||
		ev.OrganizerID == nil || *actor.OrganizerID != *ev.OrganizerID {
		return seating.EventRef{}, ErrNotFound
	}
	return ev, nil
}

func (s *Service) authorizeEdit(ctx context.Context, actor user.Session, eventID uuid.UUID) (seating.EventRef, error) {
	ev, err := s.authorize(ctx, actor, eventID)
	if err != nil {
		return ev, err
	}
	if ev.Status == event.StatusCancelled || ev.Status == event.StatusClosed {
		return ev, ErrEventNotEditable
	}
	return ev, nil
}

// blockForEdit memuat blok lalu mengecek hak atas event pemiliknya.
func (s *Service) blockForEdit(ctx context.Context, actor user.Session, blockID uuid.UUID) (seating.Block, error) {
	b, err := s.repo.Block(ctx, blockID)
	if errors.Is(err, seating.ErrBlockNotFound) {
		return seating.Block{}, ErrNotFound
	}
	if err != nil {
		return seating.Block{}, fmt.Errorf("memuat blok: %w", err)
	}
	if _, err := s.authorizeEdit(ctx, actor, b.EventID); err != nil {
		return seating.Block{}, err
	}
	return b, nil
}
