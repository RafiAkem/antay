package counter

import "testing"

func TestParseSlots(t *testing.T) {
	got, err := parseSlots("10:30, 11:00")
	if err != nil {
		t.Fatalf("parseSlots valid: %v", err)
	}
	if len(got) != 2 || got[0] != 630 || got[1] != 660 {
		t.Fatalf("parseSlots = %v, mau [630 660]", got)
	}
	if _, err := parseSlots("25:00"); err == nil {
		t.Fatal("parseSlots seharusnya menolak 25:00")
	}
	if got, err := parseSlots(""); err != nil || got != nil {
		t.Fatalf("parseSlots kosong = %v, %v; mau nil tanpa error", got, err)
	}
}
