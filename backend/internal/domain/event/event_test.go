package event

import "testing"

func TestCodePrefix(t *testing.T) {
	cases := map[string]string{
		"Penukaran Tiket Konser": "PE",
		"A":                      "AX",
		"":                       "XX",
		"9 Lives":                "LI",
		"ab":                     "AB",
	}
	for in, want := range cases {
		if got := CodePrefix(in); got != want {
			t.Errorf("CodePrefix(%q) = %q, mau %q", in, got, want)
		}
	}
}

func TestWaitingSlots(t *testing.T) {
	// slot 600, 630, 660, 690
	ev := Event{OpenMinutes: 600, CloseMinutes: 720, SlotMinutes: 30}
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
		got := ev.WaitingSlots(tc.now)
		if len(got) != len(tc.want) {
			t.Fatalf("%s: WaitingSlots = %v, mau %v", tc.name, got, tc.want)
		}
		for i := range got {
			if got[i] != tc.want[i] {
				t.Fatalf("%s: WaitingSlots = %v, mau %v", tc.name, got, tc.want)
			}
		}
	}
}

func TestDraftValidate(t *testing.T) {
	valid := func() Draft {
		return Draft{
			Name: "Penukaran Tiket Konser", Place: "Exhibition Hall", Item: "Gelang masuk",
			Requirement: "E-ticket + KTP", OpenTime: "10:00", CloseTime: "18:00",
			SlotMinutes: 30, SlotCapacity: 40, CounterCount: 2, ServiceSeconds: 90,
		}
	}

	if v := valid().Validate(); len(v.FieldErrors) != 0 || len(v.RangeErrors) != 0 || v.ScheduleIssue != "" {
		t.Fatalf("input valid seharusnya lolos, dapat %+v", v)
	}

	shortName := valid()
	shortName.Name = "AB"
	if v := shortName.Validate(); len(v.FieldErrors) != 1 || v.FieldErrors[0].Field != "name" {
		t.Fatalf("nama pendek: fieldErrors = %v", v.FieldErrors)
	}

	badRange := valid()
	badRange.SlotMinutes = 5
	if v := badRange.Validate(); len(v.RangeErrors) != 1 || v.RangeErrors[0].Field != "slotMinutes" {
		t.Fatalf("slotMinutes 5: rangeErrors = %v", v.RangeErrors)
	}

	closeNotAfter := valid()
	closeNotAfter.CloseTime = "10:00"
	if v := closeNotAfter.Validate(); len(v.FieldErrors) != 0 || v.ScheduleIssue == "" {
		t.Fatalf("jam tutup sama: %+v", v)
	}

	tooShort := valid()
	tooShort.CloseTime = "10:20"
	if v := tooShort.Validate(); len(v.FieldErrors) != 0 || v.ScheduleIssue == "" {
		t.Fatalf("rentang kurang satu slot: %+v", v)
	}
}
