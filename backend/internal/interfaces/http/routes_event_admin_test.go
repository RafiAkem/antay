package http

import (
	"encoding/json"
	"log/slog"
	nethttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/application/eventadmin/eventadmintest"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

type eaRig struct {
	srv      nethttp.Handler
	tokens   *security.TokenService
	repo     *eventadmintest.Memory
	owner    user.Session
	stranger user.Session
	admin    user.Session
}

func newEARig(t *testing.T) eaRig {
	t.Helper()
	tokens, err := security.NewTokenService("", time.Hour, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	sessions := middleware.NewSessions(tokens, false)
	repo := eventadmintest.New()
	clock := shared.Clock(func() time.Time { return time.Date(2026, 11, 11, 10, 0, 0, 0, shared.Jakarta) })
	requireManager := func(next nethttp.Handler) nethttp.Handler {
		return middleware.Chain(next, sessions.Require, middleware.RequireRole(user.RoleOrganizer))
	}
	requireAdmin := func(next nethttp.Handler) nethttp.Handler {
		return middleware.Chain(next, sessions.Require, middleware.RequireRole(user.RoleAdmin))
	}
	mux := nethttp.NewServeMux()
	registerEventAdmin(mux, handler.NewEventAdmin(eventadmin.New(repo, clock)), requireManager, requireAdmin)
	srv := response.WithOptions(middleware.Chain(mux,
		middleware.RequestID, middleware.LogRequests(slog.New(slog.DiscardHandler)), middleware.CSRF,
	), response.Options{Version: "test"})

	org, other := uuid.New(), uuid.New()
	return eaRig{
		srv: srv, tokens: tokens, repo: repo,
		owner:    user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &org},
		stranger: user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &other},
		admin:    user.Session{UserID: uuid.New(), Role: user.RoleAdmin},
	}
}

func (g eaRig) do(t *testing.T, s user.Session, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	token, err := g.tokens.Issue(s)
	if err != nil {
		t.Fatal(err)
	}
	req.AddCookie(&nethttp.Cookie{Name: middleware.SessionCookie, Value: token})
	req.AddCookie(&nethttp.Cookie{Name: middleware.CSRFCookie, Value: "tok"})
	req.Header.Set(middleware.CSRFHeader, "tok")
	rec := httptest.NewRecorder()
	g.srv.ServeHTTP(rec, req)
	return rec
}

type eaBody struct {
	Data struct {
		Event struct {
			ID              string  `json:"id"`
			Status          string  `json:"status"`
			OrganizerID     *string `json:"organizerId"`
			RejectionReason *string `json:"rejectionReason"`
			Categories      []any   `json:"categories"`
		} `json:"event"`
		Package struct {
			ID    string `json:"id"`
			Quota *int32 `json:"quota"`
		} `json:"package"`
		Category struct {
			ID string `json:"id"`
		} `json:"category"`
	} `json:"data"`
	Error struct {
		Code    string `json:"code"`
		Details []struct {
			Field string `json:"field"`
		} `json:"details"`
	} `json:"error"`
}

func eaDecode(t *testing.T, rec *httptest.ResponseRecorder) eaBody {
	t.Helper()
	var b eaBody
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatalf("body bukan JSON: %v (%s)", err, rec.Body.String())
	}
	return b
}

func eaExpect(t *testing.T, rec *httptest.ResponseRecorder, status int, code string) eaBody {
	t.Helper()
	b := eaDecode(t, rec)
	if rec.Code != status || b.Error.Code != code {
		t.Fatalf("status %d code %q, mau %d %q: %s", rec.Code, b.Error.Code, status, code, rec.Body.String())
	}
	return b
}

const eaCreateBody = `{"name":"Tahun Baru","place":"Atrium","item":"Gelang","requirement":"KTP",
"eventDate":"2026-12-31","openTime":"10:00","closeTime":"22:00","slotMinutes":60,"slotCapacity":100,
"counterCount":2,"serviceSeconds":60,"description":"Pesta","feeBearer":"organizer","feePercentBp":250,"feeFlat":0}`

func (g eaRig) createEvent(t *testing.T) string {
	t.Helper()
	b := eaExpect(t, g.do(t, g.owner, "POST", "/operational/v1/manage/events", eaCreateBody), 201, "")
	if b.Data.Event.Status != "draft" || b.Data.Event.OrganizerID == nil || *b.Data.Event.OrganizerID != g.owner.OrganizerID.String() {
		t.Fatalf("event baru = %+v", b.Data.Event)
	}
	if b.Data.Event.Categories == nil {
		t.Fatal("categories harus [] bukan null")
	}
	return b.Data.Event.ID
}

func TestManageForeignOrganizerGets404(t *testing.T) {
	g := newEARig(t)
	id := g.createEvent(t)
	path := "/operational/v1/manage/events/" + id
	eaExpect(t, g.do(t, g.stranger, "GET", path, ""), 404, "NOT_FOUND")
	eaExpect(t, g.do(t, g.stranger, "PATCH", path, `{"description":"x"}`), 404, "NOT_FOUND")
	eaExpect(t, g.do(t, g.stranger, "POST", path+"/categories", `{"name":"VIP","quota":5}`), 404, "NOT_FOUND")
	eaExpect(t, g.do(t, g.owner, "GET", path, ""), 200, "")
	eaExpect(t, g.do(t, g.admin, "GET", path, ""), 200, "")
	eaExpect(t, g.do(t, g.owner, "GET", "/operational/v1/manage/events/bukan-uuid", ""), 404, "NOT_FOUND")
}

