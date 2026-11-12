package media

import (
	"bytes"
	"encoding/binary"
	"image"
	_ "image/jpeg" // daftar dekoder untuk image.DecodeConfig
	_ "image/png"
	"net/http"
)

// Info hasil pemeriksaan berkas. Ext ditentukan dari isi berkas, bukan dari
// nama yang dikirim browser.
type Info struct {
	ContentType string
	Ext         string
	Width       int
	Height      int
	Size        int
}

var (
	magicJPEG = []byte{0xFF, 0xD8, 0xFF}
	magicPNG  = []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'}
)

// Inspect menolak apa pun yang bukan JPEG, PNG, atau WebP, lalu memeriksa
// ukuran berkas dan resolusinya. Header Content-Type dan ekstensi dari klien
// sengaja tidak dipakai sama sekali: dua-duanya gampang dipalsukan.
func Inspect(data []byte, maxBytes int64) (Info, error) {
	if maxBytes <= 0 {
		maxBytes = DefaultMaxBytes
	}
	if int64(len(data)) > maxBytes {
		return Info{}, ErrFileTooLarge
	}
	contentType, ext, err := Sniff(data)
	if err != nil {
		return Info{}, err
	}
	w, h, err := dimensions(data, contentType)
	if err != nil {
		return Info{}, err
	}
	switch {
	case w < MinSide || h < MinSide:
		return Info{}, ErrImageTooSmall
	case w > MaxSide || h > MaxSide:
		return Info{}, ErrImageTooLarge
	}
	return Info{ContentType: contentType, Ext: ext, Width: w, Height: h, Size: len(data)}, nil
}

// Sniff memakai http.DetectContentType lalu mencocokkan magic bytes sendiri.
// Dua lapis karena DetectContentType bisa berubah antar versi Go, sedangkan
// pengecekan magic memastikan kita tidak pernah menyimpan HTML atau SVG.
func Sniff(data []byte) (contentType, ext string, err error) {
	if len(data) == 0 {
		return "", "", ErrUnsupportedType
	}
	switch http.DetectContentType(data) {
	case TypeJPEG:
		if bytes.HasPrefix(data, magicJPEG) {
			return TypeJPEG, "jpg", nil
		}
	case TypePNG:
		if bytes.HasPrefix(data, magicPNG) {
			return TypePNG, "png", nil
		}
	case TypeWebP:
		if isWebP(data) {
			return TypeWebP, "webp", nil
		}
	}
	return "", "", ErrUnsupportedType
}

func dimensions(data []byte, contentType string) (int, int, error) {
	if contentType == TypeWebP {
		return WebPSize(data)
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		// Header rusak diperlakukan sama dengan jenis tidak didukung: berkasnya
		// memang tidak bisa dipakai sebagai gambar.
		return 0, 0, ErrUnsupportedType
	}
	return cfg.Width, cfg.Height, nil
}

func isWebP(data []byte) bool {
	if len(data) < 16 || string(data[0:4]) != "RIFF" || string(data[8:12]) != "WEBP" {
		return false
	}
	switch string(data[12:16]) {
	case "VP8 ", "VP8L", "VP8X":
		return true
	}
	return false
}

// WebPSize membaca lebar dan tinggi dari chunk pertama WebP. Ditulis sendiri
// karena pustaka standar tidak punya dekoder WebP dan kita tidak menambah
// dependensi. Yang dibaca cuma header, bukan isi gambarnya.
func WebPSize(data []byte) (int, int, error) {
	if !isWebP(data) {
		return 0, 0, ErrUnsupportedType
	}
	// isWebP hanya menjamin 16 byte; potongan payload mulai di offset 20, jadi
	// berkas 16-19 byte harus ditolak di sini, bukan memicu panic saat slice.
	if len(data) < 20 {
		return 0, 0, ErrUnsupportedType
	}
	p := data[20:] // payload chunk pertama, setelah fourcc dan panjang chunk
	switch string(data[12:16]) {
	case "VP8 ":
		// Lossy: 3 byte frame tag, start code 9D 01 2A, lalu lebar dan tinggi
		// 14 bit (2 bit atasnya skala, bukan bagian ukuran).
		if len(p) < 10 || p[3] != 0x9D || p[4] != 0x01 || p[5] != 0x2A {
			return 0, 0, ErrUnsupportedType
		}
		w := int(binary.LittleEndian.Uint16(p[6:8]) & 0x3FFF)
		h := int(binary.LittleEndian.Uint16(p[8:10]) & 0x3FFF)
		return nonZero(w, h)
	case "VP8L":
		// Lossless: signature 0x2F, lalu 14 bit lebar-1 dan 14 bit tinggi-1.
		if len(p) < 5 || p[0] != 0x2F {
			return 0, 0, ErrUnsupportedType
		}
		bits := binary.LittleEndian.Uint32(p[1:5])
		return int(bits&0x3FFF) + 1, int((bits>>14)&0x3FFF) + 1, nil
	default: // VP8X
		// Extended: 1 byte flag, 3 byte cadangan, lalu kanvas lebar-1 dan
		// tinggi-1 masing-masing 24 bit little endian.
		if len(p) < 10 {
			return 0, 0, ErrUnsupportedType
		}
		return uint24(p[4:7]) + 1, uint24(p[7:10]) + 1, nil
	}
}

func uint24(b []byte) int { return int(b[0]) | int(b[1])<<8 | int(b[2])<<16 }

func nonZero(w, h int) (int, int, error) {
	if w == 0 || h == 0 {
		return 0, 0, ErrUnsupportedType
	}
	return w, h, nil
}
