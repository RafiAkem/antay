package http

import (
	"context"
	"encoding/json"
	nethttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/accounts"
	"github.com/RafiAkem/antay/backend/internal/domain/organizer"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
)

// acctRepo cukup untuk menguji aturan di handler dan service; SQL-nya diuji terpisah.
type acctRepo struct {
	orgs  map[uuid.UUID]organizer.Organizer
	users map[uuid.UUID]accounts.User
}

func (f *acctRepo) ListOrganizers(context.Context) ([]organizer.Organizer, error) {
	out := []organizer.Organizer{}
	for _, o := range f.orgs {
		out = append(out, o)
	}
	return out, nil
}

func (f *acctRepo) GetOrganizer(_ context.Context, id uuid.UUID) (organizer.Organizer, error) {
	if o, ok := f.orgs[id]; ok {
		return o, nil
	}
	return organizer.Organizer{}, organizer.ErrNotFound
}

func (f *acctRepo) CreateOrganizer(_ context.Context, d organizer.Draft) (organizer.Organizer, error) {
	o := organizer.Organizer{ID: uuid.New(), Name: d.Name, ContactEmail: d.ContactEmail, ContactPhone: d.ContactPhone, IsActive: true}
	f.orgs[o.ID] = o
	return o, nil
}

func (f *acctRepo) UpdateOrganizer(_ context.Context, id uuid.UUID, p organizer.Patch) (organizer.Organizer, error) {
	o, ok := f.orgs[id]
	if !ok {
		return organizer.Organizer{}, organizer.ErrNotFound
	}
	if p.IsActive != nil {
		o.IsActive = *p.IsActive
	}
	f.orgs[id] = o
	return o, nil
}

func (f *acctRepo) ListUsers(context.Context) ([]accounts.User, error) {
	out := []accounts.User{}
	for _, u := range f.users {
		out = append(out, u)
	}
	return out, nil
}

func (f *acctRepo) CreateUser(_ context.Context, rec accounts.NewUserRecord) (accounts.User, error) {
	for _, u := range f.users {
		if u.Email == rec.Email {
			return accounts.User{}, accounts.ErrEmailTaken
		}
	}
	u := accounts.User{ID: uuid.New(), Email: rec.Email, Name: rec.Name, Role: rec.Role, OrganizerID: rec.OrganizerID, IsActive: true}
	f.users[u.ID] = u
	return u, nil
}

func (f *acctRepo) UpdateUser(_ context.Context, id uuid.UUID, c accounts.UserChanges) (accounts.User, error) {
	u, ok := f.users[id]
	if !ok {
		return accounts.User{}, accounts.ErrUserNotFound
	}
	if c.IsActive != nil {
		u.IsActive = *c.IsActive
	}
	f.users[id] = u
	return u, nil
}

type acctEnv struct {
	h       nethttp.Handler
	repo    *acctRepo
	admin   *nethttp.Cookie
	adminID uuid.UUID
	staff   *nethttp.Cookie
}

func newAcctEnv(t *testing.T) acctEnv {
	t.Helper()
	tokens, err := security.NewTokenService("", time.Hour, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	s := middleware.NewSessions(tokens, false)
	repo := &acctRepo{orgs: map[uuid.UUID]organizer.Organizer{}, users: map[uuid.UUID]accounts.User{}}
	adminID := uuid.New()
	repo.users[adminID] = accounts.User{ID: adminID, Email: "admin@antay.id", Name: "Admin", Role: user.RoleAdmin, IsActive: true}

	mux := nethttp.NewServeMux()
	requireAdmin := func(next nethttp.Handler) nethttp.Handler {
		return middleware.Chain(next, s.Require, middleware.RequireRole(user.RoleAdmin))
	}
	registerAccounts(mux, handler.NewAccounts(accounts.New(repo, security.Bcrypt{})), requireAdmin)

	cookie := func(role string, id uuid.UUID) *nethttp.Cookie {
		token, err := tokens.Issue(user.Session{UserID: id, Role: role})
		if err != nil {
			t.Fatal(err)
		}
		return &nethttp.Cookie{Name: middleware.SessionCookie, Value: token}
	}
	return acctEnv{
		h: middleware.CSRF(mux), repo: repo,
		admin: cookie(user.RoleAdmin, adminID), adminID: adminID,
		staff: cookie(user.RoleStaff, uuid.New()),
	}
}

type acctBody struct {
	Data  map[string]json.RawMessage `json:"data"`
	Error struct {
		Code    string
		Details []struct{ Field, Issue string }
	} `json:"error"`
}

func acctDecode(t *testing.T, rec *httptest.ResponseRecorder) acctBody {
	t.Helper()
	var b acctBody
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatalf("body bukan JSON: %v (%s)", err, rec.Body.String())
	}
	return b
}

func TestAccountsNeedAdmin(t *testing.T) {
	env := newAcctEnv(t)
	if rec := custDo(env.h, "GET", "/operational/v1/users", ""); rec.Code != nethttp.StatusUnauthorized {
		t.Fatalf("tanpa sesi = %d, mau 401", rec.Code)
	}
	if rec := custDo(env.h, "GET", "/operational/v1/organizers", "", env.staff); rec.Code != nethttp.StatusForbidden {
		t.Fatalf("staff = %d, mau 403", rec.Code)
	}
}

