// Package storage menyimpan berkas unggahan di disk lokal (UPLOAD_DIR).
package storage

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/RafiAkem/antay/backend/internal/domain/media"
)

// ErrInvalidName dikembalikan bila nama berkas bukan nama buatan server.
var ErrInvalidName = errors.New("nama berkas tidak valid")

// Disk menulis berkas ke satu folder datar. Nama berkas selalu dibuat di sini
// dan dicek ulang dengan pola yang sama dengan CHECK di database, jadi path
// traversal tidak mungkin terjadi lewat nama.
type Disk struct {
	dir string
}

// NewDisk membuat folder bila belum ada.
func NewDisk(dir string) (*Disk, error) {
	if dir == "" {
		return nil, errors.New("UPLOAD_DIR kosong")
	}
	abs, err := filepath.Abs(dir)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(abs, 0o755); err != nil {
		return nil, fmt.Errorf("siapkan folder unggahan: %w", err)
	}
	return &Disk{dir: abs}, nil
}

func (d *Disk) Dir() string { return d.dir }

// Save menulis ke berkas sementara dulu lalu rename. Rename di folder yang
// sama itu atomik, jadi GET /media tidak pernah melihat berkas setengah jadi.
// Berkas sementara diawali titik supaya tidak cocok dengan pola nama.
func (d *Disk) Save(data []byte, ext string) (string, error) {
	name, err := randomName(ext)
	if err != nil {
		return "", err
	}
	tmp, err := os.CreateTemp(d.dir, ".upload-*")
	if err != nil {
		return "", err
	}
	tmpName := tmp.Name()
	cleanup := func(err error) (string, error) {
		_ = tmp.Close()
		_ = os.Remove(tmpName)
		return "", err
	}
	if _, err := tmp.Write(data); err != nil {
		return cleanup(err)
	}
	if err := tmp.Sync(); err != nil {
		return cleanup(err)
	}
	if err := tmp.Close(); err != nil {
		return cleanup(err)
	}
	// CreateTemp memberi 0600; gambar publik perlu bisa dibaca nginx juga.
	if err := os.Chmod(tmpName, 0o644); err != nil {
		return cleanup(err)
	}
	if err := os.Rename(tmpName, filepath.Join(d.dir, name)); err != nil {
		return cleanup(err)
	}
	return name, nil
}

// Delete tidak menganggap berkas yang sudah hilang sebagai galat: tujuannya
// berkas tidak ada, dan itu sudah tercapai.
func (d *Disk) Delete(name string) error {
	if !media.ValidFileName(name) {
		return ErrInvalidName
	}
	err := os.Remove(filepath.Join(d.dir, name))
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	return err
}

// Open dipakai handler GET /media. Nama yang tidak cocok pola dijawab
// fs.ErrNotExist supaya handler cukup menjawab 404.
func (d *Disk) Open(name string) (*os.File, error) {
	if !media.ValidFileName(name) {
		return nil, fs.ErrNotExist
	}
	f, err := os.Open(filepath.Join(d.dir, name))
	if err != nil {
		return nil, err
	}
	if st, err := f.Stat(); err != nil || !st.Mode().IsRegular() {
		_ = f.Close()
		return nil, fs.ErrNotExist
	}
	return f, nil
}

func randomName(ext string) (string, error) {
	switch ext {
	case "jpg", "png", "webp":
	default:
		return "", fmt.Errorf("ekstensi %q tidak didukung", ext)
	}
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf) + "." + ext, nil
}
