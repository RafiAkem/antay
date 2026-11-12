package eventadmin

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
)

// Transit menjalankan satu aksi alur status. Pengajuan dicek kelengkapannya
// dulu; aksi admin tidak, karena event review memang tidak bisa diubah lagi.
func (s *Service) Transit(ctx context.Context, actor Actor, id uuid.UUID, action event.Action, reason string) (Detail, error) {
	if action.AdminOnly() && !actor.IsAdmin() {
		return Detail{}, ErrForbidden
	}
	cur, err := s.repo.GetEvent(ctx, actor.Scope(), id)
	if err != nil {
		return Detail{}, err
	}
	change, err := event.PlanTransition(action, cur.Status, reason)
	if err != nil {
		return Detail{}, err
	}
	if action == event.ActionSubmit {
		detail, err := s.withCategories(ctx, actor, cur)
		if err != nil {
			return Detail{}, err
		}
		if issues := Completeness(detail); len(issues) > 0 {
			return Detail{}, IncompleteError{Issues: issues}
		}
	}
	updated, err := s.repo.TransitionEvent(ctx, actor.Scope(), id, change)
	if errors.Is(err, event.ErrNotFound) {
		// Ada pemanggil lain yang lebih dulu mengubah statusnya.
		return Detail{}, event.ErrInvalidStatus
	}
	if err != nil {
		return Detail{}, err
	}
	return s.withCategories(ctx, actor, updated)
}

// Completeness mendaftar semua alasan event belum bisa diajukan sekaligus,
// supaya organizer tidak bolak-balik menebak apa lagi yang kurang.
func Completeness(d Detail) []event.FieldIssue {
	var issues []event.FieldIssue
	add := func(field, issue string) { issues = append(issues, event.FieldIssue{Field: field, Issue: issue}) }

	if d.SaleStartsAt == nil {
		add("saleStartsAt", "periode penjualan belum diisi")
	}
	if d.SaleEndsAt == nil {
		add("saleEndsAt", "periode penjualan belum diisi")
	} else if end, ok := eventEnd(d.Event); ok && d.SaleEndsAt.After(end) {
		add("saleEndsAt", "penjualan harus berakhir sebelum loket tutup di hari event")
	}
	if len(d.Categories) == 0 {
		add("categories", "tambahkan minimal satu kategori tiket")
	}
	for _, c := range d.Categories {
		if !hasActivePackage(c) {
			add(fmt.Sprintf("categories.%s.packages", c.ID),
				fmt.Sprintf("kategori %q belum punya paket aktif", c.Name))
		}
		if c.IsSeated && c.SeatCount == 0 {
			add(fmt.Sprintf("categories.%s.seats", c.ID),
				fmt.Sprintf("kategori %q pakai kursi tapi denahnya belum punya kursi aktif", c.Name))
		}
	}
	return issues
}

func hasActivePackage(c ManagedCategory) bool {
	for _, p := range c.Packages {
		if p.IsActive {
			return true
		}
	}
	return false
}

// eventEnd adalah jam tutup loket di hari event, zona Jakarta. Itu batas paling
// akhir tiket masih masuk akal dijual.
func eventEnd(ev event.Event) (time.Time, bool) {
	day, err := time.ParseInLocation("2006-01-02", ev.Date, shared.Jakarta)
	if err != nil {
		return time.Time{}, false
	}
	return day.Add(time.Duration(ev.CloseMinutes) * time.Minute), true
}
