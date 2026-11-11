package category

import (
	"strings"
	"testing"
)

func ptr(v int32) *int32 { return &v }

func fields(issues []FieldIssue) map[string]bool {
	out := map[string]bool{}
	for _, i := range issues {
		out[i.Field] = true
	}
	return out
}

func TestCategoryValidate(t *testing.T) {
	cases := []struct {
		name string
		in   CategoryInput
		want []string
	}{
		{"tanpa kursi lengkap", CategoryInput{Name: " VIP A ", Quota: ptr(100)}, nil},
		{"berkursi tanpa kuota", CategoryInput{Name: "Tribun", IsSeated: true}, nil},
		{"nama kosong", CategoryInput{Name: "   ", Quota: ptr(1)}, []string{"name"}},
		{"nama kepanjangan", CategoryInput{Name: strings.Repeat("a", 61), Quota: ptr(1)}, []string{"name"}},
		{"deskripsi kepanjangan", CategoryInput{Name: "A", Description: strings.Repeat("a", 301), Quota: ptr(1)}, []string{"description"}},
		{"tanpa kursi tanpa kuota", CategoryInput{Name: "A"}, []string{"quota"}},
		{"kuota nol", CategoryInput{Name: "A", Quota: ptr(0)}, []string{"quota"}},
		{"berkursi bawa kuota", CategoryInput{Name: "A", IsSeated: true, Quota: ptr(10)}, []string{"quota"}},
		{"urutan negatif", CategoryInput{Name: "A", Quota: ptr(1), SortOrder: -1}, []string{"sortOrder"}},
	}
	for _, c := range cases {
		clean, issues := c.in.Validate()
		got := fields(issues)
		if len(got) != len(c.want) {
			t.Fatalf("%s: issues = %+v, mau field %v", c.name, issues, c.want)
		}
		for _, f := range c.want {
			if !got[f] {
				t.Fatalf("%s: field %s tidak dilaporkan (%+v)", c.name, f, issues)
			}
		}
		if clean.Name != strings.TrimSpace(c.in.Name) {
			t.Fatalf("%s: nama tidak dirapikan: %q", c.name, clean.Name)
		}
	}
}

func TestPackageValidate(t *testing.T) {
	ok := PackageInput{Name: "Couple", Pax: 2, Price: 900_000, IsActive: true}
	cases := []struct {
		name string
		edit func(*PackageInput)
		want string
	}{
		{"lengkap", func(*PackageInput) {}, ""},
		{"gratis boleh", func(p *PackageInput) { p.Price = 0 }, ""},
		{"harga maksimal", func(p *PackageInput) { p.Price = MaxPrice }, ""},
		{"kuota opsional diisi", func(p *PackageInput) { p.Quota = ptr(5) }, ""},
		{"nama kosong", func(p *PackageInput) { p.Name = "" }, "name"},
		{"nama 41", func(p *PackageInput) { p.Name = strings.Repeat("a", 41) }, "name"},
		{"pax nol", func(p *PackageInput) { p.Pax = 0 }, "pax"},
		{"pax 11", func(p *PackageInput) { p.Pax = 11 }, "pax"},
		{"harga negatif", func(p *PackageInput) { p.Price = -1 }, "price"},
		{"harga lewat batas", func(p *PackageInput) { p.Price = MaxPrice + 1 }, "price"},
		{"kuota nol", func(p *PackageInput) { p.Quota = ptr(0) }, "quota"},
	}
	for _, c := range cases {
		in := ok
		c.edit(&in)
		_, issues := in.Validate()
		got := fields(issues)
		if c.want == "" && len(issues) > 0 {
			t.Fatalf("%s: mau lolos, dapat %+v", c.name, issues)
		}
		if c.want != "" && (len(issues) != 1 || !got[c.want]) {
			t.Fatalf("%s: issues = %+v, mau hanya %s", c.name, issues, c.want)
		}
	}
}
