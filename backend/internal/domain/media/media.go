// Package media mengurus gambar event: satu poster dan galeri kecil. Berkasnya
// di disk, database cuma mencatat nama berkas, jenis, dan ukurannya.
package media

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
)

const (
	KindPoster  = "poster"
	KindGallery = "gallery"

	TypeJPEG = "image/jpeg"
	TypePNG  = "image/png"
	TypeWebP = "image/webp"

	// MaxGallery dijaga juga di repository dengan mengunci baris event, jadi dua
	// unggahan bersamaan tidak bisa sama-sama lolos jadi gambar ke-9.
	MaxGallery = 8
	MinSide    = 400
	MaxSide    = 6000
	MaxAltLen  = 200

	DefaultMaxBytes int64 = 5 << 20

	// URLPrefix harus sama dengan rute publik GET /media/{fileName}.
	URLPrefix = "/media/"
)

var (
	ErrNotFound         = errors.New("gambar atau event tidak ditemukan")
	ErrEventNotEditable = errors.New("event sudah ditutup atau dibatalkan")
	ErrUnsupportedType  = errors.New("jenis berkas tidak didukung")
	ErrFileTooLarge     = errors.New("berkas terlalu besar")
	ErrImageTooSmall    = errors.New("resolusi gambar terlalu kecil")
	ErrImageTooLarge    = errors.New("resolusi gambar terlalu besar")
	ErrGalleryFull      = errors.New("galeri sudah penuh")
	ErrInvalidAlt       = errors.New("teks alternatif tidak valid")
	ErrInvalidOrder     = errors.New("urutan galeri tidak valid")
)

// Pola ini kembaran CHECK di tabel event_images. Nama berkas selalu dibuat
// server, jadi apa pun yang tidak cocok pasti bukan berkas kita.
var fileNamePattern = regexp.MustCompile(`^[a-z0-9-]+\.(jpg|png|webp)$`)

func ValidFileName(name string) bool { return fileNamePattern.MatchString(name) }

type Image struct {
	ID          uuid.UUID
	EventID     uuid.UUID
	Kind        string
	FileName    string
	ContentType string
	Width       int32
	Height      int32
	SizeBytes   int32
	Alt         string
	SortOrder   int32
	CreatedAt   time.Time
}

func (i Image) URL() string { return URLPrefix + i.FileName }

// NewImage adalah gambar yang berkasnya sudah tersimpan tapi barisnya belum ada.
type NewImage struct {
	EventID     uuid.UUID
	Kind        string
	FileName    string
	ContentType string
	Width       int32
	Height      int32
	SizeBytes   int32
	Alt         string
}

// EventRef cukup untuk memutuskan siapa boleh mengubah gambar event ini.
type EventRef struct {
	ID          uuid.UUID
	OrganizerID *uuid.UUID
	Status      string
}

// Editable: event yang sudah selesai atau batal tidak perlu ganti gambar lagi,
// dan halaman arsipnya sebaiknya tidak berubah diam-diam.
func (e EventRef) Editable() bool { return e.Status != "closed" && e.Status != "cancelled" }

type Repository interface {
	// Event mengembalikan ErrNotFound bila event tidak ada.
	Event(ctx context.Context, eventID uuid.UUID) (EventRef, error)
	List(ctx context.Context, eventID uuid.UUID) ([]Image, error)
	Get(ctx context.Context, imageID uuid.UUID) (Image, error)
	CountGallery(ctx context.Context, eventID uuid.UUID) (int, error)
	// ReplacePoster menghapus baris poster lama, menyimpan yang baru, dan
	// memperbarui events.poster_url dalam satu transaksi. Poster lama
	// dikembalikan supaya berkasnya dihapus setelah commit.
	ReplacePoster(ctx context.Context, img NewImage) (created Image, old []Image, err error)
	// AddGallery mengembalikan ErrGalleryFull bila sudah ada max gambar.
	AddGallery(ctx context.Context, img NewImage, max int) (Image, error)
	// Delete juga mengosongkan events.poster_url bila yang dihapus poster.
	Delete(ctx context.Context, imageID uuid.UUID) (Image, error)
	// Reorder mengembalikan ErrInvalidOrder bila ids bukan persis semua galeri.
	Reorder(ctx context.Context, eventID uuid.UUID, ids []uuid.UUID) error
	UpdateAlt(ctx context.Context, imageID uuid.UUID, alt string) (Image, error)
}

// FileStore menyimpan berkas dengan nama acak buatan server.
type FileStore interface {
	Save(data []byte, ext string) (fileName string, err error)
	Delete(fileName string) error
}

// CleanAlt merapikan teks alternatif. NUL dan karakter kontrol ditolak karena
// Postgres tidak bisa menyimpan NUL dan sisanya tidak ada gunanya di alt.
func CleanAlt(alt string) (string, error) {
	alt = strings.TrimSpace(alt)
	if !utf8.ValidString(alt) || utf8.RuneCountInString(alt) > MaxAltLen {
		return "", ErrInvalidAlt
	}
	for _, r := range alt {
		if unicode.IsControl(r) {
			return "", ErrInvalidAlt
		}
	}
	return alt, nil
}
