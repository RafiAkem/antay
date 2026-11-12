package eventadmin

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

// Create selalu menghasilkan draft. Organizer otomatis jadi pemilik event;
// organizerID dari body hanya dibaca untuk admin, organizer yang mengirimnya
// tetap dicatat sebagai pemilik.
func (s *Service) Create(ctx context.Context, actor Actor, in EventInput, organizerID *uuid.UUID) (Detail, error) {
	owner := actor.OrganizerID
	if actor.IsAdmin() {
		owner = organizerID
	}
	if !actor.IsAdmin() && owner == nil {
		return Detail{}, ErrOrganizerInvalid
	}
	if in.FeeBearer == "" {
		in.FeeBearer = event.FeeBearerCustomer
	}
	values, err := in.validate(s.clock.Today(), "")
	if err != nil {
		return Detail{}, err
	}
	if actor.IsAdmin() && owner != nil {
		active, err := s.repo.OrganizerActive(ctx, *owner)
		if err != nil {
			return Detail{}, err
		}
		if !active {
			return Detail{}, ErrOrganizerInvalid
		}
	}
	ev, err := s.repo.CreateEvent(ctx, NewEvent{
		EventValues: values,
		CodePrefix:  event.CodePrefix(values.Name),
		CreatedBy:   actor.UserID,
		OrganizerID: owner,
	})
	if err != nil {
		return Detail{}, err
	}
	return Detail{Managed: ev, Categories: []ManagedCategory{}}, nil
}

// Update menggabungkan patch ke data lama lalu memvalidasi ulang semuanya.
// Field yang nilainya sama dengan yang tersimpan tidak dihitung sebagai
// perubahan, jadi frontend boleh mengirim ulang seluruh form.
func (s *Service) Update(ctx context.Context, actor Actor, id uuid.UUID, patch EventPatch) (Detail, error) {
	cur, err := s.repo.GetEvent(ctx, actor.Scope(), id)
	if err != nil {
		return Detail{}, err
	}
	if cur.Status != event.StatusDraft && cur.Status != event.StatusPublished {
		return Detail{}, NotEditableError{}
	}
	values, err := inputOf(cur).apply(patch).validate(s.clock.Today(), cur.Date)
	if err != nil {
		return Detail{}, err
	}
	changed := changedFields(valuesOf(cur), values)
	if cur.Status == event.StatusPublished {
		var locked []string
		for _, f := range changed {
			if !publishedEditable[f] {
				locked = append(locked, f)
			}
		}
		if len(locked) > 0 {
			return Detail{}, NotEditableError{Fields: locked}
		}
	}
	if len(changed) == 0 {
		return s.withCategories(ctx, actor, cur)
	}

	// Prefix kode tiket ikut nama selama masih draft; setelah tayang dipaku
	// karena tiket versi 1 yang sudah terbit memakai prefix lama.
	prefix := cur.CodePrefix
	if cur.Status == event.StatusDraft {
		prefix = event.CodePrefix(values.Name)
	}
	updated, err := s.repo.UpdateEvent(ctx, actor.Scope(), id, cur.Status, prefix, values)
	if errors.Is(err, event.ErrNotFound) {
		// Barisnya ada sesaat lalu, jadi yang berubah adalah statusnya.
		return Detail{}, NotEditableError{}
	}
	if err != nil {
		return Detail{}, err
	}
	return s.withCategories(ctx, actor, updated)
}

// Delete hanya untuk draft; event yang pernah diajukan punya jejak yang perlu
// disimpan, jadi dibatalkan atau ditutup saja.
func (s *Service) Delete(ctx context.Context, actor Actor, id uuid.UUID) error {
	cur, err := s.repo.GetEvent(ctx, actor.Scope(), id)
	if err != nil {
		return err
	}
	if cur.Status != event.StatusDraft {
		return NotEditableError{}
	}
	if err := s.repo.DeleteDraftEvent(ctx, actor.Scope(), id); err != nil {
		if errors.Is(err, event.ErrNotFound) {
			return NotEditableError{}
		}
		return err
	}
	return nil
}

func valuesOf(ev Managed) EventValues {
	return EventValues{
		Schedule: event.Schedule{
			Name: ev.Name, Place: ev.Place, Item: ev.Item, Requirement: ev.Requirement,
			OpenMinutes: ev.OpenMinutes, CloseMinutes: ev.CloseMinutes,
			SlotMinutes: ev.SlotMinutes, SlotCapacity: ev.SlotCapacity,
			CounterCount: ev.CounterCount, ServiceSeconds: ev.ServiceSeconds,
		},
		Date:         ev.Date,
		Description:  ev.Description,
		SaleStartsAt: ev.SaleStartsAt,
		SaleEndsAt:   ev.SaleEndsAt,
		FeeBearer:    ev.FeeBearer,
		FeePercentBP: ev.FeePercentBP,
		FeeFlat:      ev.FeeFlat,
	}
}

// editable: kategori dan paket boleh diubah saat draft maupun sudah tayang.
// Batasan setelah ada penjualan dijaga lewat soldCount.
func editable(status string) bool {
	return status == event.StatusDraft || status == event.StatusPublished
}

// emptyPackages menjaga JSON packages selalu [] alih-alih null.
func emptyPackages(list []category.Package) []category.Package {
	if list == nil {
		return []category.Package{}
	}
	return list
}
