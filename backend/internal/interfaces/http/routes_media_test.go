package http

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/png"
	"log/slog"
	"mime/multipart"
	nethttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	mediaapp "github.com/RafiAkem/antay/backend/internal/application/media"
	"github.com/RafiAkem/antay/backend/internal/domain/media"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/storage"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// memMediaRepo cukup untuk jalur unggah; perilaku repository sebenarnya diuji
// lewat service dan SQL-nya.
type memMediaRepo struct {
	ev     media.EventRef
	images []media.Image
}

func (m *memMediaRepo) Event(_ context.Context, id uuid.UUID) (media.EventRef, error) {
	if id != m.ev.ID {
		return media.EventRef{}, media.ErrNotFound
	}
	return m.ev, nil
}
func (m *memMediaRepo) List(context.Context, uuid.UUID) ([]media.Image, error) { return m.images, nil }
func (m *memMediaRepo) Get(context.Context, uuid.UUID) (media.Image, error) {
	return media.Image{}, media.ErrNotFound
}
func (m *memMediaRepo) CountGallery(context.Context, uuid.UUID) (int, error) { return len(m.images), nil }
func (m *memMediaRepo) add(img media.NewImage) media.Image {
	out := media.Image{ID: uuid.New(), EventID: img.EventID, Kind: img.Kind, FileName: img.FileName, Width: img.Width, Height: img.Height}
	m.images = append(m.images, out)
	return out
}
func (m *memMediaRepo) ReplacePoster(_ context.Context, img media.NewImage) (media.Image, []media.Image, error) {
	return m.add(img), nil, nil
}
func (m *memMediaRepo) AddGallery(_ context.Context, img media.NewImage, _ int) (media.Image, error) {
	return m.add(img), nil
}
func (m *memMediaRepo) Delete(context.Context, uuid.UUID) (media.Image, error) {
	return media.Image{}, media.ErrNotFound
}
func (m *memMediaRepo) Reorder(context.Context, uuid.UUID, []uuid.UUID) error { return nil }
func (m *memMediaRepo) UpdateAlt(context.Context, uuid.UUID, string) (media.Image, error) {
	return media.Image{}, media.ErrNotFound
}

type mediaRig struct {
	srv     nethttp.Handler
	tokens  *security.TokenService
	eventID uuid.UUID
	orgID   uuid.UUID
}

const testMaxBytes = 64 << 10

