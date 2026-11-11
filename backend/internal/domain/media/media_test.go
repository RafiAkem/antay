package media

import (
	"bytes"
	"encoding/binary"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"testing"
)

func pngOf(t *testing.T, w, h int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewGray(image.Rect(0, 0, w, h))); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func jpegOf(t *testing.T, w, h int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, image.NewGray(image.Rect(0, 0, w, h)), nil); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// webpVP8X membuat header WebP extended paling kecil yang masih sah.
func webpVP8X(w, h int) []byte {
	b := []byte("RIFF\x00\x00\x00\x00WEBPVP8X")
	b = binary.LittleEndian.AppendUint32(b, 10)
	b = append(b, 0, 0, 0, 0)
	b = append(b, byte(w-1), byte((w-1)>>8), byte((w-1)>>16))
	b = append(b, byte(h-1), byte((h-1)>>8), byte((h-1)>>16))
	binary.LittleEndian.PutUint32(b[4:8], uint32(len(b)-8))
	return b
}

func webpVP8L(w, h int) []byte {
	b := []byte("RIFF\x00\x00\x00\x00WEBPVP8L")
	b = binary.LittleEndian.AppendUint32(b, 5)
	b = append(b, 0x2F)
	return binary.LittleEndian.AppendUint32(b, uint32(w-1)|uint32(h-1)<<14)
}

func webpVP8(w, h int) []byte {
	b := []byte("RIFF\x00\x00\x00\x00WEBPVP8 ")
	b = binary.LittleEndian.AppendUint32(b, 10)
	b = append(b, 0, 0, 0, 0x9D, 0x01, 0x2A)
	b = binary.LittleEndian.AppendUint16(b, uint16(w))
	return binary.LittleEndian.AppendUint16(b, uint16(h))
}

func TestInspectDecidesTypeFromBytes(t *testing.T) {
	// Berkas PNG yang namanya .jpg tetap dikenali sebagai PNG: nama dan header
	// dari klien tidak pernah sampai ke sini.
	info, err := Inspect(pngOf(t, 400, 500), 0)
	if err != nil || info.ContentType != TypePNG || info.Ext != "png" || info.Width != 400 || info.Height != 500 {
		t.Fatalf("PNG: %+v, %v", info, err)
	}
	info, err = Inspect(jpegOf(t, 640, 480), 0)
	if err != nil || info.ContentType != TypeJPEG || info.Ext != "jpg" {
		t.Fatalf("JPEG: %+v, %v", info, err)
	}
}

func TestInspectRejectsNonImages(t *testing.T) {
	cases := map[string][]byte{
		"html":       []byte("<!DOCTYPE html><html><script>alert(1)</script></html>"),
		"svg":        []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"></svg>`),
		"svg polos":  []byte(`<svg onload="alert(1)" width="500" height="500"/>`),
		"gif":        []byte("GIF89a\x01\x00\x01\x00\x00\x00\x00;"),
		"kosong":     {},
		"png rusak":  append([]byte{}, magicPNG...),
		"riff wav":   []byte("RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00"),
		"webp aneh":  []byte("RIFF\x10\x00\x00\x00WEBPVP8Z\x00\x00\x00\x00"),
		"teks biasa": []byte("hello"),
	}
	for name, data := range cases {
		if _, err := Inspect(data, 0); !errors.Is(err, ErrUnsupportedType) {
			t.Errorf("%s: mau ErrUnsupportedType, dapat %v", name, err)
		}
	}
}

func TestWebPHeaders(t *testing.T) {
	cases := map[string][]byte{"VP8X": webpVP8X(1200, 1600), "VP8L": webpVP8L(1200, 1600), "VP8": webpVP8(1200, 1600)}
	for name, data := range cases {
		info, err := Inspect(data, 0)
		if err != nil || info.ContentType != TypeWebP || info.Ext != "webp" || info.Width != 1200 || info.Height != 1600 {
			t.Errorf("%s: %+v, %v", name, info, err)
		}
	}
	if _, _, err := WebPSize(webpVP8X(1200, 1600)[:25]); !errors.Is(err, ErrUnsupportedType) {
		t.Errorf("header terpotong harus ditolak, dapat %v", err)
	}
}

func TestInspectLimits(t *testing.T) {
	cases := []struct {
		name string
		data []byte
		max  int64
		want error
	}{
		{"terlalu kecil", pngOf(t, 399, 800), 0, ErrImageTooSmall},
		{"pendek sekali", webpVP8X(6001, 10), 0, ErrImageTooSmall},
		{"terlalu besar", webpVP8X(6001, 6000), 0, ErrImageTooLarge},
		{"pas batas atas", webpVP8X(6000, 6000), 0, nil},
		{"pas batas bawah", webpVP8X(400, 400), 0, nil},
		{"berkas lewat batas byte", webpVP8X(500, 500), 10, ErrFileTooLarge},
	}
	for _, c := range cases {
		if _, err := Inspect(c.data, c.max); !errors.Is(err, c.want) {
			t.Errorf("%s: mau %v, dapat %v", c.name, c.want, err)
		}
	}
}

func TestValidFileName(t *testing.T) {
	good := []string{"0123abcd.jpg", "a-b.png", "f00.webp"}
	bad := []string{"../x.jpg", "x.JPG", "x.jpeg", "x.svg", "x.jpg/..", ".jpg", "a b.png", "x.png.html", "A.png", `..\x.jpg`}
	for _, n := range good {
		if !ValidFileName(n) {
			t.Errorf("%q harus valid", n)
		}
	}
	for _, n := range bad {
		if ValidFileName(n) {
			t.Errorf("%q harus ditolak", n)
		}
	}
}

func TestCleanAlt(t *testing.T) {
	if got, err := CleanAlt("  Poster konser  "); err != nil || got != "Poster konser" {
		t.Fatalf("CleanAlt = %q, %v", got, err)
	}
	for _, bad := range []string{"a\x00b", "baris\nbaru", string(bytes.Repeat([]byte("a"), MaxAltLen+1))} {
		if _, err := CleanAlt(bad); !errors.Is(err, ErrInvalidAlt) {
			t.Errorf("CleanAlt(%q) mau ErrInvalidAlt, dapat %v", bad, err)
		}
	}
}
