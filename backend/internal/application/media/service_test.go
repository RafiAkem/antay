package media

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"testing"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/media"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

type fakeRepo struct {
	events    map[uuid.UUID]media.EventRef
	images    map[uuid.UUID]media.Image
	failWrite bool
	// deletedAtCommit mencatat jumlah berkas terhapus saat "commit", untuk
	// memastikan berkas lama belum disentuh sebelum baris baru tersimpan.
	deletedAtCommit int
	files           *fakeFiles
}

func (f *fakeRepo) Event(_ context.Context, id uuid.UUID) (media.EventRef, error) {
	ev, ok := f.events[id]
	if !ok {
		return media.EventRef{}, media.ErrNotFound
	}
	return ev, nil
}

func (f *fakeRepo) List(_ context.Context, id uuid.UUID) ([]media.Image, error) {
	var out []media.Image
	for _, img := range f.images {
		if img.EventID == id {
			out = append(out, img)
		}
	}
	return out, nil
}

func (f *fakeRepo) Get(_ context.Context, id uuid.UUID) (media.Image, error) {
	img, ok := f.images[id]
	if !ok {
		return media.Image{}, media.ErrNotFound
	}
	return img, nil
}

func (f *fakeRepo) CountGallery(_ context.Context, id uuid.UUID) (int, error) {
	n := 0
	for _, img := range f.images {
		if img.EventID == id && img.Kind == media.KindGallery {
			n++
		}
	}
	return n, nil
}

func (f *fakeRepo) insert(img media.NewImage) media.Image {
	out := media.Image{ID: uuid.New(), EventID: img.EventID, Kind: img.Kind, FileName: img.FileName, Width: img.Width, Height: img.Height, Alt: img.Alt}
	f.images[out.ID] = out
	return out
}

func (f *fakeRepo) ReplacePoster(_ context.Context, img media.NewImage) (media.Image, []media.Image, error) {
	if f.failWrite {
		return media.Image{}, nil, errors.New("db mati")
	}
	var old []media.Image
	for id, existing := range f.images {
		if existing.EventID == img.EventID && existing.Kind == media.KindPoster {
			old = append(old, existing)
			delete(f.images, id)
		}
	}
	f.deletedAtCommit = len(f.files.deleted)
	return f.insert(img), old, nil
}

func (f *fakeRepo) AddGallery(ctx context.Context, img media.NewImage, max int) (media.Image, error) {
	if f.failWrite {
		return media.Image{}, errors.New("db mati")
	}
	if n, _ := f.CountGallery(ctx, img.EventID); n >= max {
		return media.Image{}, media.ErrGalleryFull
	}
	return f.insert(img), nil
}

func (f *fakeRepo) Delete(_ context.Context, id uuid.UUID) (media.Image, error) {
	img, ok := f.images[id]
	if !ok {
		return media.Image{}, media.ErrNotFound
	}
	delete(f.images, id)
	return img, nil
}

func (f *fakeRepo) Reorder(context.Context, uuid.UUID, []uuid.UUID) error { return nil }

func (f *fakeRepo) UpdateAlt(_ context.Context, id uuid.UUID, alt string) (media.Image, error) {
	img := f.images[id]
	img.Alt = alt
	f.images[id] = img
	return img, nil
}

type fakeFiles struct {
	saved   []string
	deleted []string
}

func (f *fakeFiles) Save(_ []byte, ext string) (string, error) {
	name := uuid.NewString() + "." + ext
	f.saved = append(f.saved, name)
	return name, nil
}

func (f *fakeFiles) Delete(name string) error {
	f.deleted = append(f.deleted, name)
	return nil
}

var (
	orgA     = uuid.New()
	orgB     = uuid.New()
	eventA   = uuid.New()
	closedEv = uuid.New()
	adminS   = user.Session{UserID: uuid.New(), Role: user.RoleAdmin}
	ownerS   = user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &orgA}
	otherS   = user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &orgB}
	staffS   = user.Session{UserID: uuid.New(), Role: user.RoleStaff}
)

func setup() (*Service, *fakeRepo, *fakeFiles) {
	files := &fakeFiles{}
	repo := &fakeRepo{
		events: map[uuid.UUID]media.EventRef{
			eventA:   {ID: eventA, OrganizerID: &orgA, Status: "published"},
			closedEv: {ID: closedEv, OrganizerID: &orgA, Status: "cancelled"},
		},
		images: map[uuid.UUID]media.Image{},
		files:  files,
	}
	return New(repo, files, 0), repo, files
}

