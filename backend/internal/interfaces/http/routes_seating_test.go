package http

import (
	"context"
	"encoding/json"
	"errors"
	nethttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	appseating "github.com/RafiAkem/antay/backend/internal/application/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
)

// stubSeatRepo cukup untuk menguji jalur HTTP; aturan bisnisnya sudah dites
// lengkap di paket application/seating.
type stubSeatRepo struct {
	ev    seating.EventRef
	seats []seating.Seat
}

var errStubUnused = errors.New("tidak dipakai di tes ini")

func (s stubSeatRepo) EventRef(_ context.Context, id uuid.UUID) (seating.EventRef, error) {
	if id != s.ev.ID {
		return seating.EventRef{}, seating.ErrEventNotFound
	}
	return s.ev, nil
}
func (stubSeatRepo) Category(context.Context, uuid.UUID) (seating.CategoryRef, error) {
	return seating.CategoryRef{}, seating.ErrCategoryNotFound
}
func (stubSeatRepo) Layout(context.Context, uuid.UUID) (seating.Layout, error) {
	return seating.Layout{}, seating.ErrLayoutNotFound
}
func (stubSeatRepo) SaveLayout(_ context.Context, l seating.Layout) (seating.Layout, error) {
	return l, nil
}
func (stubSeatRepo) Blocks(context.Context, uuid.UUID) ([]seating.Block, error) { return nil, nil }
func (stubSeatRepo) Block(context.Context, uuid.UUID) (seating.Block, error) {
	return seating.Block{}, seating.ErrBlockNotFound
}
func (s stubSeatRepo) Seats(context.Context, uuid.UUID) ([]seating.Seat, error) { return s.seats, nil }
func (stubSeatRepo) SaveBlock(context.Context, seating.Block, seating.SeatPlan) (seating.Block, error) {
	return seating.Block{}, errStubUnused
}
func (stubSeatRepo) UpdateBlockInfo(context.Context, seating.Block) (seating.Block, error) {
	return seating.Block{}, errStubUnused
}
func (stubSeatRepo) DeleteBlock(context.Context, uuid.UUID, func([]seating.Seat) error) error {
	return seating.ErrBlockNotFound
}
func (stubSeatRepo) ChangeSeats(context.Context, uuid.UUID, []string,
	func([]seating.Seat) ([]seating.StatusChange, error)) ([]seating.Seat, error) {
	return nil, errStubUnused
}

type seatingRig struct {
	mux     nethttp.Handler
	tokens  *security.TokenService
	eventID uuid.UUID
	owner   uuid.UUID
}

func newSeatingRig(t *testing.T, status string) seatingRig {
	t.Helper()
	tokens, err := security.NewTokenService("", time.Hour, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	rig := seatingRig{tokens: tokens, eventID: uuid.New(), owner: uuid.New()}
	repo := stubSeatRepo{
		ev: seating.EventRef{ID: rig.eventID, OrganizerID: &rig.owner, Status: status},
		seats: []seating.Seat{
			{ID: uuid.New(), Label: "L-A1", RowLabel: "A", Number: 1, Status: seating.StatusHeld},
			{ID: uuid.New(), Label: "L-A2", RowLabel: "A", Number: 2, Status: seating.StatusSold},
			{ID: uuid.New(), Label: "L-A3", RowLabel: "A", Number: 3, Status: seating.StatusDisabled},
		},
	}
	h := handler.NewSeating(appseating.New(repo))
	mux := nethttp.NewServeMux()
	registerSeatingManage(mux, h, middleware.NewSessions(tokens, false))
	registerSeatingPublic(mux, h)
	rig.mux = middleware.CSRF(mux)
	return rig
}

func (rig seatingRig) do(t *testing.T, method, path string, session *user.Session, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if session != nil {
		token, err := rig.tokens.Issue(*session)
		if err != nil {
			t.Fatal(err)
		}
		req.AddCookie(&nethttp.Cookie{Name: middleware.SessionCookie, Value: token})
		req.AddCookie(&nethttp.Cookie{Name: middleware.CSRFCookie, Value: "tes"})
		req.Header.Set(middleware.CSRFHeader, "tes")
	}
	rec := httptest.NewRecorder()
	rig.mux.ServeHTTP(rec, req)
	return rec
}

func organizerSession(id uuid.UUID) *user.Session {
	return &user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &id}
}

