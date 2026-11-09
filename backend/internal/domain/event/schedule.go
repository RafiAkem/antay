package event

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

type FieldIssue struct {
	Field string
	Issue string
}

// Draft adalah isian mentah untuk membuat event baru.
type Draft struct {
	Name           string
	Place          string
	Item           string
	Requirement    string
	OpenTime       string
	CloseTime      string
	SlotMinutes    int32
	SlotCapacity   int32
	CounterCount   int32
	ServiceSeconds int32
}

// Schedule adalah isian yang sudah dirapikan dan siap disimpan.
type Schedule struct {
	Name, Place, Item, Requirement string
	OpenMinutes, CloseMinutes      int32
	SlotMinutes, SlotCapacity      int32
	CounterCount, ServiceSeconds   int32
}

// Validation memisahkan tiga jenis masalah karena penanganannya berbeda:
// isian teks/jam yang salah bentuk, angka di luar batas, dan hubungan jam
// buka-tutup.
type Validation struct {
	Schedule      Schedule
	FieldErrors   []FieldIssue
	RangeErrors   []FieldIssue
	ScheduleIssue string
}

func (v Validation) OK() bool {
	return len(v.FieldErrors) == 0 && len(v.RangeErrors) == 0 && v.ScheduleIssue == ""
}

func (d Draft) Validate() Validation {
	var v Validation
	addField := func(field, issue string) {
		v.FieldErrors = append(v.FieldErrors, FieldIssue{Field: field, Issue: issue})
	}
	addRange := func(field, issue string) {
		v.RangeErrors = append(v.RangeErrors, FieldIssue{Field: field, Issue: issue})
	}

	v.Schedule.Name = strings.TrimSpace(d.Name)
	checkText(addField, "name", v.Schedule.Name, 3, 70)
	v.Schedule.Place = strings.TrimSpace(d.Place)
	checkText(addField, "place", v.Schedule.Place, 1, 50)
	v.Schedule.Item = strings.TrimSpace(d.Item)
	checkText(addField, "item", v.Schedule.Item, 1, 50)
	v.Schedule.Requirement = strings.TrimSpace(d.Requirement)
	checkText(addField, "requirement", v.Schedule.Requirement, 1, 80)

	if minutes, err := shared.MinutesOf(d.OpenTime); err != nil {
		addField("openTime", "format jam harus HH:MM")
	} else {
		v.Schedule.OpenMinutes = minutes
	}
	if minutes, err := shared.MinutesOf(d.CloseTime); err != nil {
		addField("closeTime", "format jam harus HH:MM")
	} else {
		v.Schedule.CloseMinutes = minutes
	}

	checkRange(addRange, "slotMinutes", d.SlotMinutes, 10, 120)
	checkRange(addRange, "slotCapacity", d.SlotCapacity, 1, 500)
	checkRange(addRange, "counterCount", d.CounterCount, 1, 20)
	checkRange(addRange, "serviceSeconds", d.ServiceSeconds, 30, 600)
	v.Schedule.SlotMinutes, v.Schedule.SlotCapacity = d.SlotMinutes, d.SlotCapacity
	v.Schedule.CounterCount, v.Schedule.ServiceSeconds = d.CounterCount, d.ServiceSeconds

	if len(v.FieldErrors) > 0 || len(v.RangeErrors) > 0 {
		return v
	}
	if v.Schedule.CloseMinutes <= v.Schedule.OpenMinutes {
		v.ScheduleIssue = "Jam tutup harus lebih lambat dari jam buka."
		return v
	}
	if v.Schedule.CloseMinutes-v.Schedule.OpenMinutes < v.Schedule.SlotMinutes {
		v.ScheduleIssue = fmt.Sprintf("Rentang jam minimal satu slot (%d menit).", v.Schedule.SlotMinutes)
	}
	return v
}

func checkText(add func(string, string), field, value string, min, max int) {
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

func checkRange(add func(string, string), field string, value, min, max int32) {
	if value < min || value > max {
		add(field, fmt.Sprintf("harus antara %d dan %d", min, max))
	}
}
