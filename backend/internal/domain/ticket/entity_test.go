package ticket

import (
	"errors"
	"strings"
	"testing"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

func testEvent() event.Event {
	return event.Event{OpenMinutes: 600, CloseMinutes: 1200, SlotMinutes: 30}
}

func TestNormalizeVisitorName(t *testing.T) {
	cases := []struct {
		raw  string
		want string
		ok   bool
	}{
		{"  Rizky   Pratama ", "Rizky Pratama", true},
		{"Ahmad", "Ahmad", true},
		{"ab", "ab", false},
		{"", "", false},
		{strings.Repeat("a", 60), strings.Repeat("a", 60), true},
		{strings.Repeat("a", 61), strings.Repeat("a", 61), false},
	}
	for _, c := range cases {
		got, ok := NormalizeVisitorName(c.raw)
		if got != c.want || ok != c.ok {
			t.Errorf("NormalizeVisitorName(%q) = (%q, %v), mau (%q, %v)", c.raw, got, ok, c.want, c.ok)
		}
	}
}

func TestParseSlot(t *testing.T) {
	ev := testEvent()
	now := int32(700) // 11:40; slot 11:30 masih berjalan sampai 12:00
	cases := []struct {
		slot string
		now  int32
		want int32
		err  error
	}{
		{"10:00", now, 0, ErrSlotPast},
		{"11:30", now, 690, nil},
		{"12:00", now, 720, nil},
		{"11:40", now, 0, ErrSlotInvalid},
		{"09:30", now, 0, ErrSlotInvalid},
		{"19:45", now, 0, ErrSlotInvalid},
		{"", now, 0, ErrSlotInvalid},
	}
	for _, c := range cases {
		got, err := ParseSlot(ev, c.slot, c.now)
		if !errors.Is(err, c.err) || got != c.want {
			t.Errorf("ParseSlot(%q, %d) = (%d, %v), mau (%d, %v)", c.slot, c.now, got, err, c.want, c.err)
		}
	}
}

func TestNormalizeStaffCode(t *testing.T) {
	cases := map[string]string{
		" ab-12 ": "AB-12",
		"ab12":    "AB12",
		"":        "",
	}
	for in, want := range cases {
		if got := NormalizeStaffCode(in); got != want {
			t.Errorf("NormalizeStaffCode(%q) = %q, mau %q", in, got, want)
		}
	}
}

func TestTiming(t *testing.T) {
	cases := []struct {
		name   string
		now    int32
		start  int32
		slot   int32
		status string
		want   string
	}{
		{"jauh sebelum slot", 570, 600, 30, "booked", "early"},
		{"tepat 15 menit sebelum", 585, 600, 30, "booked", "on_time"},
		{"di dalam slot", 610, 600, 30, "booked", "on_time"},
		{"lewat tapi belum ditukar", 630, 600, 30, "booked", "late"},
		{"lewat dan sudah ditukar", 630, 600, 30, "redeemed", "past_slot"},
		{"lewat dan dibatalkan", 630, 600, 30, "cancelled", "late"},
	}
	for _, tc := range cases {
		if got := Timing(tc.now, tc.start, tc.slot, tc.status); got != tc.want {
			t.Errorf("%s: Timing = %q, mau %q", tc.name, got, tc.want)
		}
	}
}

func TestNormalizeVisitorCode(t *testing.T) {
	cases := map[string]string{
		"ab3k":    "AB-3K",
		"AB-3K":   "AB-3K",
		" ab 3k ": "AB-3K",
		"ab-3k":   "AB-3K",
		"AB":      "AB",
	}
	for raw, want := range cases {
		if got := NormalizeVisitorCode(raw); got != want {
			t.Errorf("NormalizeVisitorCode(%q) = %q, mau %q", raw, got, want)
		}
	}
}

func TestNewCode(t *testing.T) {
	for i := 0; i < 50; i++ {
		code, err := NewCode("LA")
		if err != nil {
			t.Fatalf("NewCode: %v", err)
		}
		if len(code) != len("LA-")+codeLength || !strings.HasPrefix(code, "LA-") {
			t.Fatalf("format kode salah: %q", code)
		}
		for _, c := range code[3:] {
			if !strings.ContainsRune(codeAlphabet, c) {
				t.Fatalf("kode %q memuat karakter di luar alfabet: %q", code, c)
			}
		}
	}
}