func TestSeatMapScopedToOwner(t *testing.T) {
	rig := newSeatingRig(t, event.StatusDraft)
	path := "/operational/v1/manage/events/" + rig.eventID.String() + "/seat-map"
	cases := []struct {
		name    string
		session *user.Session
		want    int
	}{
		{"tanpa sesi", nil, nethttp.StatusUnauthorized},
		{"petugas loket", &user.Session{UserID: uuid.New(), Role: user.RoleStaff}, nethttp.StatusForbidden},
		{"organizer lain", organizerSession(uuid.New()), nethttp.StatusNotFound},
		{"pemilik", organizerSession(rig.owner), nethttp.StatusOK},
		{"admin", &user.Session{UserID: uuid.New(), Role: user.RoleAdmin}, nethttp.StatusOK},
	}
	for _, c := range cases {
		if rec := rig.do(t, nethttp.MethodGet, path, c.session, ""); rec.Code != c.want {
			t.Fatalf("%s: status %d, mau %d (%s)", c.name, rec.Code, c.want, rec.Body)
		}
	}
	// Blok milik event orang lain juga 404, bukan 403.
	blockPath := "/operational/v1/manage/seat-blocks/" + uuid.NewString()
	if rec := rig.do(t, nethttp.MethodDelete, blockPath, organizerSession(uuid.New()), ""); rec.Code != nethttp.StatusNotFound {
		t.Fatalf("hapus blok asing: status %d, mau 404", rec.Code)
	}
}

func TestSeatWritesNeedCSRFAndCompleteBody(t *testing.T) {
	rig := newSeatingRig(t, event.StatusDraft)
	path := "/operational/v1/manage/events/" + rig.eventID.String() + "/seat-blocks"
	req := httptest.NewRequest(nethttp.MethodPost, path, strings.NewReader(`{}`))
	rec := httptest.NewRecorder()
	rig.mux.ServeHTTP(rec, req)
	if rec.Code != nethttp.StatusForbidden {
		t.Fatalf("tanpa CSRF: status %d, mau 403", rec.Code)
	}
	if rec := rig.do(t, nethttp.MethodPost, path, organizerSession(rig.owner), `{"code":"L"}`); rec.Code != nethttp.StatusBadRequest {
		t.Fatalf("body kurang: status %d, mau 400 (%s)", rec.Code, rec.Body)
	}
}

func TestPublicSeatMapHidesHolds(t *testing.T) {
	rig := newSeatingRig(t, event.StatusPublished)
	rec := rig.do(t, nethttp.MethodGet, "/public/v1/events/"+rig.eventID.String()+"/seat-map", nil, "")
	if rec.Code != nethttp.StatusOK {
		t.Fatalf("status %d (%s)", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q", got)
	}
	var body struct {
		Data struct {
			Layout struct {
				Stage struct {
					Label string `json:"label"`
				} `json:"stage"`
			} `json:"layout"`
			Seats []struct {
				Label  string `json:"label"`
				Status string `json:"status"`
			} `json:"seats"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	want := map[string]string{"L-A1": "taken", "L-A2": "taken", "L-A3": "disabled"}
	for _, s := range body.Data.Seats {
		if want[s.Label] != s.Status {
			t.Fatalf("%s = %s, mau %s", s.Label, s.Status, want[s.Label])
		}
	}
	if body.Data.Layout.Stage.Label != "Panggung" {
		t.Fatalf("layout bawaan tidak terkirim: %+v", body.Data.Layout)
	}

	draft := newSeatingRig(t, event.StatusDraft)
	if rec := draft.do(t, nethttp.MethodGet, "/public/v1/events/"+draft.eventID.String()+"/seat-map", nil, ""); rec.Code != nethttp.StatusNotFound {
		t.Fatalf("event draft: status %d, mau 404", rec.Code)
	}
}

func TestPreviewReturnsSeatsWithoutSaving(t *testing.T) {
	rig := newSeatingRig(t, event.StatusDraft)
	body := `{"eventId":"` + rig.eventID.String() + `","code":"L","x":500,"y":300,` +
		`"rowCount":2,"seatsPerRow":3,"curve":40,"aisleAfter":[1]}`
	rec := rig.do(t, nethttp.MethodPost, "/operational/v1/manage/seat-blocks/preview", organizerSession(rig.owner), body)
	if rec.Code != nethttp.StatusOK {
		t.Fatalf("status %d (%s)", rec.Code, rec.Body)
	}
	var out struct {
		Data struct {
			Seats []struct {
				Label string `json:"label"`
				Row   string `json:"row"`
			} `json:"seats"`
			Warnings []string `json:"warnings"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if len(out.Data.Seats) != 6 || out.Data.Seats[5].Label != "L-B3" || out.Data.Warnings == nil {
		t.Fatalf("pratinjau = %+v", out.Data)
	}
}
