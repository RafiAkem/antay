// Package eventadmin melayani organizer dan admin yang menyusun event versi 2:
// data event, kategori, paket, dan alur status draft -> review -> published.
package eventadmin

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

var (
	ErrCategoryNotFound  = errors.New("kategori tidak ditemukan")
	ErrPackageNotFound   = errors.New("paket tidak ditemukan")
	ErrOrganizerInvalid  = errors.New("penyelenggara tidak ada atau sudah nonaktif")
	ErrCategoryHasSeats  = errors.New("kategori sudah punya blok kursi")
	ErrCategoryNameTaken = errors.New("nama kategori sudah dipakai di event ini")
	ErrPackageNameTaken  = errors.New("nama paket sudah dipakai di kategori ini")
	ErrSold              = errors.New("sudah ada yang terjual")
	ErrForbidden         = errors.New("aksi ini khusus admin")
	ErrBadStatusFilter   = errors.New("filter status tidak dikenal")
)

// ValidationError membawa hasil validasi lengkap; bentuknya sama dengan milik
// scheduling supaya handler bisa memakai pemetaan status yang sama.
type ValidationError struct{ Validation event.Validation }

func (e ValidationError) Error() string { return "isian tidak valid" }

func fieldError(issues []event.FieldIssue) ValidationError {
	return ValidationError{Validation: event.Validation{FieldErrors: issues}}
}

// NotEditableError mencatat field yang ditolak, kosong bila seluruh event
// sedang tidak bisa diubah (review, closed, cancelled).
type NotEditableError struct{ Fields []string }

func (e NotEditableError) Error() string { return "event tidak bisa diubah pada status ini" }

// IncompleteError berisi alasan event belum bisa diajukan.
type IncompleteError struct{ Issues []event.FieldIssue }

func (e IncompleteError) Error() string { return "event belum lengkap" }

// Actor adalah pemanggil dari sesi. Admin melihat semua event, organizer
// hanya event miliknya.
type Actor struct {
	UserID      uuid.UUID
	Role        string
	OrganizerID *uuid.UUID
}

func (a Actor) IsAdmin() bool { return a.Role == user.RoleAdmin }

// Scope adalah nilai filter organizer_id di query. Non-admin tanpa
// OrganizerID diberi uuid.Nil, bukan nil, supaya tidak pernah mendapat akses
// selevel admin hanya karena sesinya janggal.
func (a Actor) Scope() *uuid.UUID {
	if a.IsAdmin() {
		return nil
	}
	if a.OrganizerID == nil {
		nobody := uuid.Nil
		return &nobody
	}
	return a.OrganizerID
}

// Managed adalah event plus kolom alur status yang tidak ada di event.Event.
type Managed struct {
	event.Event
	SubmittedAt   *time.Time
	PublishedAt   *time.Time
	OrganizerName string
}

type ManagedCategory struct {
	category.Category
	SeatCount int32
	Packages  []category.Package
}

type Detail struct {
	Managed
	Categories []ManagedCategory
}

// CategoryRecord dan PackageRecord membawa status event induk karena aturan
// ubah kategori dan paket bergantung padanya.
type CategoryRecord struct {
	category.Category
	EventStatus string
	SeatCount   int32
	BlockCount  int32
}

type PackageRecord struct {
	category.Package
	EventStatus string
}

type NewEvent struct {
	EventValues
	CodePrefix  string
	CreatedBy   uuid.UUID
	OrganizerID *uuid.UUID
}

// Repository: scope nil artinya admin. Semua Get mengembalikan
// event.ErrNotFound, ErrCategoryNotFound, atau ErrPackageNotFound bila tidak
// ada atau milik organizer lain. Update dan Delete juga mengembalikan error
// not found yang sama bila barisnya tidak kena (misal status berubah).
type Repository interface {
	ListEvents(ctx context.Context, scope *uuid.UUID, status *string) ([]Managed, error)
	GetEvent(ctx context.Context, scope *uuid.UUID, id uuid.UUID) (Managed, error)
	CreateEvent(ctx context.Context, ev NewEvent) (Managed, error)
	UpdateEvent(ctx context.Context, scope *uuid.UUID, id uuid.UUID, expectedStatus, codePrefix string, v EventValues) (Managed, error)
	DeleteDraftEvent(ctx context.Context, scope *uuid.UUID, id uuid.UUID) error
	TransitionEvent(ctx context.Context, scope *uuid.UUID, id uuid.UUID, change event.StatusChange) (Managed, error)
	// OrganizerActive mengembalikan false tanpa error bila organizer tidak ada.
	OrganizerActive(ctx context.Context, id uuid.UUID) (bool, error)

	ListCategories(ctx context.Context, scope *uuid.UUID, eventID uuid.UUID) ([]ManagedCategory, error)
	GetCategory(ctx context.Context, scope *uuid.UUID, id uuid.UUID) (CategoryRecord, error)
	CreateCategory(ctx context.Context, scope *uuid.UUID, eventID uuid.UUID, in category.CategoryInput) (category.Category, error)
	UpdateCategory(ctx context.Context, scope *uuid.UUID, id uuid.UUID, in category.CategoryInput) (category.Category, error)
	DeleteCategory(ctx context.Context, scope *uuid.UUID, id uuid.UUID) error

	ListPackages(ctx context.Context, scope *uuid.UUID, categoryID uuid.UUID) ([]category.Package, error)
	GetPackage(ctx context.Context, scope *uuid.UUID, id uuid.UUID) (PackageRecord, error)
	CreatePackage(ctx context.Context, scope *uuid.UUID, categoryID uuid.UUID, in category.PackageInput) (category.Package, error)
	UpdatePackage(ctx context.Context, scope *uuid.UUID, id uuid.UUID, in category.PackageInput) (category.Package, error)
	DeletePackage(ctx context.Context, scope *uuid.UUID, id uuid.UUID) error
}

type Service struct {
	repo  Repository
	clock shared.Clock
}

func New(repo Repository, clock shared.Clock) *Service {
	return &Service{repo: repo, clock: clock}
}

var knownStatuses = map[string]bool{
	event.StatusDraft: true, event.StatusReview: true, event.StatusPublished: true,
	event.StatusClosed: true, event.StatusCancelled: true,
}

// List: status kosong berarti semua status.
func (s *Service) List(ctx context.Context, actor Actor, status string) ([]Managed, error) {
	var filter *string
	if status != "" {
		if !knownStatuses[status] {
			return nil, ErrBadStatusFilter
		}
		filter = &status
	}
	return s.repo.ListEvents(ctx, actor.Scope(), filter)
}

func (s *Service) Get(ctx context.Context, actor Actor, id uuid.UUID) (Detail, error) {
	ev, err := s.repo.GetEvent(ctx, actor.Scope(), id)
	if err != nil {
		return Detail{}, err
	}
	return s.withCategories(ctx, actor, ev)
}

func (s *Service) withCategories(ctx context.Context, actor Actor, ev Managed) (Detail, error) {
	cats, err := s.repo.ListCategories(ctx, actor.Scope(), ev.ID)
	if err != nil {
		return Detail{}, err
	}
	return Detail{Managed: ev, Categories: cats}, nil
}

// soldCount adalah sambungan untuk fase 3. Sekarang belum ada pesanan, jadi
// selalu 0 dan semua perubahan harga atau kuota lolos. Nanti isinya hitungan
// order_items yang sudah dibayar: orang untuk kategori, jumlah paket untuk paket.
func (s *Service) soldCount(_ context.Context, _ uuid.UUID) (int32, error) {
	return 0, nil
}
