package handler

import (
	"net/http"
	"os"
	"path"

	"github.com/RafiAkem/antay/backend/internal/domain/media"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// MediaFileOpener dipenuhi storage.Disk; Open wajib menolak nama di luar pola.
type MediaFileOpener interface {
	Open(name string) (*os.File, error)
}

// MediaFiles menyajikan gambar unggahan ke publik lewat GET /media/{fileName}.
type MediaFiles struct {
	files MediaFileOpener
}

func NewMediaFiles(files MediaFileOpener) *MediaFiles { return &MediaFiles{files: files} }

var mediaTypeByExt = map[string]string{
	".jpg":  media.TypeJPEG,
	".png":  media.TypePNG,
	".webp": media.TypeWebP,
}

// Serve memakai http.ServeContent supaya Range, If-Modified-Since, dan HEAD
// beres sendiri. Nama berkas dicek pola dulu di sini dan sekali lagi di Disk,
// jadi "../x.jpg" atau nama aneh lain selalu berakhir 404.
func (h *MediaFiles) Serve(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("fileName")
	if !media.ValidFileName(name) {
		response.NotFound(w, r, "Gambar tidak ditemukan.")
		return
	}
	f, err := h.files.Open(name)
	if err != nil {
		response.NotFound(w, r, "Gambar tidak ditemukan.")
		return
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		response.NotFound(w, r, "Gambar tidak ditemukan.")
		return
	}

	header := w.Header()
	header.Set("Content-Type", mediaTypeByExt[path.Ext(name)])
	// Isi berkas sudah dicek saat unggah, nosniff memastikan browser tetap
	// memperlakukannya sebagai gambar walau ada byte yang mirip HTML di dalamnya.
	header.Set("X-Content-Type-Options", "nosniff")
	// Aman di-cache selamanya: nama acak, dan ganti gambar selalu berarti nama baru.
	header.Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeContent(w, r, name, st.ModTime(), f)
}
