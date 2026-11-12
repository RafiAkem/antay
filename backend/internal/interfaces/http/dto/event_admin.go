package dto

import (
	"bytes"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

// Nullable dipakai di body PATCH untuk field yang boleh dikosongkan. Tanpa ini
// "tidak dikirim" dan "dikirim null" sama-sama jadi nil, dan kuota paket tidak
// akan pernah bisa dihapus lagi.
type Nullable[T any] struct {
	Set   bool
	Value *T
}

func (n *Nullable[T]) UnmarshalJSON(raw []byte) error {
	n.Set = true
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		n.Value = nil
		return nil
	}
	var v T
	if err := json.Unmarshal(raw, &v); err != nil {
		return err
	}
	n.Value = &v
	return nil
}

// ManagedEventSummary untuk daftar; kategori tidak ikut supaya daftar tetap ringan.
type ManagedEventSummary struct {
	ID              string     `json:"id"`
	CodePrefix      string     `json:"codePrefix"`
	Name            string     `json:"name"`
	Place           string     `json:"place"`
	EventDate       string     `json:"eventDate"`
	OpenTime        string     `json:"openTime"`
	CloseTime       string     `json:"closeTime"`
	Status          string     `json:"status"`
	OrganizerID     *string    `json:"organizerId"`
	OrganizerName   string     `json:"organizerName"`
	PosterURL       string     `json:"posterUrl"`
	SaleStartsAt    *time.Time `json:"saleStartsAt"`
	SaleEndsAt      *time.Time `json:"saleEndsAt"`
	RejectionReason *string    `json:"rejectionReason"`
	SubmittedAt     *time.Time `json:"submittedAt"`
	PublishedAt     *time.Time `json:"publishedAt"`
}

type ManagedEvent struct {
	ID              string            `json:"id"`
	CodePrefix      string            `json:"codePrefix"`
	Name            string            `json:"name"`
	Place           string            `json:"place"`
	Item            string            `json:"item"`
	Requirement     string            `json:"requirement"`
	EventDate       string            `json:"eventDate"`
	OpenTime        string            `json:"openTime"`
	CloseTime       string            `json:"closeTime"`
	SlotMinutes     int32             `json:"slotMinutes"`
	SlotCapacity    int32             `json:"slotCapacity"`
	CounterCount    int32             `json:"counterCount"`
	ServiceSeconds  int32             `json:"serviceSeconds"`
	Status          string            `json:"status"`
	OrganizerID     *string           `json:"organizerId"`
	Description     string            `json:"description"`
	PosterURL       string            `json:"posterUrl"`
	SaleStartsAt    *time.Time        `json:"saleStartsAt"`
	SaleEndsAt      *time.Time        `json:"saleEndsAt"`
	FeeBearer       string            `json:"feeBearer"`
	FeePercentBP    int32             `json:"feePercentBp"`
	FeeFlat         int64             `json:"feeFlat"`
	RejectionReason *string           `json:"rejectionReason"`
	SubmittedAt     *time.Time        `json:"submittedAt"`
	PublishedAt     *time.Time        `json:"publishedAt"`
	Categories      []ManagedCategory `json:"categories"`
}

type ManagedCategory struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	SortOrder   int32            `json:"sortOrder"`
	IsSeated    bool             `json:"isSeated"`
	Quota       *int32           `json:"quota"`
	SeatCount   int32            `json:"seatCount"`
	Packages    []ManagedPackage `json:"packages"`
}

type ManagedPackage struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Pax       int32  `json:"pax"`
	Price     int64  `json:"price"`
	Quota     *int32 `json:"quota"`
	SortOrder int32  `json:"sortOrder"`
	IsActive  bool   `json:"isActive"`
}

// manageJakarta menyeragamkan zona waktu keluaran dengan meta.timestamp.
func manageJakarta(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	local := t.In(shared.Jakarta)
	return &local
}

