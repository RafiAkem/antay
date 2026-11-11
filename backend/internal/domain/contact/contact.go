// Package contact merapikan isian kontak (email, nomor WhatsApp, nama, kata
// sandi) yang dipakai bersama oleh akun pembeli, penyelenggara, dan akun internal.
package contact

import (
	"strconv"
	"strings"
	"unicode/utf8"
)

// FieldIssue sama bentuknya dengan event.FieldIssue; handler mengubahnya jadi
// details di respons VALIDATION.
type FieldIssue struct {
	Field string
	Issue string
}

// Issues mengumpulkan masalah per field supaya validasi bisa ditulis berurutan.
type Issues []FieldIssue

func (is *Issues) Add(field, issue string) { *is = append(*is, FieldIssue{Field: field, Issue: issue}) }

// ValidationError dibungkus service supaya handler cukup errors.As satu tipe.
type ValidationError struct{ Issues []FieldIssue }

func (e *ValidationError) Error() string { return "isian tidak valid" }

// Err mengembalikan nil bila tidak ada masalah.
func (is Issues) Err() error {
	if len(is) == 0 {
		return nil
	}
	return &ValidationError{Issues: is}
}

// IssueRequired dipakai pemanggil yang menganggap field kosong itu boleh.
const IssueRequired = "wajib diisi"

const maxEmailLength = 254

// Email merapikan email jadi huruf kecil. Cek bentuknya sengaja longgar: cukup
// satu @, ada titik di domain, tanpa spasi. Validasi sungguhan baru terjadi
// kalau nanti ada email verifikasi.
func Email(raw string) (string, string) {
	email := strings.ToLower(strings.TrimSpace(raw))
	if email == "" {
		return "", IssueRequired
	}
	if len(email) > maxEmailLength || strings.ContainsAny(email, " \t\r\n") {
		return "", "format email tidak valid"
	}
	local, domain, ok := strings.Cut(email, "@")
	if !ok || local == "" || strings.Contains(domain, "@") {
		return "", "format email tidak valid"
	}
	dot := strings.LastIndex(domain, ".")
	if dot <= 0 || dot == len(domain)-1 || strings.Contains(domain, "..") {
		return "", "format email tidak valid"
	}
	return email, ""
}

// Phone mengubah 08xx, +62xx, atau 62xx jadi digit berawalan 62, karena
// tautan wa.me dan gateway pembayaran sama-sama minta format itu. Spasi,
// strip, titik, dan kurung yang biasa diketik orang dibuang dulu.
func Phone(raw string) (string, string) {
	cleaned := strings.Map(func(r rune) rune {
		switch r {
		case ' ', '-', '.', '(', ')':
			return -1
		}
		return r
	}, strings.TrimSpace(raw))
	if cleaned == "" {
		return "", IssueRequired
	}
	switch {
	case strings.HasPrefix(cleaned, "+62"):
		cleaned = cleaned[1:]
	case strings.HasPrefix(cleaned, "62"):
	case strings.HasPrefix(cleaned, "0"):
		cleaned = "62" + cleaned[1:]
	default:
		return "", "harus nomor Indonesia, diawali 08, 62, atau +62"
	}
	for _, r := range cleaned {
		if r < '0' || r > '9' {
			return "", "hanya boleh berisi angka"
		}
	}
	if len(cleaned) < 10 || len(cleaned) > 15 {
		return "", "harus 10 sampai 15 digit"
	}
	return cleaned, ""
}

// Name memangkas spasi lalu memastikan panjangnya dalam batas (dihitung per huruf).
func Name(raw string, minLen, maxLen int) (string, string) {
	name := strings.TrimSpace(raw)
	if name == "" {
		return "", IssueRequired
	}
	if n := utf8.RuneCountInString(name); n < minLen || n > maxLen {
		return "", "harus " + strconv.Itoa(minLen) + " sampai " + strconv.Itoa(maxLen) + " karakter"
	}
	return name, ""
}

// Password dihitung dalam byte karena bcrypt diam-diam memotong setelah 72 byte;
// lebih jujur ditolak daripada sebagian kata sandi tidak ikut diperiksa.
func Password(raw string) string {
	switch {
	case raw == "":
		return IssueRequired
	case len(raw) < 8:
		return "minimal 8 karakter"
	case len(raw) > 72:
		return "maksimal 72 byte"
	}
	return ""
}
