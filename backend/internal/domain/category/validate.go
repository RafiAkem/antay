package category

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

// FieldIssue disamakan dengan milik event supaya lapisan HTTP cukup punya satu
// konverter ke details error.
type FieldIssue = event.FieldIssue

const (
	MaxPrice     int64 = 100_000_000
	maxSortOrder int32 = 9999
)

// CategoryInput adalah isian kategori yang sudah digabung dengan nilai lama
// (untuk PATCH) dan siap divalidasi.
type CategoryInput struct {
	Name        string
	Description string
	SortOrder   int32
	IsSeated    bool
	Quota       *int32
}

// Validate merapikan spasi lalu mengembalikan isian bersih beserta daftar
// masalahnya. Kategori berkursi tidak boleh membawa quota karena kuotanya
// dihitung dari kursi di denah; database juga menjaga aturan ini.
func (in CategoryInput) Validate() (CategoryInput, []FieldIssue) {
	var issues []FieldIssue
	add := func(field, issue string) { issues = append(issues, FieldIssue{Field: field, Issue: issue}) }

	in.Name = strings.TrimSpace(in.Name)
	in.Description = strings.TrimSpace(in.Description)
	checkLength(add, "name", in.Name, 1, 60)
	if utf8.RuneCountInString(in.Description) > 300 {
		add("description", "maksimal 300 karakter")
	}
	checkSortOrder(add, in.SortOrder)
	switch {
	case in.IsSeated && in.Quota != nil:
		add("quota", "kategori berkursi tidak memakai kuota; kuotanya jumlah kursi di denah")
	case !in.IsSeated && in.Quota == nil:
		add("quota", "wajib diisi untuk kategori tanpa kursi")
	case !in.IsSeated && *in.Quota < 1:
		add("quota", "minimal 1 orang")
	}
	return in, issues
}

// PackageInput sama seperti CategoryInput: sudah digabung dan tinggal dicek.
type PackageInput struct {
	Name      string
	Pax       int32
	Price     int64
	Quota     *int32
	SortOrder int32
	IsActive  bool
}

func (in PackageInput) Validate() (PackageInput, []FieldIssue) {
	var issues []FieldIssue
	add := func(field, issue string) { issues = append(issues, FieldIssue{Field: field, Issue: issue}) }

	in.Name = strings.TrimSpace(in.Name)
	checkLength(add, "name", in.Name, 1, 40)
	if in.Pax < 1 || in.Pax > 10 {
		add("pax", "harus antara 1 dan 10 orang")
	}
	if in.Price < 0 || in.Price > MaxPrice {
		add("price", fmt.Sprintf("harus antara 0 dan %d", MaxPrice))
	}
	if in.Quota != nil && *in.Quota < 1 {
		add("quota", "minimal 1 paket, atau kosongkan bila tanpa batas")
	}
	checkSortOrder(add, in.SortOrder)
	return in, issues
}

func checkLength(add func(string, string), field, value string, min, max int) {
	n := utf8.RuneCountInString(value)
	switch {
	case n == 0:
		add(field, "wajib diisi")
	case n < min:
		add(field, fmt.Sprintf("minimal %d karakter", min))
	case n > max:
		add(field, fmt.Sprintf("maksimal %d karakter", max))
	}
}

func checkSortOrder(add func(string, string), value int32) {
	if value < 0 || value > maxSortOrder {
		add("sortOrder", fmt.Sprintf("harus antara 0 dan %d", maxSortOrder))
	}
}
