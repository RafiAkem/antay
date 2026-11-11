package handler

import (
	"errors"
	"io"
	"net/http"

	mediaapp "github.com/RafiAkem/antay/backend/internal/application/media"
	"github.com/RafiAkem/antay/backend/internal/domain/media"
)

const (
	// Ruang untuk boundary multipart dan isian alt di luar berkasnya sendiri.
	mediaFormOverhead = 64 << 10
	mediaAltMaxBytes  = 4 << 10
)

// readMediaUpload membaca multipart secara streaming. Badan request dibatasi
// MaxBytesReader, dan berkasnya sendiri dibatasi lagi supaya 413 keluar tepat
// di batas berkas, bukan di batas berkas + overhead form.
func readMediaUpload(w http.ResponseWriter, r *http.Request, maxBytes int64) (mediaapp.Upload, error) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes+mediaFormOverhead)
	mr, err := r.MultipartReader()
	if err != nil {
		return mediaapp.Upload{}, errMediaNoFile
	}
	var up mediaapp.Upload
	gotFile := false
	for {
		part, err := mr.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return mediaapp.Upload{}, mediaReadErr(err)
		}
		switch part.FormName() {
		case "file":
			if gotFile {
				return mediaapp.Upload{}, errMediaNoFile
			}
			gotFile = true
			up.Data, err = io.ReadAll(io.LimitReader(part, maxBytes+1))
			if err == nil && int64(len(up.Data)) > maxBytes {
				err = media.ErrFileTooLarge
			}
		case "alt":
			var raw []byte
			raw, err = io.ReadAll(io.LimitReader(part, mediaAltMaxBytes+1))
			if err == nil && len(raw) > mediaAltMaxBytes {
				err = media.ErrInvalidAlt
			}
			up.Alt = string(raw)
		default:
			_, err = io.Copy(io.Discard, part)
		}
		_ = part.Close()
		if err != nil {
			return mediaapp.Upload{}, mediaReadErr(err)
		}
	}
	if !gotFile || len(up.Data) == 0 {
		return mediaapp.Upload{}, errMediaNoFile
	}
	return up, nil
}

var errMediaNoFile = errors.New("berkas tidak ada")

func mediaReadErr(err error) error {
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		return media.ErrFileTooLarge
	}
	if errors.Is(err, media.ErrFileTooLarge) || errors.Is(err, media.ErrInvalidAlt) {
		return err
	}
	return errMediaNoFile
}
