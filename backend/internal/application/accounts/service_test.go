package accounts

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/contact"
	"github.com/RafiAkem/antay/backend/internal/domain/organizer"
)

type fakeRepo struct {
	organizers map[uuid.UUID]organizer.Organizer
	created    []NewUserRecord
	updated    []UserChanges
}

func (f *fakeRepo) ListOrganizers(context.Context) ([]organizer.Organizer, error) { return nil, nil }
func (f *fakeRepo) GetOrganizer(_ context.Context, id uuid.UUID) (organizer.Organizer, error) {
	o, ok := f.organizers[id]
	if !ok {
		return organizer.Organizer{}, organizer.ErrNotFound
	}
	return o, nil
}
func (f *fakeRepo) CreateOrganizer(_ context.Context, d organizer.Draft) (organizer.Organizer, error) {
	return organizer.Organizer{ID: uuid.New(), Name: d.Name, ContactEmail: d.ContactEmail, IsActive: true}, nil
}
func (f *fakeRepo) UpdateOrganizer(context.Context, uuid.UUID, organizer.Patch) (organizer.Organizer, error) {
	return organizer.Organizer{}, nil
}
func (f *fakeRepo) ListUsers(context.Context) ([]User, error) { return nil, nil }
func (f *fakeRepo) CreateUser(_ context.Context, rec NewUserRecord) (User, error) {
	f.created = append(f.created, rec)
	return User{ID: uuid.New(), Email: rec.Email, Name: rec.Name, Role: rec.Role, OrganizerID: rec.OrganizerID, IsActive: true}, nil
}
func (f *fakeRepo) UpdateUser(_ context.Context, id uuid.UUID, c UserChanges) (User, error) {
	f.updated = append(f.updated, c)
	return User{ID: id}, nil
}

type plainHasher struct{}

func (plainHasher) Hash(p string) (string, error) { return "hash:" + p, nil }

func newService() (*Service, *fakeRepo, uuid.UUID, uuid.UUID) {
	active, inactive := uuid.New(), uuid.New()
	repo := &fakeRepo{organizers: map[uuid.UUID]organizer.Organizer{
		active:   {ID: active, IsActive: true},
		inactive: {ID: inactive, IsActive: false},
	}}
	return New(repo, plainHasher{}), repo, active, inactive
}

func issueFields(err error) map[string]bool {
	var verr *contact.ValidationError
	if !errors.As(err, &verr) {
		return nil
	}
	out := map[string]bool{}
	for _, i := range verr.Issues {
		out[i.Field] = true
	}
	return out
}

func strPtr(s string) *string { return &s }

func TestCreateUserRoleOrganizerRule(t *testing.T) {
	svc, _, active, _ := newService()
	base := NewUser{Email: "a@antay.id", Password: "rahasia123", Name: "Petugas"}
	cases := []struct {
		role  string
		orgID *string
		field string
	}{
		{"organizer", nil, "organizerId"},
		{"organizer", strPtr("bukan-uuid"), "organizerId"},
		{"staff", strPtr(active.String()), "organizerId"},
		{"admin", strPtr(active.String()), "organizerId"},
		{"kasir", nil, "role"},
		{"", nil, "role"},
	}
	for _, c := range cases {
		in := base
		in.Role, in.OrganizerID = c.role, c.orgID
		_, err := svc.CreateUser(context.Background(), in)
		if !issueFields(err)[c.field] {
			t.Fatalf("role %q org %v: err = %v, mau issue di %s", c.role, c.orgID, err, c.field)
		}
	}
}

func TestCreateUserRejectsUnknownOrInactiveOrganizer(t *testing.T) {
	svc, repo, _, inactive := newService()
	for _, id := range []uuid.UUID{inactive, uuid.New()} {
		_, err := svc.CreateUser(context.Background(), NewUser{
			Email: "eo@antay.id", Password: "rahasia123", Name: "EO", Role: "organizer", OrganizerID: strPtr(id.String()),
		})
		if !errors.Is(err, ErrOrganizerInvalid) {
			t.Fatalf("err = %v, mau ErrOrganizerInvalid", err)
		}
	}
	if len(repo.created) != 0 {
		t.Fatal("akun tidak boleh dibuat")
	}
}

func TestCreateUserHashesAndLinksOrganizer(t *testing.T) {
	svc, repo, active, _ := newService()
	u, err := svc.CreateUser(context.Background(), NewUser{
		Email: " EO@Antay.id ", Password: "rahasia123", Name: "EO", Role: "organizer", OrganizerID: strPtr(active.String()),
	})
	if err != nil {
		t.Fatal(err)
	}
	rec := repo.created[0]
	if rec.Email != "eo@antay.id" || rec.PasswordHash != "hash:rahasia123" || *u.OrganizerID != active {
		t.Fatalf("record = %+v", rec)
	}
}

func TestStaffWithEmptyOrganizerIDIsFine(t *testing.T) {
	svc, repo, _, _ := newService()
	_, err := svc.CreateUser(context.Background(), NewUser{
		Email: "s@antay.id", Password: "rahasia123", Name: "Staf", Role: "staff", OrganizerID: strPtr(""),
	})
	if err != nil || repo.created[0].OrganizerID != nil {
		t.Fatalf("err = %v, org = %v", err, repo.created)
	}
}

func TestUpdateUserRules(t *testing.T) {
	svc, repo, _, _ := newService()
	me := uuid.New()
	off := false
	if _, err := svc.UpdateUser(context.Background(), me, me, UserPatch{IsActive: &off}); !errors.Is(err, ErrSelfDeactivate) {
		t.Fatalf("err = %v, mau ErrSelfDeactivate", err)
	}
	if _, err := svc.UpdateUser(context.Background(), me, uuid.New(), UserPatch{}); issueFields(err) == nil {
		t.Fatalf("patch kosong harus VALIDATION, dapat %v", err)
	}
	if _, err := svc.UpdateUser(context.Background(), me, uuid.New(), UserPatch{Password: strPtr("pendek")}); !issueFields(err)["password"] {
		t.Fatalf("err = %v, mau issue password", err)
	}
	if _, err := svc.UpdateUser(context.Background(), me, uuid.New(), UserPatch{Password: strPtr("rahasia123"), IsActive: &off}); err != nil {
		t.Fatal(err)
	}
	if got := repo.updated[0]; *got.PasswordHash != "hash:rahasia123" || *got.IsActive {
		t.Fatalf("changes = %+v", got)
	}
}

func TestOrganizerDraftValidation(t *testing.T) {
	svc, _, _, _ := newService()
	_, err := svc.CreateOrganizer(context.Background(), organizer.Draft{Name: "X", ContactEmail: "bukan-email", ContactPhone: "123"})
	fields := issueFields(err)
	if !fields["name"] || !fields["contactEmail"] || !fields["contactPhone"] {
		t.Fatalf("issues = %v", fields)
	}
	o, err := svc.CreateOrganizer(context.Background(), organizer.Draft{Name: " Persib ", ContactEmail: "EO@Persib.id"})
	if err != nil || o.Name != "Persib" || o.ContactEmail != "eo@persib.id" {
		t.Fatalf("o = %+v, err = %v", o, err)
	}
}
