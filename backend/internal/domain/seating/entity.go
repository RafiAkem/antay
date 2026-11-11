package seating

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
)

// Status kursi di tabel seats. held dan sold dikunci: bentuk blok tidak boleh
// diubah selama masih ada kursi seperti itu, karena tiketnya sudah menunjuk
// ke kursi tersebut.
const (
	StatusAvailable = "available"
	StatusHeld      = "held"
	StatusSold      = "sold"
	StatusDisabled  = "disabled"
	// StatusTaken hanya untuk denah publik. held dan sold disatukan supaya
	// pembeli tidak bisa menebak kursi mana yang cuma sedang ditahan.
	StatusTaken = "taken"
)

var (
	ErrEventNotFound    = errors.New("event tidak ditemukan")
	ErrBlockNotFound    = errors.New("blok kursi tidak ditemukan")
	ErrCategoryNotFound = errors.New("kategori tidak ditemukan")
	ErrLayoutNotFound   = errors.New("denah belum dibuat")
	ErrCodeTaken        = errors.New("kode blok sudah dipakai di event ini")
)

const (
	MinCanvas      = 200
	MaxCanvas      = 5000
	MaxNameLength  = 40
	MaxStageLength = 40
)

type Layout struct {
	EventID      uuid.UUID
	CanvasWidth  int
	CanvasHeight int
	Stage        Rect
	StageLabel   string
}

// DefaultLayout sama dengan DEFAULT kolom venue_layouts, dipakai selama
// penyelenggara belum pernah menyimpan denah.
func DefaultLayout(eventID uuid.UUID) Layout {
	return Layout{
		EventID:      eventID,
		CanvasWidth:  1000,
		CanvasHeight: 700,
		Stage:        Rect{X: 350, Y: 20, Width: 300, Height: 60},
		StageLabel:   "Panggung",
	}
}

func (l Layout) Validate() error {
	var issues []Issue
	add := func(field, msg string) { issues = append(issues, Issue{Field: field, Message: msg}) }
	if l.CanvasWidth < MinCanvas || l.CanvasWidth > MaxCanvas {
		add("canvasWidth", "Lebar kanvas 200 sampai 5000.")
	}
	if l.CanvasHeight < MinCanvas || l.CanvasHeight > MaxCanvas {
		add("canvasHeight", "Tinggi kanvas 200 sampai 5000.")
	}
	s := l.Stage
	if s.Width <= 0 || s.Height <= 0 {
		add("stage", "Ukuran panggung harus lebih dari nol.")
	} else if s.X < 0 || s.Y < 0 || s.X+s.Width > l.CanvasWidth || s.Y+s.Height > l.CanvasHeight {
		// Database tidak mengecek ini, tapi panggung di luar kanvas tidak akan
		// kelihatan di editor maupun di halaman pembeli.
		add("stage", "Panggung harus berada di dalam kanvas.")
	}
	if n := utf8.RuneCountInString(l.StageLabel); n < 1 || n > MaxStageLength {
		add("stage.label", "Label panggung 1 sampai 40 karakter.")
	}
	if len(issues) > 0 {
		return InvalidError{Issues: issues}
	}
	return nil
}

// Block adalah satu blok kursi yang tersimpan. SeatCount dihitung dari tabel
// seats, termasuk kursi yang dinonaktifkan.
type Block struct {
	ID           uuid.UUID
	EventID      uuid.UUID
	CategoryID   uuid.UUID
	CategoryName string
	Name         string
	SortOrder    int
	Spec         BlockSpec
	SeatCount    int
}

// Validate memeriksa nama sekaligus parameter bentuk dalam satu daftar.
func (b Block) Validate() error {
	var issues []Issue
	if n := utf8.RuneCountInString(b.Name); n < 1 || n > MaxNameLength {
		issues = append(issues, Issue{Field: "name", Message: "Nama blok 1 sampai 40 karakter."})
	}
	var invalid InvalidError
	if err := b.Spec.Validate(); errors.As(err, &invalid) {
		issues = append(issues, invalid.Issues...)
	}
	if len(issues) > 0 {
		return InvalidError{Issues: issues}
	}
	return nil
}

// CleanText membuang spasi di ujung; btrim di CHECK database juga begitu,
// jadi nama yang isinya cuma spasi ditolak di sini, bukan di database.
func CleanText(s string) string { return strings.TrimSpace(s) }

type Seat struct {
	ID         uuid.UUID
	BlockID    uuid.UUID
	CategoryID uuid.UUID
	EventID    uuid.UUID
	RowLabel   string
	Number     int
	Label      string
	X, Y       int
	Status     string
}

// Locked: kursi yang sudah ditahan pesanan atau terjual.
func (s Seat) Locked() bool { return s.Status == StatusHeld || s.Status == StatusSold }

// PublicStatus adalah status yang boleh dilihat pembeli.
func (s Seat) PublicStatus() string {
	if s.Locked() {
		return StatusTaken
	}
	return s.Status
}

// NewSeat adalah kursi yang akan ditulis ulang saat blok dibuat atau diubah.
type NewSeat struct {
	SeatPos
	Status string
}

type StatusChange struct {
	ID     uuid.UUID
	Status string
}

// EventRef cukup untuk cek pemilik dan status, tanpa memuat seluruh event.
type EventRef struct {
	ID          uuid.UUID
	OrganizerID *uuid.UUID
	Status      string
}

type CategoryRef struct {
	ID       uuid.UUID
	EventID  uuid.UUID
	Name     string
	IsSeated bool
}

// SeatPlan dipanggil repository di dalam transaksi, setelah kursi lama blok
// itu dikunci. Aturannya (blok terkunci, kursi nonaktif dipertahankan) ada di
// service; repository cuma menjamin semuanya terjadi dalam satu transaksi.
type SeatPlan func(current []Seat) ([]NewSeat, error)

type Repository interface {
	EventRef(ctx context.Context, eventID uuid.UUID) (EventRef, error)
	Category(ctx context.Context, id uuid.UUID) (CategoryRef, error)
	// Layout mengembalikan ErrLayoutNotFound bila belum pernah disimpan.
	Layout(ctx context.Context, eventID uuid.UUID) (Layout, error)
	SaveLayout(ctx context.Context, l Layout) (Layout, error)
	Blocks(ctx context.Context, eventID uuid.UUID) ([]Block, error)
	Block(ctx context.Context, id uuid.UUID) (Block, error)
	Seats(ctx context.Context, eventID uuid.UUID) ([]Seat, error)
	// SaveBlock membuat blok bila ID kosong, atau mengubahnya, lalu mengganti
	// semua kursinya dengan hasil plan. ErrCodeTaken bila kodenya bentrok.
	SaveBlock(ctx context.Context, b Block, plan SeatPlan) (Block, error)
	// UpdateBlockInfo hanya mengubah nama dan urutan, kursi tidak disentuh.
	UpdateBlockInfo(ctx context.Context, b Block) (Block, error)
	DeleteBlock(ctx context.Context, id uuid.UUID, check func(current []Seat) error) error
	// ChangeSeats mengunci kursi berlabel tersebut, lalu menerapkan perubahan
	// status dari plan. Yang dikembalikan hanya kursi yang berubah.
	ChangeSeats(ctx context.Context, eventID uuid.UUID, labels []string,
		plan func(current []Seat) ([]StatusChange, error)) ([]Seat, error)
}
