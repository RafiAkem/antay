package operational

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/httpx"
)

type createEventRequest struct {
	Name           string `json:"name"`
	Place          string `json:"place"`
	Item           string `json:"item"`
	Requirement    string `json:"requirement"`
	OpenTime       string `json:"openTime"`
	CloseTime      string `json:"closeTime"`
	SlotMinutes    int32  `json:"slotMinutes"`
	SlotCapacity   int32  `json:"slotCapacity"`
	CounterCount   int32  `json:"counterCount"`
	ServiceSeconds int32  `json:"serviceSeconds"`
}

type eventFields struct {
	name, place, item, requirement string
	openMinutes, closeMinutes      int32
	slotMinutes, slotCapacity      int32
	counterCount, serviceSeconds   int32
}

// eventValidation memisahkan tiga jenis masalah karena kodenya berbeda:
// isian teks/jam yang salah bentuk -> 400, angka di luar batas -> 422, dan
// hubungan jam buka-tutup -> 422.
type eventValidation struct {
	fields        eventFields
	fieldErrors   []httpx.ErrorDetail
	rangeErrors   []httpx.ErrorDetail
	scheduleIssue string
}

func validateEventInput(req createEventRequest) eventValidation {
	var v eventValidation
	addField := func(field, issue string) {
		v.fieldErrors = append(v.fieldErrors, httpx.ErrorDetail{Field: field, Issue: issue})
	}
	addRange := func(field, issue string) {
		v.rangeErrors = append(v.rangeErrors, httpx.ErrorDetail{Field: field, Issue: issue})
	}

	v.fields.name = strings.TrimSpace(req.Name)
	checkText(addField, "name", v.fields.name, 3, 70)
	v.fields.place = strings.TrimSpace(req.Place)
	checkText(addField, "place", v.fields.place, 1, 50)
	v.fields.item = strings.TrimSpace(req.Item)
	checkText(addField, "item", v.fields.item, 1, 50)
	v.fields.requirement = strings.TrimSpace(req.Requirement)
	checkText(addField, "requirement", v.fields.requirement, 1, 80)

	if minutes, err := app.MinutesOf(req.OpenTime); err != nil {
		addField("openTime", "format jam harus HH:MM")
	} else {
		v.fields.openMinutes = minutes
	}
	if minutes, err := app.MinutesOf(req.CloseTime); err != nil {
		addField("closeTime", "format jam harus HH:MM")
	} else {
		v.fields.closeMinutes = minutes
	}

	checkRange(addRange, "slotMinutes", req.SlotMinutes, 10, 120)
	checkRange(addRange, "slotCapacity", req.SlotCapacity, 1, 500)
	checkRange(addRange, "counterCount", req.CounterCount, 1, 20)
	checkRange(addRange, "serviceSeconds", req.ServiceSeconds, 30, 600)
	v.fields.slotMinutes, v.fields.slotCapacity = req.SlotMinutes, req.SlotCapacity
	v.fields.counterCount, v.fields.serviceSeconds = req.CounterCount, req.ServiceSeconds

	if len(v.fieldErrors) > 0 || len(v.rangeErrors) > 0 {
		return v
	}
	if v.fields.closeMinutes <= v.fields.openMinutes {
		v.scheduleIssue = "Jam tutup harus lebih lambat dari jam buka."
		return v
	}
	if v.fields.closeMinutes-v.fields.openMinutes < v.fields.slotMinutes {
		v.scheduleIssue = fmt.Sprintf("Rentang jam minimal satu slot (%d menit).", v.fields.slotMinutes)
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
