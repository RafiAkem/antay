package shared

import "testing"

func TestMinutesOfValid(t *testing.T) {
	cases := map[string]int32{"00:00": 0, "09:05": 545, "10:30": 630, "23:59": 1439}
	for clock, want := range cases {
		got, err := MinutesOf(clock)
		if err != nil {
			t.Fatalf("MinutesOf(%q) error: %v", clock, err)
		}
		if got != want {
			t.Fatalf("MinutesOf(%q) = %d, mau %d", clock, got, want)
		}
	}
}

func TestMinutesOfRejectsAnythingButHHMM(t *testing.T) {
	cases := []string{
		"", "abc", "9:5", "9:05", "10:30abc", "10:30:99", " 10:30", "+10:30",
		"-1:30", "24:00", "10:60", "10-30",
	}
	for _, clock := range cases {
		if got, err := MinutesOf(clock); err == nil {
			t.Fatalf("MinutesOf(%q) = %d, mau error", clock, got)
		}
	}
}
