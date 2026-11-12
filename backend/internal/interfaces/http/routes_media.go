package http

import (
	nethttp "net/http"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
)

// registerMedia: poster dan galeri event. RequireRole(organizer) juga
// meloloskan admin; batas "event milik organizer ini" dicek di service dan
// dijawab 404 supaya ID event organizer lain tidak bisa ditebak.
func registerMedia(mux *nethttp.ServeMux, h *handler.Media, s *middleware.Sessions) {
	manager := func(fn nethttp.HandlerFunc) nethttp.Handler {
		return middleware.Chain(fn, s.Require, middleware.RequireRole(user.RoleOrganizer))
	}
	mux.Handle("GET /operational/v1/manage/events/{eventId}/images", manager(h.List))
	mux.Handle("POST /operational/v1/manage/events/{eventId}/poster", manager(h.UploadPoster))
	mux.Handle("POST /operational/v1/manage/events/{eventId}/images", manager(h.UploadGallery))
	mux.Handle("PUT /operational/v1/manage/events/{eventId}/images/order", manager(h.ReorderGallery))
	mux.Handle("PATCH /operational/v1/manage/images/{imageId}", manager(h.UpdateAlt))
	mux.Handle("DELETE /operational/v1/manage/images/{imageId}", manager(h.DeleteImage))
}

// registerMediaFiles: berkas gambar publik, tanpa sesi. Pola GET juga melayani HEAD.
func registerMediaFiles(mux *nethttp.ServeMux, h *handler.MediaFiles) {
	mux.HandleFunc("GET /media/{fileName}", h.Serve)
}
