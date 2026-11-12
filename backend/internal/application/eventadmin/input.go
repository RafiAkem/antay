package eventadmin

import (
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

const maxDescription = 2000

// Nullable membedakan field PATCH yang tidak dikirim dari yang dikirim null.
// Dipakai untuk field yang memang boleh dikosongkan, seperti kuota paket.
type Nullable[T any] struct {
	Set   bool
	Value *T
}

func (n Nullable[T]) or(cur *T) *T {
	if n.Set {
		return n.Value
	}
	return cur
}

// EventInput adalah isian mentah dari body request. Waktu jual masih string
// RFC3339 supaya salah format bisa dilaporkan per field.
type EventInput struct {
	Name, Place, Item, Requirement string
	EventDate, OpenTime, CloseTime string
	SlotMinutes, SlotCapacity      int32
	CounterCount, ServiceSeconds   int32
	Description                    string
	SaleStartsAt, SaleEndsAt       *string
	FeeBearer                      string
	FeePercentBP                   int32
	FeeFlat                        int64
}

// EventPatch: nil artinya tidak diubah.
type EventPatch struct {
	Name, Place, Item, Requirement *string
	EventDate, OpenTime, CloseTime *string
	SlotMinutes, SlotCapacity      *int32
	CounterCount, ServiceSeconds   *int32
	Description, FeeBearer         *string
	FeePercentBP                   *int32
	FeeFlat                        *int64
	SaleStartsAt, SaleEndsAt       Nullable[string]
}

// EventValues adalah isian yang sudah lolos validasi dan siap disimpan.
type EventValues struct {
	event.Schedule
	Date                     string
	Description              string
	SaleStartsAt, SaleEndsAt *time.Time
	FeeBearer                string
	FeePercentBP             int32
	FeeFlat                  int64
}

// validate memakai validasi jadwal versi 1 lalu menambah field versi 2.
// prevDate kosong untuk event baru; tanggal lampau hanya ditolak bila memang
// diganti, supaya draft lama tetap bisa disunting field lainnya.
func (in EventInput) validate(today, prevDate string) (EventValues, error) {
	v := event.Draft{
		Name: in.Name, Place: in.Place, Item: in.Item, Requirement: in.Requirement,
		OpenTime: in.OpenTime, CloseTime: in.CloseTime,
		SlotMinutes: in.SlotMinutes, SlotCapacity: in.SlotCapacity,
		CounterCount: in.CounterCount, ServiceSeconds: in.ServiceSeconds,
	}.Validate()
	add := func(field, issue string) {
		v.FieldErrors = append(v.FieldErrors, event.FieldIssue{Field: field, Issue: issue})
	}

	out := EventValues{Date: in.EventDate, Description: strings.TrimSpace(in.Description)}
	if _, err := time.Parse("2006-01-02", in.EventDate); err != nil || len(in.EventDate) != 10 {
		add("eventDate", "format tanggal harus YYYY-MM-DD")
	} else if in.EventDate != prevDate && in.EventDate < today {
		add("eventDate", "tidak boleh sebelum hari ini")
	}
	if utf8.RuneCountInString(out.Description) > maxDescription {
		add("description", fmt.Sprintf("maksimal %d karakter", maxDescription))
	}
	out.SaleStartsAt = parseInstant(add, "saleStartsAt", in.SaleStartsAt)
	out.SaleEndsAt = parseInstant(add, "saleEndsAt", in.SaleEndsAt)
	if out.SaleStartsAt != nil && out.SaleEndsAt != nil && !out.SaleEndsAt.After(*out.SaleStartsAt) {
		add("saleEndsAt", "harus setelah saleStartsAt")
	}

	out.FeeBearer = in.FeeBearer
	if out.FeeBearer != event.FeeBearerCustomer && out.FeeBearer != event.FeeBearerOrganizer {
		add("feeBearer", "pilih customer atau organizer")
	}
	out.FeePercentBP, out.FeeFlat = in.FeePercentBP, in.FeeFlat
	if in.FeePercentBP < 0 || in.FeePercentBP > 10000 {
		add("feePercentBp", "harus antara 0 dan 10000 (basis poin)")
	}
	if in.FeeFlat < 0 || in.FeeFlat > category.MaxPrice {
		add("feeFlat", fmt.Sprintf("harus antara 0 dan %d", category.MaxPrice))
	}

	if !v.OK() {
		return EventValues{}, ValidationError{Validation: v}
	}
	out.Schedule = v.Schedule
	return out, nil
}

// parseInstant dipotong ke mikrodetik karena itu presisi timestamptz; tanpa
// ini nilai yang sama persis bisa terbaca "berubah" saat dibandingkan.
func parseInstant(add func(string, string), field string, raw *string) *time.Time {
	if raw == nil {
		return nil
	}
	t, err := time.Parse(time.RFC3339, *raw)
	if err != nil {
		add(field, "format waktu harus RFC3339, contoh 2026-12-01T10:00:00+07:00")
		return nil
	}
	t = t.Truncate(time.Microsecond)
	return &t
}

// inputOf mengubah event tersimpan kembali jadi isian mentah, supaya PATCH
// cukup menimpa field yang dikirim lalu memvalidasi semuanya sekali jalan.
func inputOf(ev Managed) EventInput {
	return EventInput{
		Name: ev.Name, Place: ev.Place, Item: ev.Item, Requirement: ev.Requirement,
		EventDate: ev.Date, OpenTime: shared.ClockOf(ev.OpenMinutes), CloseTime: shared.ClockOf(ev.CloseMinutes),
		SlotMinutes: ev.SlotMinutes, SlotCapacity: ev.SlotCapacity,
		CounterCount: ev.CounterCount, ServiceSeconds: ev.ServiceSeconds,
		Description:  ev.Description,
		SaleStartsAt: formatInstant(ev.SaleStartsAt), SaleEndsAt: formatInstant(ev.SaleEndsAt),
		FeeBearer: ev.FeeBearer, FeePercentBP: ev.FeePercentBP, FeeFlat: ev.FeeFlat,
	}
}

func formatInstant(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(time.RFC3339Nano)
	return &s
}

func (in EventInput) apply(p EventPatch) EventInput {
	set := func(dst *string, src *string) {
		if src != nil {
			*dst = *src
		}
	}
	setInt := func(dst *int32, src *int32) {
		if src != nil {
			*dst = *src
		}
	}
	set(&in.Name, p.Name)
	set(&in.Place, p.Place)
	set(&in.Item, p.Item)
	set(&in.Requirement, p.Requirement)
	set(&in.EventDate, p.EventDate)
	set(&in.OpenTime, p.OpenTime)
	set(&in.CloseTime, p.CloseTime)
	set(&in.Description, p.Description)
	set(&in.FeeBearer, p.FeeBearer)
	setInt(&in.SlotMinutes, p.SlotMinutes)
	setInt(&in.SlotCapacity, p.SlotCapacity)
	setInt(&in.CounterCount, p.CounterCount)
	setInt(&in.ServiceSeconds, p.ServiceSeconds)
	setInt(&in.FeePercentBP, p.FeePercentBP)
	if p.FeeFlat != nil {
		in.FeeFlat = *p.FeeFlat
	}
	in.SaleStartsAt = p.SaleStartsAt.or(in.SaleStartsAt)
	in.SaleEndsAt = p.SaleEndsAt.or(in.SaleEndsAt)
	return in
}

// changedFields memakai nama field JSON karena daftar ini dikirim balik ke
// frontend di details EVENT_NOT_EDITABLE.
func changedFields(old, cur EventValues) []string {
	var out []string
	check := func(field string, differs bool) {
		if differs {
			out = append(out, field)
		}
	}
	check("name", old.Name != cur.Name)
	check("place", old.Place != cur.Place)
	check("item", old.Item != cur.Item)
	check("requirement", old.Requirement != cur.Requirement)
	check("eventDate", old.Date != cur.Date)
	check("openTime", old.OpenMinutes != cur.OpenMinutes)
	check("closeTime", old.CloseMinutes != cur.CloseMinutes)
	check("slotMinutes", old.SlotMinutes != cur.SlotMinutes)
	check("slotCapacity", old.SlotCapacity != cur.SlotCapacity)
	check("counterCount", old.CounterCount != cur.CounterCount)
	check("serviceSeconds", old.ServiceSeconds != cur.ServiceSeconds)
	check("description", old.Description != cur.Description)
	check("saleStartsAt", !sameInstant(old.SaleStartsAt, cur.SaleStartsAt))
	check("saleEndsAt", !sameInstant(old.SaleEndsAt, cur.SaleEndsAt))
	check("feeBearer", old.FeeBearer != cur.FeeBearer)
	check("feePercentBp", old.FeePercentBP != cur.FeePercentBP)
	check("feeFlat", old.FeeFlat != cur.FeeFlat)
	return out
}

func sameInstant(a, b *time.Time) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Equal(*b)
}

// publishedEditable: setelah tayang hanya deskripsi, periode jual, dan jadwal
// penukaran yang boleh diubah. Poster diurus layanan media, bukan di sini.
var publishedEditable = map[string]bool{
	"description": true, "saleStartsAt": true, "saleEndsAt": true,
	"openTime": true, "closeTime": true, "slotMinutes": true,
	"slotCapacity": true, "counterCount": true, "serviceSeconds": true,
}