func TestManageRoleAndCSRFGuards(t *testing.T) {
	g := newEARig(t)
	id := g.createEvent(t)
	staff := user.Session{UserID: uuid.New(), Role: user.RoleStaff}
	eaExpect(t, g.do(t, staff, "GET", "/operational/v1/manage/events", ""), 403, "FORBIDDEN")
	eaExpect(t, g.do(t, g.owner, "POST", "/operational/v1/manage/events/"+id+"/approvals", ""), 403, "FORBIDDEN")

	req := httptest.NewRequest("POST", "/operational/v1/manage/events", strings.NewReader(eaCreateBody))
	rec := httptest.NewRecorder()
	g.srv.ServeHTTP(rec, req)
	eaExpect(t, rec, 403, "CSRF_MISSING")
}

func TestManageSubmitIncompleteAndWorkflow(t *testing.T) {
	g := newEARig(t)
	id := g.createEvent(t)
	base := "/operational/v1/manage/events/" + id
	b := eaExpect(t, g.do(t, g.owner, "POST", base+"/submissions", ""), 422, "EVENT_INCOMPLETE")
	if len(b.Error.Details) != 3 {
		t.Fatalf("details = %+v, mau saleStartsAt, saleEndsAt, categories", b.Error.Details)
	}

	eaExpect(t, g.do(t, g.owner, "PATCH", base,
		`{"saleStartsAt":"2026-12-01T10:00:00+07:00","saleEndsAt":"2026-12-31T20:00:00+07:00"}`), 200, "")
	cat := eaExpect(t, g.do(t, g.owner, "POST", base+"/categories", `{"name":"Festival","quota":100}`), 201, "")
	catPath := "/operational/v1/manage/categories/" + cat.Data.Category.ID
	pkg := eaExpect(t, g.do(t, g.owner, "POST", catPath+"/packages", `{"name":"Couple","pax":2,"price":900000,"quota":10}`), 201, "")
	if pkg.Data.Package.Quota == nil || *pkg.Data.Package.Quota != 10 {
		t.Fatalf("paket = %+v", pkg.Data.Package)
	}
	// quota:null harus menghapus batas, bukan diabaikan.
	cleared := eaExpect(t, g.do(t, g.owner, "PATCH", "/operational/v1/manage/packages/"+pkg.Data.Package.ID, `{"quota":null}`), 200, "")
	if cleared.Data.Package.Quota != nil {
		t.Fatalf("quota masih %v", *cleared.Data.Package.Quota)
	}

	eaExpect(t, g.do(t, g.owner, "POST", base+"/submissions", ""), 200, "")
	eaExpect(t, g.do(t, g.owner, "POST", base+"/submissions", ""), 409, "INVALID_STATUS")
	eaExpect(t, g.do(t, g.owner, "PATCH", base, `{"description":"ubah"}`), 422, "EVENT_NOT_EDITABLE")
	eaExpect(t, g.do(t, g.admin, "POST", base+"/rejections", `{"reason":"x"}`), 400, "VALIDATION")
	rejected := eaExpect(t, g.do(t, g.admin, "POST", base+"/rejections", `{"reason":"Poster belum ada"}`), 200, "")
	if rejected.Data.Event.Status != "draft" || rejected.Data.Event.RejectionReason == nil {
		t.Fatalf("hasil tolak = %+v", rejected.Data.Event)
	}
	eaExpect(t, g.do(t, g.owner, "POST", base+"/submissions", ""), 200, "")
	eaExpect(t, g.do(t, g.admin, "POST", base+"/approvals", ""), 200, "")
	eaExpect(t, g.do(t, g.owner, "PATCH", base, `{"name":"Ganti Nama"}`), 422, "EVENT_NOT_EDITABLE")
	eaExpect(t, g.do(t, g.owner, "DELETE", base, ""), 422, "EVENT_NOT_EDITABLE")
	done := eaExpect(t, g.do(t, g.admin, "POST", base+"/cancellations", ""), 200, "")
	if done.Data.Event.Status != "cancelled" {
		t.Fatalf("status = %s", done.Data.Event.Status)
	}
}

func TestManageBodyRules(t *testing.T) {
	g := newEARig(t)
	id := g.createEvent(t)
	eaExpect(t, g.do(t, g.owner, "PATCH", "/operational/v1/manage/events/"+id, `{"posterUrl":"x.jpg"}`), 400, "VALIDATION")
	eaExpect(t, g.do(t, g.owner, "GET", "/operational/v1/manage/events?status=open", ""), 400, "VALIDATION")
	missing := uuid.NewString()
	body := strings.Replace(eaCreateBody, `"feeFlat":0`, `"feeFlat":0,"organizerId":"`+missing+`"`, 1)
	eaExpect(t, g.do(t, g.admin, "POST", "/operational/v1/manage/events", body), 422, "ORGANIZER_INVALID")
	eaExpect(t, g.do(t, g.owner, "DELETE", "/operational/v1/manage/events/"+id, ""), 200, "")
	eaExpect(t, g.do(t, g.owner, "GET", "/operational/v1/manage/events/"+id, ""), 404, "NOT_FOUND")
}