func TestAccountsOrganizerAndUserFlow(t *testing.T) {
	env := newAcctEnv(t)
	rec := custDo(env.h, "POST", "/operational/v1/organizers",
		`{"name":" Persib ","contactEmail":"EO@Persib.id","contactPhone":"0812 3456 7890"}`, env.admin)
	if rec.Code != nethttp.StatusCreated {
		t.Fatalf("buat organizer = %d %s", rec.Code, rec.Body)
	}
	var org struct {
		ID, Name, ContactEmail, ContactPhone string
		IsActive                             bool
	}
	_ = json.Unmarshal(acctDecode(t, rec).Data["organizer"], &org)
	if org.Name != "Persib" || org.ContactEmail != "eo@persib.id" || org.ContactPhone != "6281234567890" || !org.IsActive {
		t.Fatalf("organizer = %+v", org)
	}

	body := `{"email":"eo@antay.id","password":"rahasia123","name":"EO Persib","role":"organizer","organizerId":"` + org.ID + `"}`
	rec = custDo(env.h, "POST", "/operational/v1/users", body, env.admin)
	if rec.Code != nethttp.StatusCreated || !strings.Contains(string(acctDecode(t, rec).Data["user"]), `"organizerId":"`+org.ID+`"`) {
		t.Fatalf("buat user = %d %s", rec.Code, rec.Body)
	}
	if rec := custDo(env.h, "POST", "/operational/v1/users", body, env.admin); acctDecode(t, rec).Error.Code != "EMAIL_TAKEN" || rec.Code != 409 {
		t.Fatalf("email dobel = %d %s", rec.Code, rec.Body)
	}

	rec = custDo(env.h, "PATCH", "/operational/v1/organizers/"+org.ID, `{"isActive":false}`, env.admin)
	if rec.Code != 200 {
		t.Fatalf("nonaktifkan organizer = %d %s", rec.Code, rec.Body)
	}
	body = strings.Replace(body, "eo@antay.id", "eo2@antay.id", 1)
	if rec := custDo(env.h, "POST", "/operational/v1/users", body, env.admin); rec.Code != 422 || acctDecode(t, rec).Error.Code != "ORGANIZER_INVALID" {
		t.Fatalf("organizer nonaktif = %d %s", rec.Code, rec.Body)
	}

	rec = custDo(env.h, "GET", "/operational/v1/users", "", env.admin)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"isActive":true`) || !strings.Contains(rec.Body.String(), `"organizerId":null`) {
		t.Fatalf("daftar user = %d %s", rec.Code, rec.Body)
	}
}

func TestAccountsUserValidation(t *testing.T) {
	env := newAcctEnv(t)
	cases := map[string]string{
		`{"email":"a@antay.id","password":"rahasia123","name":"EO","role":"organizer"}`:                                        "organizerId",
		`{"email":"a@antay.id","password":"rahasia123","name":"Staf","role":"staff","organizerId":"` + uuid.NewString() + `"}`: "organizerId",
		`{"email":"a@antay.id","password":"rahasia123","name":"Staf","role":"kasir"}`:                                          "role",
		`{"email":"a@antay.id","password":"pendek","name":"Staf","role":"staff"}`:                                              "password",
	}
	for body, field := range cases {
		rec := custDo(env.h, "POST", "/operational/v1/users", body, env.admin)
		b := acctDecode(t, rec)
		if rec.Code != 400 || b.Error.Code != "VALIDATION" || len(b.Error.Details) != 1 || b.Error.Details[0].Field != field {
			t.Fatalf("%s = %d %s, mau VALIDATION di %s", body, rec.Code, rec.Body, field)
		}
	}
	rec := custDo(env.h, "POST", "/operational/v1/users",
		`{"email":"a@antay.id","password":"rahasia123","name":"EO","role":"organizer","organizerId":"`+uuid.NewString()+`"}`, env.admin)
	if rec.Code != 422 || acctDecode(t, rec).Error.Code != "ORGANIZER_INVALID" {
		t.Fatalf("organizer asing = %d %s", rec.Code, rec.Body)
	}
}

func TestAccountsUpdateUserGuards(t *testing.T) {
	env := newAcctEnv(t)
	if rec := custDo(env.h, "PATCH", "/operational/v1/users/"+env.adminID.String(), `{"isActive":false}`, env.admin); rec.Code != 422 ||
		acctDecode(t, rec).Error.Code != "CANNOT_DEACTIVATE_SELF" {
		t.Fatalf("nonaktifkan diri = %d %s", rec.Code, rec.Body)
	}
	for _, path := range []string{"/operational/v1/users/" + uuid.NewString(), "/operational/v1/users/bukan-uuid"} {
		if rec := custDo(env.h, "PATCH", path, `{"name":"Baru"}`, env.admin); rec.Code != 404 {
			t.Fatalf("%s = %d, mau 404", path, rec.Code)
		}
	}
	if rec := custDo(env.h, "PATCH", "/operational/v1/organizers/"+uuid.NewString(), `{"name":"Baru"}`, env.admin); rec.Code != 404 {
		t.Fatalf("organizer asing = %d, mau 404", rec.Code)
	}
}
