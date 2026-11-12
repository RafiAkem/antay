// Package eventadmintest berisi repository di memori untuk tes service dan
// rute kelola event. Filter organizer ditiru persis seperti di SQL supaya tes
// scoping benar-benar menguji jalur yang sama.
package eventadmintest

import (
	"context"
	"sort"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

type Memory struct {
	Events     map[uuid.UUID]eventadmin.Managed
	Categories map[uuid.UUID]category.Category
	Packages   map[uuid.UUID]category.Package
	// Seats dan Blocks per kategori, diisi langsung oleh tes.
	Seats      map[uuid.UUID]int32
	Blocks     map[uuid.UUID]int32
	Organizers map[uuid.UUID]bool
}

func New() *Memory {
	return &Memory{
		Events:     map[uuid.UUID]eventadmin.Managed{},
		Categories: map[uuid.UUID]category.Category{},
		Packages:   map[uuid.UUID]category.Package{},
		Seats:      map[uuid.UUID]int32{},
		Blocks:     map[uuid.UUID]int32{},
		Organizers: map[uuid.UUID]bool{},
	}
}

var _ eventadmin.Repository = (*Memory)(nil)

func inScope(scope *uuid.UUID, ev eventadmin.Managed) bool {
	return scope == nil || (ev.OrganizerID != nil && *ev.OrganizerID == *scope)
}

func (m *Memory) event(scope *uuid.UUID, id uuid.UUID) (eventadmin.Managed, bool) {
	ev, ok := m.Events[id]
	return ev, ok && inScope(scope, ev)
}

func (m *Memory) category(scope *uuid.UUID, id uuid.UUID) (category.Category, eventadmin.Managed, bool) {
	c, ok := m.Categories[id]
	if !ok {
		return c, eventadmin.Managed{}, false
	}
	ev, ok := m.event(scope, c.EventID)
	return c, ev, ok
}

func (m *Memory) ListEvents(_ context.Context, scope *uuid.UUID, status *string) ([]eventadmin.Managed, error) {
	out := []eventadmin.Managed{}
	for _, ev := range m.Events {
		if inScope(scope, ev) && (status == nil || ev.Status == *status) {
			out = append(out, ev)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (m *Memory) GetEvent(_ context.Context, scope *uuid.UUID, id uuid.UUID) (eventadmin.Managed, error) {
	if ev, ok := m.event(scope, id); ok {
		return ev, nil
	}
	return eventadmin.Managed{}, event.ErrNotFound
}

func (m *Memory) CreateEvent(_ context.Context, ev eventadmin.NewEvent) (eventadmin.Managed, error) {
	out := eventadmin.Managed{Event: event.Event{
		ID: uuid.New(), CodePrefix: ev.CodePrefix, Status: event.StatusDraft, OrganizerID: ev.OrganizerID,
	}}
	setValues(&out, ev.EventValues)
	m.Events[out.ID] = out
	return out, nil
}

func setValues(ev *eventadmin.Managed, v eventadmin.EventValues) {
	ev.Name, ev.Place, ev.Item, ev.Requirement = v.Name, v.Place, v.Item, v.Requirement
	ev.Date, ev.OpenMinutes, ev.CloseMinutes = v.Date, v.OpenMinutes, v.CloseMinutes
	ev.SlotMinutes, ev.SlotCapacity = v.SlotMinutes, v.SlotCapacity
	ev.CounterCount, ev.ServiceSeconds = v.CounterCount, v.ServiceSeconds
	ev.Description, ev.SaleStartsAt, ev.SaleEndsAt = v.Description, v.SaleStartsAt, v.SaleEndsAt
	ev.FeeBearer, ev.FeePercentBP, ev.FeeFlat = v.FeeBearer, v.FeePercentBP, v.FeeFlat
}

func (m *Memory) UpdateEvent(_ context.Context, scope *uuid.UUID, id uuid.UUID, expected, prefix string, v eventadmin.EventValues) (eventadmin.Managed, error) {
	ev, ok := m.event(scope, id)
	if !ok || ev.Status != expected {
		return eventadmin.Managed{}, event.ErrNotFound
	}
	ev.CodePrefix = prefix
	setValues(&ev, v)
	m.Events[id] = ev
	return ev, nil
}

func (m *Memory) DeleteDraftEvent(_ context.Context, scope *uuid.UUID, id uuid.UUID) error {
	ev, ok := m.event(scope, id)
	if !ok || ev.Status != event.StatusDraft {
		return event.ErrNotFound
	}
	delete(m.Events, id)
	return nil
}

func (m *Memory) TransitionEvent(_ context.Context, scope *uuid.UUID, id uuid.UUID, c event.StatusChange) (eventadmin.Managed, error) {
	ev, ok := m.event(scope, id)
	if !ok || ev.Status != c.From {
		return eventadmin.Managed{}, event.ErrNotFound
	}
	ev.Status, ev.RejectionReason = c.To, c.RejectionReason
	m.Events[id] = ev
	return ev, nil
}

func (m *Memory) OrganizerActive(_ context.Context, id uuid.UUID) (bool, error) {
	return m.Organizers[id], nil
}

func (m *Memory) ListCategories(_ context.Context, scope *uuid.UUID, eventID uuid.UUID) ([]eventadmin.ManagedCategory, error) {
	out := []eventadmin.ManagedCategory{}
	if _, ok := m.event(scope, eventID); !ok {
		return out, nil
	}
	for _, c := range m.Categories {
		if c.EventID == eventID {
			out = append(out, eventadmin.ManagedCategory{Category: c, SeatCount: m.Seats[c.ID], Packages: m.packagesOf(c.ID)})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (m *Memory) packagesOf(categoryID uuid.UUID) []category.Package {
	out := []category.Package{}
	for _, p := range m.Packages {
		if p.CategoryID == categoryID {
			out = append(out, p)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

func (m *Memory) GetCategory(_ context.Context, scope *uuid.UUID, id uuid.UUID) (eventadmin.CategoryRecord, error) {
	c, ev, ok := m.category(scope, id)
	if !ok {
		return eventadmin.CategoryRecord{}, eventadmin.ErrCategoryNotFound
	}
	return eventadmin.CategoryRecord{Category: c, EventStatus: ev.Status, SeatCount: m.Seats[id], BlockCount: m.Blocks[id]}, nil
}

func (m *Memory) CreateCategory(_ context.Context, scope *uuid.UUID, eventID uuid.UUID, in category.CategoryInput) (category.Category, error) {
	if _, ok := m.event(scope, eventID); !ok {
		return category.Category{}, event.ErrNotFound
	}
	c := category.Category{ID: uuid.New(), EventID: eventID}
	setCategory(&c, in)
	m.Categories[c.ID] = c
	return c, nil
}

func setCategory(c *category.Category, in category.CategoryInput) {
	c.Name, c.Description, c.SortOrder, c.IsSeated, c.Quota = in.Name, in.Description, in.SortOrder, in.IsSeated, in.Quota
}

func (m *Memory) UpdateCategory(_ context.Context, scope *uuid.UUID, id uuid.UUID, in category.CategoryInput) (category.Category, error) {
	c, _, ok := m.category(scope, id)
	if !ok {
		return category.Category{}, eventadmin.ErrCategoryNotFound
	}
	setCategory(&c, in)
	m.Categories[id] = c
	return c, nil
}

func (m *Memory) DeleteCategory(_ context.Context, scope *uuid.UUID, id uuid.UUID) error {
	if _, _, ok := m.category(scope, id); !ok {
		return eventadmin.ErrCategoryNotFound
	}
	delete(m.Categories, id)
	return nil
}

func (m *Memory) ListPackages(_ context.Context, _ *uuid.UUID, categoryID uuid.UUID) ([]category.Package, error) {
	return m.packagesOf(categoryID), nil
}

func (m *Memory) GetPackage(_ context.Context, scope *uuid.UUID, id uuid.UUID) (eventadmin.PackageRecord, error) {
	p, ok := m.Packages[id]
	if !ok {
		return eventadmin.PackageRecord{}, eventadmin.ErrPackageNotFound
	}
	_, ev, ok := m.category(scope, p.CategoryID)
	if !ok {
		return eventadmin.PackageRecord{}, eventadmin.ErrPackageNotFound
	}
	return eventadmin.PackageRecord{Package: p, EventStatus: ev.Status}, nil
}

func (m *Memory) CreatePackage(_ context.Context, scope *uuid.UUID, categoryID uuid.UUID, in category.PackageInput) (category.Package, error) {
	if _, _, ok := m.category(scope, categoryID); !ok {
		return category.Package{}, eventadmin.ErrCategoryNotFound
	}
	p := category.Package{ID: uuid.New(), CategoryID: categoryID}
	setPackage(&p, in)
	m.Packages[p.ID] = p
	return p, nil
}

func setPackage(p *category.Package, in category.PackageInput) {
	p.Name, p.Pax, p.Price, p.Quota, p.SortOrder, p.IsActive = in.Name, in.Pax, in.Price, in.Quota, in.SortOrder, in.IsActive
}

func (m *Memory) UpdatePackage(ctx context.Context, scope *uuid.UUID, id uuid.UUID, in category.PackageInput) (category.Package, error) {
	rec, err := m.GetPackage(ctx, scope, id)
	if err != nil {
		return category.Package{}, err
	}
	p := rec.Package
	setPackage(&p, in)
	m.Packages[id] = p
	return p, nil
}

func (m *Memory) DeletePackage(ctx context.Context, scope *uuid.UUID, id uuid.UUID) error {
	if _, err := m.GetPackage(ctx, scope, id); err != nil {
		return err
	}
	delete(m.Packages, id)
	return nil
}
