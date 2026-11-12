package storage

import (
	"bytes"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/RafiAkem/antay/backend/internal/domain/media"
)

func TestSaveOpenDelete(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "belum", "ada")
	d, err := NewDisk(dir)
	if err != nil {
		t.Fatal(err)
	}
	data := []byte("isi gambar")
	name, err := d.Save(data, "webp")
	if err != nil {
		t.Fatal(err)
	}
	if !media.ValidFileName(name) {
		t.Fatalf("nama %q tidak cocok pola", name)
	}

	entries, _ := os.ReadDir(d.Dir())
	if len(entries) != 1 || entries[0].Name() != name {
		t.Fatalf("berkas sementara tertinggal atau berkas hilang: %v", entries)
	}
	if runtime.GOOS != "windows" {
		st, _ := os.Stat(filepath.Join(d.Dir(), name))
		if st.Mode().Perm() != 0o644 {
			t.Fatalf("izin berkas %v, mau 0644", st.Mode().Perm())
		}
	}

	f, err := d.Open(name)
	if err != nil {
		t.Fatal(err)
	}
	got, _ := io.ReadAll(f)
	_ = f.Close()
	if !bytes.Equal(got, data) {
		t.Fatalf("isi berkas berubah: %q", got)
	}

	if err := d.Delete(name); err != nil {
		t.Fatal(err)
	}
	if err := d.Delete(name); err != nil {
		t.Fatalf("hapus kedua kali harus aman, dapat %v", err)
	}
}

func TestNamesAreUnique(t *testing.T) {
	d, _ := NewDisk(t.TempDir())
	a, _ := d.Save([]byte("a"), "jpg")
	b, _ := d.Save([]byte("b"), "jpg")
	if a == b {
		t.Fatalf("dua unggahan dapat nama sama: %s", a)
	}
}

func TestRejectsTraversalAndUnknownExt(t *testing.T) {
	root := t.TempDir()
	d, _ := NewDisk(filepath.Join(root, "uploads"))
	secret := filepath.Join(root, "x.jpg")
	_ = os.WriteFile(secret, []byte("rahasia"), 0o644)

	for _, name := range []string{"../x.jpg", `..\x.jpg`, "/etc/passwd", "x.html"} {
		if _, err := d.Open(name); !errors.Is(err, fs.ErrNotExist) {
			t.Errorf("Open(%q) harus ErrNotExist, dapat %v", name, err)
		}
		if err := d.Delete(name); !errors.Is(err, ErrInvalidName) {
			t.Errorf("Delete(%q) harus ErrInvalidName, dapat %v", name, err)
		}
	}
	if _, err := os.Stat(secret); err != nil {
		t.Fatalf("berkas di luar folder ikut terhapus: %v", err)
	}
	if _, err := d.Save([]byte("x"), "svg"); err == nil {
		t.Fatal("ekstensi svg harus ditolak")
	}
}
