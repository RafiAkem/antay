package contact

import (
	"strings"
	"testing"
)

func TestPhoneNormalisesIndonesianFormats(t *testing.T) {
	cases := map[string]string{
		"0812-3456-7890":    "6281234567890",
		"+62 812 3456 7890": "6281234567890",
		"6281234567890":     "6281234567890",
		" (0812) 345.678 ":  "62812345678",
	}
	for in, want := range cases {
		got, issue := Phone(in)
		if issue != "" || got != want {
			t.Fatalf("Phone(%q) = %q, %q; mau %q", in, got, issue, want)
		}
	}
}

func TestPhoneRejectsBadNumbers(t *testing.T) {
	for _, in := range []string{"", "812345678", "+1 555 1234567", "0812abc4567", "08123", "0812345678901234"} {
		if got, issue := Phone(in); issue == "" {
			t.Fatalf("Phone(%q) = %q, mau ditolak", in, got)
		}
	}
}

func TestEmailLowercasesAndChecksShape(t *testing.T) {
	if got, issue := Email("  Budi@Contoh.CO.id "); issue != "" || got != "budi@contoh.co.id" {
		t.Fatalf("Email = %q, %q", got, issue)
	}
	for _, in := range []string{"", "budi", "budi@", "@contoh.id", "budi@contoh", "budi@contoh.", "a b@contoh.id", "a@b@contoh.id", "budi@.id"} {
		if _, issue := Email(in); issue == "" {
			t.Fatalf("Email(%q) mau ditolak", in)
		}
	}
}

func TestPasswordCountsBytes(t *testing.T) {
	if Password("1234567") == "" {
		t.Fatal("7 karakter harus ditolak")
	}
	if Password(strings.Repeat("a", 72)) != "" {
		t.Fatal("72 byte harus diterima")
	}
	// 37 huruf é cuma 37 karakter tapi 74 byte, sudah lewat batas bcrypt.
	if Password(strings.Repeat("é", 37)) == "" {
		t.Fatal("74 byte harus ditolak")
	}
}

func TestNameTrimsAndCountsRunes(t *testing.T) {
	if got, issue := Name("  Ani  ", 2, 80); issue != "" || got != "Ani" {
		t.Fatalf("Name = %q, %q", got, issue)
	}
	if _, issue := Name("A", 2, 80); issue == "" {
		t.Fatal("1 huruf harus ditolak")
	}
}
