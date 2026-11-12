package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/uuid"

	mediaapp "github.com/RafiAkem/antay/backend/internal/application/media"
	"github.com/RafiAkem/antay/backend/internal/domain/media"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const msgMediaNotFound = "Event atau gambar tidak ditemukan."

// Media melayani penyelenggara dan admin yang mengatur poster dan galeri.
type Media struct {
	media *mediaapp.Service
}

func NewMedia(s *mediaapp.Service) *Media { return &Media{media: s} }

type mediaImageView struct {
	ID        string `json:"id"`
	Kind      string `json:"kind"`
	URL       string `json:"url"`
	Width     int32  `json:"width"`
	Height    int32  `json:"height"`
	Alt       string `json:"alt"`
	SortOrder int32  `json:"sortOrder"`
}

func mediaViewOf(img media.Image) mediaImageView {
	return mediaImageView{
		ID: img.ID.String(), Kind: img.Kind, URL: img.URL(), Width: img.Width,
		Height: img.Height, Alt: img.Alt, SortOrder: img.SortOrder,
	}
}

func mediaViewsOf(imgs []media.Image) []mediaImageView {
	out := make([]mediaImageView, 0, len(imgs))
	for _, img := range imgs {
		out = append(out, mediaViewOf(img))
	}
	return out
}

func (h *Media) List(w http.ResponseWriter, r *http.Request) {
	session, id, ok := mediaTarget(w, r, "eventId")
	if !ok {
		return
	}
	imgs, err := h.media.List(r.Context(), session, id)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	response.OK(w, r, "Daftar gambar event.", map[string]any{"images": mediaViewsOf(imgs)})
}

func (h *Media) UploadPoster(w http.ResponseWriter, r *http.Request) {
	h.upload(w, r, h.media.UploadPoster, "Poster disimpan.")
}

func (h *Media) UploadGallery(w http.ResponseWriter, r *http.Request) {
	h.upload(w, r, h.media.UploadGallery, "Gambar ditambahkan ke galeri.")
}

type mediaUploadFunc = func(ctx context.Context, session user.Session, eventID uuid.UUID, up mediaapp.Upload) (media.Image, error)

func (h *Media) upload(w http.ResponseWriter, r *http.Request, save mediaUploadFunc, message string) {
	session, id, ok := mediaTarget(w, r, "eventId")
	if !ok {
		return
	}
	up, err := readMediaUpload(w, r, h.media.MaxBytes())
	if err != nil {
		h.fail(w, r, err)
		return
	}
	img, err := save(r.Context(), session, id, up)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	response.Created(w, r, message, map[string]any{"image": mediaViewOf(img)})
}

type updateAltRequest struct {
	Alt *string `json:"alt"`
}

func (h *Media) UpdateAlt(w http.ResponseWriter, r *http.Request) {
	session, id, ok := mediaTarget(w, r, "imageId")
	if !ok {
		return
	}
	var req updateAltRequest
	if err := response.Decode(w, r, &req); err != nil || req.Alt == nil {
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.",
			[]response.ErrorDetail{{Field: "alt", Issue: "Wajib diisi, boleh string kosong."}})
		return
	}
	img, err := h.media.UpdateAlt(r.Context(), session, id, *req.Alt)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	response.OK(w, r, "Teks alternatif diperbarui.", map[string]any{"image": mediaViewOf(img)})
}

type reorderRequest struct {
	ImageIDs []string `json:"imageIds"`
}

func (h *Media) ReorderGallery(w http.ResponseWriter, r *http.Request) {
	session, id, ok := mediaTarget(w, r, "eventId")
	if !ok {
		return
	}
	var req reorderRequest
	if err := response.Decode(w, r, &req); err != nil || req.ImageIDs == nil {
		h.fail(w, r, media.ErrInvalidOrder)
		return
	}
	ids := make([]uuid.UUID, 0, len(req.ImageIDs))
	for _, raw := range req.ImageIDs {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			h.fail(w, r, media.ErrInvalidOrder)
			return
		}
		ids = append(ids, parsed)
	}
	imgs, err := h.media.ReorderGallery(r.Context(), session, id, ids)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	response.OK(w, r, "Urutan galeri disimpan.", map[string]any{"images": mediaViewsOf(imgs)})
}

func (h *Media) DeleteImage(w http.ResponseWriter, r *http.Request) {
	session, id, ok := mediaTarget(w, r, "imageId")
	if !ok {
		return
	}
	if err := h.media.DeleteImage(r.Context(), session, id); err != nil {
		h.fail(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *Media) fail(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, errMediaNoFile):
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Pilih satu berkas gambar untuk diunggah.",
			[]response.ErrorDetail{{Field: "file", Issue: "Kirim sebagai multipart/form-data dengan nama field file."}})
	case errors.Is(err, media.ErrInvalidAlt):
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Teks alternatif tidak valid.",
			[]response.ErrorDetail{{Field: "alt", Issue: fmt.Sprintf("Maksimal %d karakter, tanpa baris baru.", media.MaxAltLen)}})
	case errors.Is(err, media.ErrInvalidOrder):
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Urutan galeri tidak valid.",
			[]response.ErrorDetail{{Field: "imageIds", Issue: "Harus memuat semua gambar galeri event ini, masing-masing satu kali."}})
	case errors.Is(err, media.ErrNotFound):
		response.NotFound(w, r, msgMediaNotFound)
	case errors.Is(err, media.ErrEventNotEditable):
		response.Unprocessable(w, r, "EVENT_NOT_EDITABLE", "Event yang sudah ditutup atau dibatalkan tidak bisa diubah gambarnya.")
	case errors.Is(err, media.ErrFileTooLarge):
		response.Fail(w, r, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE",
			fmt.Sprintf("Ukuran berkas maksimal %g MB.", float64(h.media.MaxBytes())/(1<<20)))
	case errors.Is(err, media.ErrUnsupportedType):
		response.Fail(w, r, http.StatusUnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE", "Format gambar harus JPG, PNG, atau WebP.")
	case errors.Is(err, media.ErrImageTooSmall):
		response.Unprocessable(w, r, "IMAGE_TOO_SMALL", fmt.Sprintf("Resolusi gambar minimal %d x %d piksel.", media.MinSide, media.MinSide))
	case errors.Is(err, media.ErrImageTooLarge):
		response.Unprocessable(w, r, "IMAGE_TOO_LARGE", fmt.Sprintf("Resolusi gambar maksimal %d x %d piksel.", media.MaxSide, media.MaxSide))
	case errors.Is(err, media.ErrGalleryFull):
		response.Unprocessable(w, r, "GALLERY_FULL", fmt.Sprintf("Galeri sudah berisi %d gambar. Hapus salah satu dulu.", media.MaxGallery))
	default:
		response.Internal(w, r)
	}
}

// mediaTarget mengambil sesi dan ID dari path. ID yang bukan UUID dijawab 404,
// sama seperti handler lain.
func mediaTarget(w http.ResponseWriter, r *http.Request, param string) (user.Session, uuid.UUID, bool) {
	session, ok := middleware.SessionFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return session, uuid.Nil, false
	}
	id, err := uuid.Parse(r.PathValue(param))
	if err != nil {
		response.NotFound(w, r, msgMediaNotFound)
		return session, uuid.Nil, false
	}
	return session, id, true
}