// newMediaRig memasang rute media di mux baru dengan rantai yang sama seperti
// NewRouter, supaya CSRF dan header Cache-Control ikut teruji.
func newMediaRig(t *testing.T) mediaRig {
	t.Helper()
	tokens, err := security.NewTokenService("", time.Hour, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	disk, err := storage.NewDisk(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	org := uuid.New()
	repo := &memMediaRepo{ev: media.EventRef{ID: uuid.New(), OrganizerID: &org, Status: "published"}}
	mux := nethttp.NewServeMux()
	registerMedia(mux, handler.NewMedia(mediaapp.New(repo, disk, testMaxBytes)), middleware.NewSessions(tokens, false))
	registerMediaFiles(mux, handler.NewMediaFiles(disk))
	srv := response.WithOptions(middleware.Chain(mux,
		middleware.RequestID, middleware.LogRequests(slog.New(slog.DiscardHandler)), middleware.CSRF,
	), response.Options{Version: "test"})
	return mediaRig{srv: srv, tokens: tokens, eventID: repo.ev.ID, orgID: org}
}

func (g mediaRig) upload(t *testing.T, s user.Session, path string, file []byte, csrf bool) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("alt", "Poster uji")
	if file != nil {
		// Nama dan Content-Type sengaja bohong: server harus menilai dari isinya.
		part, _ := mw.CreateFormFile("file", "foto.jpg")
		_, _ = part.Write(file)
	}
	_ = mw.Close()
	req := httptest.NewRequest(nethttp.MethodPost, path, &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	token, _ := g.tokens.Issue(s)
	req.AddCookie(&nethttp.Cookie{Name: middleware.SessionCookie, Value: token})
	if csrf {
		req.AddCookie(&nethttp.Cookie{Name: middleware.CSRFCookie, Value: "tok"})
		req.Header.Set(middleware.CSRFHeader, "tok")
	}
	rec := httptest.NewRecorder()
	g.srv.ServeHTTP(rec, req)
	return rec
}

func (g mediaRig) get(path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	g.srv.ServeHTTP(rec, httptest.NewRequest(nethttp.MethodGet, path, nil))
	return rec
}

func testPNG(t *testing.T) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewGray(image.Rect(0, 0, 400, 400))); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func errorCode(rec *httptest.ResponseRecorder) string {
	var body struct {
		Error struct{ Code string } `json:"error"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	return body.Error.Code
}

func TestMediaUploadErrors(t *testing.T) {
	g := newMediaRig(t)
	owner := user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &g.orgID}
	other := uuid.New()
	poster := "/operational/v1/manage/events/" + g.eventID.String() + "/poster"
	cases := []struct {
		name   string
		s      user.Session
		file   []byte
		csrf   bool
		status int
		code   string
	}{
		{"tanpa csrf", owner, testPNG(t), false, 403, "CSRF_MISSING"},
		{"staff ditolak role", user.Session{UserID: uuid.New(), Role: user.RoleStaff}, testPNG(t), true, 403, "FORBIDDEN"},
		{"organizer lain", user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &other}, testPNG(t), true, 404, "NOT_FOUND"},
		{"tanpa berkas", owner, nil, true, 400, "VALIDATION"},
		{"html", owner, []byte("<html><script>alert(1)</script></html>"), true, 415, "UNSUPPORTED_MEDIA_TYPE"},
		{"svg", owner, []byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`), true, 415, "UNSUPPORTED_MEDIA_TYPE"},
		{"lewat batas berkas", owner, append(testPNG(t), make([]byte, testMaxBytes)...), true, 413, "FILE_TOO_LARGE"},
		{"lewat batas body", owner, make([]byte, testMaxBytes*3), true, 413, "FILE_TOO_LARGE"},
	}
	for _, c := range cases {
		rec := g.upload(t, c.s, poster, c.file, c.csrf)
		if rec.Code != c.status || errorCode(rec) != c.code {
			t.Errorf("%s: mau %d %s, dapat %d %s", c.name, c.status, c.code, rec.Code, rec.Body.String())
		}
	}
}

func TestMediaUploadThenServe(t *testing.T) {
	g := newMediaRig(t)
	admin := user.Session{UserID: uuid.New(), Role: user.RoleAdmin}
	data := testPNG(t)
	rec := g.upload(t, admin, "/operational/v1/manage/events/"+g.eventID.String()+"/images", data, true)
	if rec.Code != nethttp.StatusCreated {
		t.Fatalf("mau 201, dapat %d %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Data struct {
			Image struct {
				URL   string `json:"url"`
				Kind  string `json:"kind"`
				Width int    `json:"width"`
			} `json:"image"`
		} `json:"data"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	img := body.Data.Image
	if !strings.HasPrefix(img.URL, "/media/") || !strings.HasSuffix(img.URL, ".png") || img.Kind != "gallery" || img.Width != 400 {
		t.Fatalf("image = %+v", img)
	}

	got := g.get(img.URL)
	h := got.Header()
	if got.Code != 200 || !bytes.Equal(got.Body.Bytes(), data) {
		t.Fatalf("GET %s = %d", img.URL, got.Code)
	}
	if h.Get("Content-Type") != "image/png" || h.Get("X-Content-Type-Options") != "nosniff" ||
		h.Get("Cache-Control") != "public, max-age=31536000, immutable" {
		t.Fatalf("header salah: %v", h)
	}
}

func TestMediaServeRejectsBadNames(t *testing.T) {
	g := newMediaRig(t)
	for _, p := range []string{"/media/..%2Fx.jpg", "/media/..%5Cx.jpg", "/media/x.svg", "/media/X.PNG", "/media/tidakada.png"} {
		if rec := g.get(p); rec.Code != nethttp.StatusNotFound {
			t.Errorf("GET %s = %d, mau 404", p, rec.Code)
		}
	}
	// Langsung ke handler, melewati pembersihan path dari mux.
	req := httptest.NewRequest(nethttp.MethodGet, "/media/x", nil)
	req.SetPathValue("fileName", "../x.jpg")
	rec := httptest.NewRecorder()
	disk, _ := storage.NewDisk(t.TempDir())
	handler.NewMediaFiles(disk).Serve(rec, req)
	if rec.Code != nethttp.StatusNotFound || rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("../x.jpg = %d %q, mau 404 no-store", rec.Code, rec.Header().Get("Cache-Control"))
	}
}