func validPNG(t *testing.T) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewGray(image.Rect(0, 0, 400, 400))); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestOrganizerScoping(t *testing.T) {
	svc, _, files := setup()
	up := Upload{Data: validPNG(t)}
	for name, s := range map[string]user.Session{"organizer lain": otherS, "staff": staffS} {
		if _, err := svc.UploadPoster(context.Background(), s, eventA, up); !errors.Is(err, media.ErrNotFound) {
			t.Errorf("%s: mau ErrNotFound, dapat %v", name, err)
		}
		if _, err := svc.List(context.Background(), s, eventA); !errors.Is(err, media.ErrNotFound) {
			t.Errorf("%s List: mau ErrNotFound, dapat %v", name, err)
		}
	}
	if len(files.saved) != 0 {
		t.Fatalf("berkas tidak boleh tersimpan untuk orang yang tidak berhak: %v", files.saved)
	}
	for name, s := range map[string]user.Session{"pemilik": ownerS, "admin": adminS} {
		if _, err := svc.UploadGallery(context.Background(), s, eventA, up); err != nil {
			t.Errorf("%s: mau sukses, dapat %v", name, err)
		}
	}
}

func TestImageOfOtherOrganizerIsNotFound(t *testing.T) {
	svc, _, _ := setup()
	img, _ := svc.UploadGallery(context.Background(), ownerS, eventA, Upload{Data: validPNG(t)})
	if err := svc.DeleteImage(context.Background(), otherS, img.ID); !errors.Is(err, media.ErrNotFound) {
		t.Fatalf("hapus gambar milik organizer lain: mau ErrNotFound, dapat %v", err)
	}
	if _, err := svc.UpdateAlt(context.Background(), otherS, img.ID, "x"); !errors.Is(err, media.ErrNotFound) {
		t.Fatalf("ubah alt milik organizer lain: mau ErrNotFound, dapat %v", err)
	}
}

func TestClosedEventNotEditable(t *testing.T) {
	svc, _, _ := setup()
	if _, err := svc.UploadPoster(context.Background(), adminS, closedEv, Upload{Data: validPNG(t)}); !errors.Is(err, media.ErrEventNotEditable) {
		t.Fatalf("mau ErrEventNotEditable, dapat %v", err)
	}
	if _, err := svc.List(context.Background(), adminS, closedEv); err != nil {
		t.Fatalf("melihat gambar event batal tetap boleh, dapat %v", err)
	}
}

func TestReplacePosterDeletesOldFileAfterCommit(t *testing.T) {
	svc, repo, files := setup()
	first, err := svc.UploadPoster(context.Background(), ownerS, eventA, Upload{Data: validPNG(t), Alt: "lama"})
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.UploadPoster(context.Background(), ownerS, eventA, Upload{Data: validPNG(t)})
	if err != nil {
		t.Fatal(err)
	}
	if repo.deletedAtCommit != 0 {
		t.Fatalf("berkas lama terhapus sebelum commit")
	}
	if len(files.deleted) != 1 || files.deleted[0] != first.FileName {
		t.Fatalf("berkas poster lama harus dihapus setelah commit, dihapus: %v", files.deleted)
	}
	if second.URL() != "/media/"+second.FileName {
		t.Fatalf("URL = %q", second.URL())
	}
}

func TestFailedWriteRemovesNewFile(t *testing.T) {
	svc, repo, files := setup()
	repo.failWrite = true
	if _, err := svc.UploadPoster(context.Background(), ownerS, eventA, Upload{Data: validPNG(t)}); err == nil {
		t.Fatal("mau error")
	}
	if len(files.saved) != 1 || len(files.deleted) != 1 || files.saved[0] != files.deleted[0] {
		t.Fatalf("berkas baru harus dibersihkan, saved=%v deleted=%v", files.saved, files.deleted)
	}
}

func TestGalleryFull(t *testing.T) {
	svc, _, files := setup()
	for i := 0; i < media.MaxGallery; i++ {
		if _, err := svc.UploadGallery(context.Background(), ownerS, eventA, Upload{Data: validPNG(t)}); err != nil {
			t.Fatalf("gambar ke-%d: %v", i+1, err)
		}
	}
	if _, err := svc.UploadGallery(context.Background(), ownerS, eventA, Upload{Data: validPNG(t)}); !errors.Is(err, media.ErrGalleryFull) {
		t.Fatalf("mau ErrGalleryFull, dapat %v", err)
	}
	if len(files.saved) != media.MaxGallery {
		t.Fatalf("galeri penuh tidak boleh menulis berkas, saved=%d", len(files.saved))
	}
}

func TestRejectsBadUploadBeforeSaving(t *testing.T) {
	svc, _, files := setup()
	if _, err := svc.UploadPoster(context.Background(), ownerS, eventA, Upload{Data: []byte("<svg/>")}); !errors.Is(err, media.ErrUnsupportedType) {
		t.Fatalf("mau ErrUnsupportedType, dapat %v", err)
	}
	if _, err := svc.UploadPoster(context.Background(), ownerS, eventA, Upload{Data: validPNG(t), Alt: "a\x00"}); !errors.Is(err, media.ErrInvalidAlt) {
		t.Fatalf("mau ErrInvalidAlt, dapat %v", err)
	}
	if len(files.saved) != 0 {
		t.Fatalf("berkas tidak valid tidak boleh disimpan: %v", files.saved)
	}
}
