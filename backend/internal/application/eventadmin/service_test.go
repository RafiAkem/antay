package eventadmin_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/application/eventadmin/eventadmintest"
	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

var ctx = context.Background()

func fixedClock() shared.Clock {
	return func() time.Time { return time.Date(2026, 11, 11, 10, 0, 0, 0, shared.Jakarta) }
}

func str(s string) *string { return &s }
func i32(v int32) *int32   { return &v }

func validInput() eventadmin.EventInput {
	return eventadmin.EventInput{
		Name: "Tahun Baru di Mal", Place: "Atrium", Item: "Gelang", Requirement: "KTP",
		EventDate: "2026-12-31", OpenTime: "10:00", CloseTime: "22:00",
		SlotMinutes: 60, SlotCapacity: 100, CounterCount: 2, ServiceSeconds: 60,
		SaleStartsAt: str("2026-12-01T10:00:00+07:00"), SaleEndsAt: str("2026-12-31T20:00:00+07:00"),
	}
}

type rig struct {
	svc        *eventadmin.Service
	repo       *eventadmintest.Memory
	admin      eventadmin.Actor
	owner      eventadmin.Actor
	stranger   eventadmin.Actor
	ownerOrgID uuid.UUID
}

func newRig() rig {
	repo := eventadmintest.New()
	org, other := uuid.New(), uuid.New()
	return rig{
		svc:        eventadmin.New(repo, fixedClock()),
		repo:       repo,
		admin:      eventadmin.Actor{UserID: uuid.New(), Role: user.RoleAdmin},
		owner:      eventadmin.Actor{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &org},
		stranger:   eventadmin.Actor{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &other},
		ownerOrgID: org,
	}
}

func (g rig) create(t *testing.T) eventadmin.Detail {
	t.Helper()
	d, err := g.svc.Create(ctx, g.owner, validInput(), nil)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	return d
}

func TestOrganizerCreateOwnsEventEvenIfAnotherIsSent(t *testing.T) {
	g := newRig()
	other := uuid.New()
	d, err := g.svc.Create(ctx, g.owner, validInput(), &other)
	if err != nil {
		t.Fatal(err)
	}
	if d.Status != event.StatusDraft || d.OrganizerID == nil || *d.OrganizerID != g.ownerOrgID {
		t.Fatalf("event = status %s org %v, mau draft milik organizer sendiri", d.Status, d.OrganizerID)
	}
	if d.FeeBearer != event.FeeBearerCustomer || d.CodePrefix != "TA" {
		t.Fatalf("default salah: feeBearer %q prefix %q", d.FeeBearer, d.CodePrefix)
	}
}

func TestAdminCreateNeedsActiveOrganizer(t *testing.T) {
	g := newRig()
	missing := uuid.New()
	if _, err := g.svc.Create(ctx, g.admin, validInput(), &missing); !errors.Is(err, eventadmin.ErrOrganizerInvalid) {
		t.Fatalf("err = %v, mau ErrOrganizerInvalid", err)
	}
	g.repo.Organizers[missing] = true
	if _, err := g.svc.Create(ctx, g.admin, validInput(), &missing); err != nil {
		t.Fatalf("organizer aktif harus lolos: %v", err)
	}
}

func TestCreateValidation(t *testing.T) {
	g := newRig()
	in := validInput()
	in.EventDate = "2026-11-10"
	in.FeeBearer = "mal"
	in.SaleEndsAt = str("2026-11-30T10:00:00+07:00")
	_, err := g.svc.Create(ctx, g.owner, in, nil)
	var v eventadmin.ValidationError
	if !errors.As(err, &v) {
		t.Fatalf("err = %v, mau ValidationError", err)
	}
	got := map[string]bool{}
	for _, f := range v.Validation.FieldErrors {
		got[f.Field] = true
	}
	for _, f := range []string{"eventDate", "feeBearer", "saleEndsAt"} {
		if !got[f] {
			t.Fatalf("field %s tidak dilaporkan: %+v", f, v.Validation.FieldErrors)
		}
	}
}

