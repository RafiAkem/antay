package eventadmin_test

import (
	"errors"
	"testing"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
)

func TestSubmitIncompleteListsEveryProblem(t *testing.T) {
	g := newRig()
	in := validInput()
	in.SaleStartsAt, in.SaleEndsAt = nil, nil
	d, err := g.svc.Create(ctx, g.owner, in, nil)
	if err != nil {
		t.Fatal(err)
	}
	_, err = g.svc.Transit(ctx, g.owner, d.ID, event.ActionSubmit, "")
	var inc eventadmin.IncompleteError
	if !errors.As(err, &inc) {
		t.Fatalf("err = %v, mau IncompleteError", err)
	}
	assertFields(t, inc.Issues, "saleStartsAt", "saleEndsAt", "categories")

	// Lengkapi periode jual dengan akhir lewat jam tutup, plus kategori yang
	// belum siap: tanpa paket aktif dan berkursi tanpa kursi.
	_, err = g.svc.Update(ctx, g.owner, d.ID, eventadmin.EventPatch{
		SaleStartsAt: eventadmin.Nullable[string]{Set: true, Value: str("2026-12-01T10:00:00+07:00")},
		SaleEndsAt:   eventadmin.Nullable[string]{Set: true, Value: str("2026-12-31T23:00:00+07:00")},
	})
	if err != nil {
		t.Fatal(err)
	}
	plain, _ := g.svc.CreateCategory(ctx, g.owner, d.ID, category.CategoryInput{Name: "Festival", Quota: i32(50)})
	seated, _ := g.svc.CreateCategory(ctx, g.owner, d.ID, category.CategoryInput{Name: "Tribun", IsSeated: true})
	p, _ := g.svc.CreatePackage(ctx, g.owner, plain.ID, category.PackageInput{Name: "Single", Pax: 1, Price: 1000})
	if _, err := g.svc.UpdatePackage(ctx, g.owner, p.ID, eventadmin.PackagePatch{IsActive: new(bool)}); err != nil {
		t.Fatal(err)
	}
	if _, err := g.svc.CreatePackage(ctx, g.owner, seated.ID, category.PackageInput{Name: "Single", Pax: 1, Price: 1000, IsActive: true}); err != nil {
		t.Fatal(err)
	}
	_, err = g.svc.Transit(ctx, g.owner, d.ID, event.ActionSubmit, "")
	if !errors.As(err, &inc) {
		t.Fatalf("err = %v, mau IncompleteError", err)
	}
	assertFields(t, inc.Issues, "saleEndsAt",
		"categories."+plain.ID.String()+".packages",
		"categories."+seated.ID.String()+".seats")
}

func TestFullWorkflow(t *testing.T) {
	g := newRig()
	d := g.create(t)
	c, _ := g.svc.CreateCategory(ctx, g.owner, d.ID, category.CategoryInput{Name: "Tribun", IsSeated: true})
	_, _ = g.svc.CreatePackage(ctx, g.owner, c.ID, category.PackageInput{Name: "Single", Pax: 1, Price: 50_000, IsActive: true})
	g.repo.Seats[c.ID] = 20

	if _, err := g.svc.Transit(ctx, g.owner, d.ID, event.ActionApprove, ""); !errors.Is(err, eventadmin.ErrForbidden) {
		t.Fatalf("organizer approve: %v", err)
	}
	if _, err := g.svc.Transit(ctx, g.admin, d.ID, event.ActionApprove, ""); !errors.Is(err, event.ErrInvalidStatus) {
		t.Fatalf("approve draft: %v", err)
	}
	steps := []struct {
		actor  eventadmin.Actor
		action event.Action
		want   string
	}{
		{g.owner, event.ActionSubmit, event.StatusReview},
		{g.admin, event.ActionReject, event.StatusDraft},
		{g.owner, event.ActionSubmit, event.StatusReview},
		{g.admin, event.ActionApprove, event.StatusPublished},
		{g.admin, event.ActionClose, event.StatusClosed},
	}
	for _, s := range steps {
		got, err := g.svc.Transit(ctx, s.actor, d.ID, s.action, "Harga belum final")
		if err != nil || got.Status != s.want {
			t.Fatalf("%s: status %s err %v, mau %s", s.action, got.Status, err, s.want)
		}
	}
}
