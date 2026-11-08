package operational

import "testing"

func TestNormalizeCode(t *testing.T) {
	cases := map[string]string{
		" ab-12 ": "AB-12",
		"ab12":    "AB12",
		"":        "",
	}
	for in, want := range cases {
		if got := normalizeCode(in); got != want {
			t.Errorf("normalizeCode(%q) = %q, mau %q", in, got, want)
		}
	}
}

func TestCodePrefix(t *testing.T) {
	cases := map[string]string{
		"Penukaran Tiket Konser": "PE",
		"A":                      "AX",
		"":                       "XX",
		"9 Lives":                "LI",
		"ab":                     "AB",
	}
	for in, want := range cases {
		if got := codePrefix(in); got != want {
			t.Errorf("codePrefix(%q) = %q, mau %q", in, got, want)
		}
	}
}

func TestClassifyTiming(t *testing.T) {
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
		if got := classifyTiming(tc.now, tc.start, tc.slot, tc.status); got != tc.want {
			t.Errorf("%s: classifyTiming = %q, mau %q", tc.name, got, tc.want)
		}
	}
}

func TestWaitingSlots(t *testing.T) {
	starts := []int32{600, 630, 660, 690}
	cases := []struct {
		name string
		now  int32
		want []int32
	}{
		{"sebelum buka", 590, []int32{600}},
		{"slot berjalan", 640, []int32{630, 660}},
		{"tepat di awal slot", 660, []int32{660, 690}},
		{"slot terakhir", 700, []int32{690}},
		{"setelah tutup", 720, nil},
	}
	for _, tc := range cases {
		got := waitingSlots(starts, tc.now, 30)
		if len(got) != len(tc.want) {
			t.Fatalf("%s: waitingSlots = %v, mau %v", tc.name, got, tc.want)
		}
		for i := range got {
			if got[i] != tc.want[i] {
				t.Fatalf("%s: waitingSlots = %v, mau %v", tc.name, got, tc.want)
			}
		}
	}
}

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

func TestValidateEventInput(t *testing.T) {
	valid := func() createEventRequest {
		return createEventRequest{
			Name: "Penukaran Tiket Konser", Place: "Exhibition Hall", Item: "Gelang masuk",
			Requirement: "E-ticket + KTP", OpenTime: "10:00", CloseTime: "18:00",
			SlotMinutes: 30, SlotCapacity: 40, CounterCount: 2, ServiceSeconds: 90,
		}
	}

	if v := validateEventInput(valid()); len(v.fieldErrors) != 0 || len(v.rangeErrors) != 0 || v.scheduleIssue != "" {
		t.Fatalf("input valid seharusnya lolos, dapat %+v", v)
	}

	shortName := valid()
	shortName.Name = "AB"
	if v := validateEventInput(shortName); len(v.fieldErrors) != 1 || v.fieldErrors[0].Field != "name" {
		t.Fatalf("nama pendek: fieldErrors = %v", v.fieldErrors)
	}

	badRange := valid()
	badRange.SlotMinutes = 5
	if v := validateEventInput(badRange); len(v.rangeErrors) != 1 || v.rangeErrors[0].Field != "slotMinutes" {
		t.Fatalf("slotMinutes 5: rangeErrors = %v", v.rangeErrors)
	}

	closeNotAfter := valid()
	closeNotAfter.CloseTime = "10:00"
	if v := validateEventInput(closeNotAfter); len(v.fieldErrors) != 0 || v.scheduleIssue == "" {
		t.Fatalf("jam tutup sama: %+v", v)
	}

	tooShort := valid()
	tooShort.CloseTime = "10:20"
	if v := validateEventInput(tooShort); len(v.fieldErrors) != 0 || v.scheduleIssue == "" {
		t.Fatalf("rentang kurang satu slot: %+v", v)
	}
}
