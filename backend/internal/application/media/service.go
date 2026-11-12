// Package media melayani penyelenggara dan admin yang mengatur poster dan
// galeri event.
package media

import (
	"context"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/media"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

type Service struct {
	repo     media.Repository
	files    media.FileStore
	maxBytes int64
}

// New: maxBytes <= 0 berarti pakai batas bawaan 5 MiB.
func New(repo media.Repository, files media.FileStore, maxBytes int64) *Service {
	if maxBytes <= 0 {
		maxBytes = media.DefaultMaxBytes
	}
	return &Service{repo: repo, files: files, maxBytes: maxBytes}
}

func (s *Service) MaxBytes() int64 { return s.maxBytes }

// Upload adalah isi berkas mentah plus teks alternatif opsional.
type Upload struct {
	Data []byte
	Alt  string
}

func (s *Service) List(ctx context.Context, session user.Session, eventID uuid.UUID) ([]media.Image, error) {
	if _, err := s.event(ctx, session, eventID); err != nil {
		return nil, err
	}
	return s.repo.List(ctx, eventID)
}

// UploadPoster mengganti poster lama. Berkas lama baru dihapus setelah baris
// baru ter-commit; kalau urutannya dibalik dan transaksi gagal, event bisa
// tertinggal dengan poster_url yang menunjuk ke berkas yang sudah tidak ada.
func (s *Service) UploadPoster(ctx context.Context, session user.Session, eventID uuid.UUID, up Upload) (media.Image, error) {
	if _, err := s.editableEvent(ctx, session, eventID); err != nil {
		return media.Image{}, err
	}
	img, err := s.prepare(eventID, up, media.KindPoster)
	if err != nil {
		return media.Image{}, err
	}
	created, old, err := s.repo.ReplacePoster(ctx, img)
	if err != nil {
		_ = s.files.Delete(img.FileName)
		return media.Image{}, err
	}
	for _, o := range old {
		// shortcut: gagal hapus berkas lama cuma menyisakan berkas yatim di
		// disk, tidak merusak data. Bisa disapu job pembersih nanti.
		_ = s.files.Delete(o.FileName)
	}
	return created, nil
}

func (s *Service) UploadGallery(ctx context.Context, session user.Session, eventID uuid.UUID, up Upload) (media.Image, error) {
	// Cek awal ini cuma supaya galeri penuh tidak sempat menulis berkas ke disk.
	// Penjaga sebenarnya ada di repository yang mengunci baris event.
	if _, err := s.editableEvent(ctx, session, eventID); err != nil {
		return media.Image{}, err
	}
	if n, err := s.repo.CountGallery(ctx, eventID); err != nil {
		return media.Image{}, err
	} else if n >= media.MaxGallery {
		return media.Image{}, media.ErrGalleryFull
	}
	img, err := s.prepare(eventID, up, media.KindGallery)
	if err != nil {
		return media.Image{}, err
	}
	created, err := s.repo.AddGallery(ctx, img, media.MaxGallery)
	if err != nil {
		_ = s.files.Delete(img.FileName)
		return media.Image{}, err
	}
	return created, nil
}

func (s *Service) DeleteImage(ctx context.Context, session user.Session, imageID uuid.UUID) error {
	if _, err := s.image(ctx, session, imageID); err != nil {
		return err
	}
	removed, err := s.repo.Delete(ctx, imageID)
	if err != nil {
		return err
	}
	_ = s.files.Delete(removed.FileName) // sama seperti poster lama: yatim lebih aman daripada gagal
	return nil
}

// ReorderGallery mengembalikan daftar lengkap (poster + galeri) dengan urutan baru.
func (s *Service) ReorderGallery(ctx context.Context, session user.Session, eventID uuid.UUID, ids []uuid.UUID) ([]media.Image, error) {
	if _, err := s.editableEvent(ctx, session, eventID); err != nil {
		return nil, err
	}
	if err := s.repo.Reorder(ctx, eventID, ids); err != nil {
		return nil, err
	}
	return s.repo.List(ctx, eventID)
}

func (s *Service) UpdateAlt(ctx context.Context, session user.Session, imageID uuid.UUID, alt string) (media.Image, error) {
	clean, err := media.CleanAlt(alt)
	if err != nil {
		return media.Image{}, err
	}
	if _, err := s.image(ctx, session, imageID); err != nil {
		return media.Image{}, err
	}
	return s.repo.UpdateAlt(ctx, imageID, clean)
}

// prepare memeriksa isi berkas lalu menyimpannya ke disk. Akses sudah dicek
// pemanggil lebih dulu, supaya orang luar tidak bisa membedakan 404 dan 415.
// Pemanggil juga wajib menghapus berkasnya bila langkah database gagal.
func (s *Service) prepare(eventID uuid.UUID, up Upload, kind string) (media.NewImage, error) {
	alt, err := media.CleanAlt(up.Alt)
	if err != nil {
		return media.NewImage{}, err
	}
	info, err := media.Inspect(up.Data, s.maxBytes)
	if err != nil {
		return media.NewImage{}, err
	}
	name, err := s.files.Save(up.Data, info.Ext)
	if err != nil {
		return media.NewImage{}, err
	}
	return media.NewImage{
		EventID: eventID, Kind: kind, FileName: name, ContentType: info.ContentType,
		Width: int32(info.Width), Height: int32(info.Height), SizeBytes: int32(info.Size), Alt: alt,
	}, nil
}

// image mencari gambar lalu memeriksa event pemiliknya. Gambar milik event
// orang lain dijawab ErrNotFound, sama dengan gambar yang memang tidak ada.
func (s *Service) image(ctx context.Context, session user.Session, imageID uuid.UUID) (media.Image, error) {
	img, err := s.repo.Get(ctx, imageID)
	if err != nil {
		return media.Image{}, err
	}
	if _, err := s.editableEvent(ctx, session, img.EventID); err != nil {
		return media.Image{}, err
	}
	return img, nil
}

func (s *Service) editableEvent(ctx context.Context, session user.Session, eventID uuid.UUID) (media.EventRef, error) {
	ev, err := s.event(ctx, session, eventID)
	if err != nil {
		return media.EventRef{}, err
	}
	if !ev.Editable() {
		return media.EventRef{}, media.ErrEventNotEditable
	}
	return ev, nil
}

// event menyamakan "tidak ada" dan "bukan milikmu" jadi ErrNotFound supaya
// penyelenggara lain tidak bisa menebak-nebak ID event yang ada.
func (s *Service) event(ctx context.Context, session user.Session, eventID uuid.UUID) (media.EventRef, error) {
	ev, err := s.repo.Event(ctx, eventID)
	if err != nil {
		return media.EventRef{}, err
	}
	if !canManage(session, ev) {
		return media.EventRef{}, media.ErrNotFound
	}
	return ev, nil
}

func canManage(session user.Session, ev media.EventRef) bool {
	switch session.Role {
	case user.RoleAdmin:
		return true
	case user.RoleOrganizer:
		return session.OrganizerID != nil && ev.OrganizerID != nil && *session.OrganizerID == *ev.OrganizerID
	}
	return false
}