func ManagedEventSummariesOf(list []eventadmin.Managed) []ManagedEventSummary {
	out := make([]ManagedEventSummary, 0, len(list))
	for _, m := range list {
		out = append(out, ManagedEventSummary{
			ID:              m.ID.String(),
			CodePrefix:      m.CodePrefix,
			Name:            m.Name,
			Place:           m.Place,
			EventDate:       m.Date,
			OpenTime:        shared.ClockOf(m.OpenMinutes),
			CloseTime:       shared.ClockOf(m.CloseMinutes),
			Status:          m.Status,
			OrganizerID:     manageID(m.OrganizerID),
			OrganizerName:   m.OrganizerName,
			PosterURL:       m.PosterURL,
			SaleStartsAt:    manageJakarta(m.SaleStartsAt),
			SaleEndsAt:      manageJakarta(m.SaleEndsAt),
			RejectionReason: m.RejectionReason,
			SubmittedAt:     manageJakarta(m.SubmittedAt),
			PublishedAt:     manageJakarta(m.PublishedAt),
		})
	}
	return out
}

func ManagedEventOf(d eventadmin.Detail) ManagedEvent {
	cats := make([]ManagedCategory, 0, len(d.Categories))
	for _, c := range d.Categories {
		cats = append(cats, ManagedCategoryOf(c))
	}
	return ManagedEvent{
		ID:              d.ID.String(),
		CodePrefix:      d.CodePrefix,
		Name:            d.Name,
		Place:           d.Place,
		Item:            d.Item,
		Requirement:     d.Requirement,
		EventDate:       d.Date,
		OpenTime:        shared.ClockOf(d.OpenMinutes),
		CloseTime:       shared.ClockOf(d.CloseMinutes),
		SlotMinutes:     d.SlotMinutes,
		SlotCapacity:    d.SlotCapacity,
		CounterCount:    d.CounterCount,
		ServiceSeconds:  d.ServiceSeconds,
		Status:          d.Status,
		OrganizerID:     manageID(d.OrganizerID),
		Description:     d.Description,
		PosterURL:       d.PosterURL,
		SaleStartsAt:    manageJakarta(d.SaleStartsAt),
		SaleEndsAt:      manageJakarta(d.SaleEndsAt),
		FeeBearer:       d.FeeBearer,
		FeePercentBP:    d.FeePercentBP,
		FeeFlat:         d.FeeFlat,
		RejectionReason: d.RejectionReason,
		SubmittedAt:     manageJakarta(d.SubmittedAt),
		PublishedAt:     manageJakarta(d.PublishedAt),
		Categories:      cats,
	}
}

func ManagedCategoryOf(c eventadmin.ManagedCategory) ManagedCategory {
	return ManagedCategory{
		ID:          c.ID.String(),
		Name:        c.Name,
		Description: c.Description,
		SortOrder:   c.SortOrder,
		IsSeated:    c.IsSeated,
		Quota:       c.Quota,
		SeatCount:   c.SeatCount,
		Packages:    ManagedPackagesOf(c.Packages),
	}
}

func ManagedCategoriesOf(list []eventadmin.ManagedCategory) []ManagedCategory {
	out := make([]ManagedCategory, 0, len(list))
	for _, c := range list {
		out = append(out, ManagedCategoryOf(c))
	}
	return out
}

func ManagedPackageOf(p category.Package) ManagedPackage {
	return ManagedPackage{
		ID:        p.ID.String(),
		Name:      p.Name,
		Pax:       p.Pax,
		Price:     p.Price,
		Quota:     p.Quota,
		SortOrder: p.SortOrder,
		IsActive:  p.IsActive,
	}
}

func ManagedPackagesOf(list []category.Package) []ManagedPackage {
	out := make([]ManagedPackage, 0, len(list))
	for _, p := range list {
		out = append(out, ManagedPackageOf(p))
	}
	return out
}

func manageID(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}