func TestForeignOrganizerSeesNotFound(t *testing.T) {
	g := newRig()
	d := g.create(t)
	if _, err := g.svc.Get(ctx, g.stranger, d.ID); !errors.Is(err, event.ErrNotFound) {
		t.Fatalf("Get organizer lain: %v", err)
	}
	if _, err := g.svc.Update(ctx, g.stranger, d.ID, eventadmin.EventPatch{Description: str("x")}); !errors.Is(err, event.ErrNotFound) {
		t.Fatalf("Update organizer lain: %v", err)
	}
	if _, err := g.svc.Transit(ctx, g.stranger, d.ID, event.ActionSubmit, ""); !errors.Is(err, event.ErrNotFound) {
		t.Fatalf("Submit organizer lain: %v", err)
	}
	if err := g.svc.Delete(ctx, g.stranger, d.ID); !errors.Is(err, event.ErrNotFound) {
		t.Fatalf("Delete organizer lain: %v", err)
	}
	cat, err := g.svc.CreateCategory(ctx, g.owner, d.ID, category.CategoryInput{Name: "VIP", Quota: i32(10)})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := g.svc.UpdateCategory(ctx, g.stranger, cat.ID, eventadmin.CategoryPatch{Name: str("X")}); !errors.Is(err, eventadmin.ErrCategoryNotFound) {
		t.Fatalf("UpdateCategory organizer lain: %v", err)
	}
	list, _ := g.svc.List(ctx, g.stranger, "")
	if len(list) != 0 {
		t.Fatalf("daftar organizer lain berisi %d event", len(list))
	}
	if all, _ := g.svc.List(ctx, g.admin, ""); len(all) != 1 {
		t.Fatalf("admin harus melihat semua event, dapat %d", len(all))
	}
}

func TestOrganizerWithoutIDNeverGetsAdminScope(t *testing.T) {
	odd := eventadmin.Actor{Role: user.RoleOrganizer}
	if s := odd.Scope(); s == nil || *s != uuid.Nil {
		t.Fatalf("scope = %v, mau uuid.Nil", s)
	}
}

func TestPublishedEditRules(t *testing.T) {
	g := newRig()
	d := g.create(t)
	ev := g.repo.Events[d.ID]
	ev.Status = event.StatusPublished
	g.repo.Events[d.ID] = ev

	same := validInput().Name
	got, err := g.svc.Update(ctx, g.owner, d.ID, eventadmin.EventPatch{Name: &same, Description: str("Baru"), SlotCapacity: i32(80)})
	if err != nil || got.Description != "Baru" || got.SlotCapacity != 80 {
		t.Fatalf("ubah field yang boleh: %+v err %v", got.Managed, err)
	}
	_, err = g.svc.Update(ctx, g.owner, d.ID, eventadmin.EventPatch{Name: str("Nama Lain"), Place: str("Lobi")})
	var locked eventadmin.NotEditableError
	if !errors.As(err, &locked) || strings.Join(locked.Fields, ",") != "name,place" {
		t.Fatalf("err = %v (%+v), mau NotEditable name,place", err, locked)
	}

	ev.Status = event.StatusReview
	g.repo.Events[d.ID] = ev
	if _, err := g.svc.Update(ctx, g.owner, d.ID, eventadmin.EventPatch{Description: str("x")}); !errors.As(err, &locked) {
		t.Fatalf("review harus terkunci: %v", err)
	}
	if err := g.svc.Delete(ctx, g.owner, d.ID); !errors.As(err, &locked) {
		t.Fatalf("hapus non-draft: %v", err)
	}
}

func TestCategoryWithSeatBlocksIsGuarded(t *testing.T) {
	g := newRig()
	d := g.create(t)
	c, _ := g.svc.CreateCategory(ctx, g.owner, d.ID, category.CategoryInput{Name: "Tribun", IsSeated: true})
	g.repo.Blocks[c.ID] = 2
	if err := g.svc.DeleteCategory(ctx, g.owner, c.ID); !errors.Is(err, eventadmin.ErrCategoryHasSeats) {
		t.Fatalf("hapus: %v", err)
	}
	off := false
	if _, err := g.svc.UpdateCategory(ctx, g.owner, c.ID, eventadmin.CategoryPatch{IsSeated: &off, Quota: eventadmin.Nullable[int32]{Set: true, Value: i32(10)}}); !errors.Is(err, eventadmin.ErrCategoryHasSeats) {
		t.Fatalf("ganti isSeated: %v", err)
	}
	if _, err := g.svc.UpdateCategory(ctx, g.owner, c.ID, eventadmin.CategoryPatch{Name: str("Tribun Utara")}); err != nil {
		t.Fatalf("ganti nama tetap boleh: %v", err)
	}
}

func assertFields(t *testing.T, issues []event.FieldIssue, want ...string) {
	t.Helper()
	got := map[string]bool{}
	for _, i := range issues {
		got[i.Field] = true
	}
	if len(got) != len(want) {
		t.Fatalf("issues = %+v, mau %v", issues, want)
	}
	for _, f := range want {
		if !got[f] {
			t.Fatalf("field %s tidak ada di %+v", f, issues)
		}
	}
}
