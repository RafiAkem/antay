package public

import (
	"errors"
	"strings"
	"testing"

	"github.com/RafiAkem/antay/backend/internal/store"
)

func testEvent() store.Event {
	return store.Event{OpenMinutes: 600, CloseMinutes: 1200, SlotMinutes: 30}
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
		got, ok := normalizeVisitorName(c.raw)
		if got != c.want || ok != c.ok {
			t.Errorf("normalizeVisitorName(%q) = (%q, %v), mau (%q, %v)", c.raw, got, ok, c.want, c.ok)
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
		{"10:00", now, 0, errSlotPast},
		{"11:30", now, 690, nil},
		{"12:00", now, 720, nil},
		{"11:40", now, 0, errSlotInvalid},
		{"09:30", now, 0, errSlotInvalid},
		{"19:45", now, 0, errSlotInvalid},
		{"", now, 0, errSlotInvalid},
	}
	for _, c := range cases {
		got, err := parseSlot(ev, c.slot, c.now)
		if !errors.Is(err, c.err) || got != c.want {
			t.Errorf("parseSlot(%q, %d) = (%d, %v), mau (%d, %v)", c.slot, c.now, got, err, c.want, c.err)
		}
	}
}

func TestNormalizeTicketCode(t *testing.T) {
	cases := map[string]string{
		"ab3k":    "AB-3K",
		"AB-3K":   "AB-3K",
		" ab 3k ": "AB-3K",
		"ab-3k":   "AB-3K",
		"AB":      "AB",
	}
	for raw, want := range cases {
		if got := normalizeTicketCode(raw); got != want {
			t.Errorf("normalizeTicketCode(%q) = %q, mau %q", raw, got, want)
		}
	}
}

func TestNewTicketCode(t *testing.T) {
	for i := 0; i < 50; i++ {
		code, err := newTicketCode("LA")
		if err != nil {
			t.Fatalf("newTicketCode: %v", err)
		}
		if len(code) != len("LA-")+ticketCodeLen || !strings.HasPrefix(code, "LA-") {
			t.Fatalf("format kode salah: %q", code)
		}
		for _, c := range code[3:] {
			if !strings.ContainsRune(ticketAlphabet, c) {
				t.Fatalf("kode %q memuat karakter di luar alfabet: %q", code, c)
			}
		}
	}
}
