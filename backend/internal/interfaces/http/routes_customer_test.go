package http

import (
	"encoding/json"
	nethttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/customeraccount"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
)

type custEnv struct {
	h      nethttp.Handler
	tokens *security.TokenService
	repo   *custRepo
}

func newCustEnv(t *testing.T) custEnv {
	t.Helper()
	tokens, err := security.NewTokenService("", time.Hour, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	cs := middleware.NewCustomerSessions(tokens, false)
	repo := &custRepo{rows: map[string]*custRow{}}
	mux := nethttp.NewServeMux()
	registerCustomer(mux, handler.NewCustomerAuth(customeraccount.New(repo, security.Bcrypt{}, tokens), cs), cs)
	return custEnv{h: middleware.CSRF(mux), tokens: tokens, repo: repo}
}

// custDo menyertakan pasangan token CSRF untuk method yang mengubah state.
func custDo(h nethttp.Handler, method, path, body string, cookies ...*nethttp.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if method != nethttp.MethodGet {
		req.AddCookie(&nethttp.Cookie{Name: middleware.CSRFCookie, Value: "tes-csrf"})
		req.Header.Set(middleware.CSRFHeader, "tes-csrf")
	}
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func custCookie(t *testing.T, rec *httptest.ResponseRecorder) *nethttp.Cookie {
	t.Helper()
	for _, c := range rec.Result().Cookies() {
		if c.Name == middleware.CustomerSessionCookie {
			return c
		}
	}
	t.Fatalf("cookie %s tidak dipasang", middleware.CustomerSessionCookie)
	return nil
}

type custBody struct {
	Data struct {
		Customer struct{ ID, Email, Name, Phone string } `json:"customer"`
	} `json:"data"`
	Error struct {
		Code, Message string
		Details       []struct{ Field, Issue string }
	} `json:"error"`
}

func custDecode(t *testing.T, rec *httptest.ResponseRecorder) custBody {
	t.Helper()
	var b custBody
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatalf("body bukan JSON: %v (%s)", err, rec.Body.String())
	}
	return b
}

const custRegisterBody = `{"email":" Ani@Contoh.id ","password":"rahasia123","name":" Ani ","phone":"0812-3456-7890"}`

func TestCustomerRegisterLoginMeFlow(t *testing.T) {
	env := newCustEnv(t)
	rec := custDo(env.h, "POST", "/customer/v1/auth/register", custRegisterBody)
	if rec.Code != nethttp.StatusCreated {
		t.Fatalf("register = %d %s", rec.Code, rec.Body)
	}
	got := custDecode(t, rec).Data.Customer
	if got.Email != "ani@contoh.id" || got.Name != "Ani" || got.Phone != "6281234567890" || got.ID == "" {
		t.Fatalf("customer = %+v", got)
	}
	cookie := custCookie(t, rec)
	if !cookie.HttpOnly || cookie.SameSite != nethttp.SameSiteStrictMode || cookie.Path != "/" || cookie.MaxAge != 24*60*60 {
		t.Fatalf("atribut cookie salah: %+v", cookie)
	}

	if rec := custDo(env.h, "GET", "/customer/v1/me", "", cookie); rec.Code != 200 || custDecode(t, rec).Data.Customer.ID != got.ID {
		t.Fatalf("me = %d %s", rec.Code, rec.Body)
	}
	rec = custDo(env.h, "PATCH", "/customer/v1/me", `{"name":"Ani Lestari","phone":"+62 811 222 333"}`, cookie)
	if upd := custDecode(t, rec).Data.Customer; rec.Code != 200 || upd.Name != "Ani Lestari" || upd.Phone != "62811222333" {
		t.Fatalf("patch me = %d %s", rec.Code, rec.Body)
	}

	rec = custDo(env.h, "POST", "/customer/v1/auth/logout", "", cookie)
	if rec.Code != nethttp.StatusNoContent || custCookie(t, rec).MaxAge >= 0 {
		t.Fatalf("logout = %d, cookie harus dihapus", rec.Code)
	}

	rec = custDo(env.h, "POST", "/customer/v1/auth/login", `{"email":"ANI@contoh.id","password":"rahasia123"}`)
	if rec.Code != 200 || custDecode(t, rec).Data.Customer.ID != got.ID {
		t.Fatalf("login = %d %s", rec.Code, rec.Body)
	}
	custCookie(t, rec)
}

func TestCustomerRegisterDuplicateAndValidation(t *testing.T) {
	env := newCustEnv(t)
	custDo(env.h, "POST", "/customer/v1/auth/register", custRegisterBody)
	rec := custDo(env.h, "POST", "/customer/v1/auth/register", strings.Replace(custRegisterBody, " Ani@", "ani@", 1))
	if rec.Code != nethttp.StatusConflict || custDecode(t, rec).Error.Code != "EMAIL_TAKEN" {
		t.Fatalf("duplikat = %d %s", rec.Code, rec.Body)
	}

	rec = custDo(env.h, "POST", "/customer/v1/auth/register", `{"email":"x","password":"pendek","name":"A","phone":"123"}`)
	body := custDecode(t, rec)
	if rec.Code != nethttp.StatusBadRequest || body.Error.Code != "VALIDATION" || len(body.Error.Details) != 4 {
		t.Fatalf("validasi = %d %s", rec.Code, rec.Body)
	}
}

func TestCustomerLoginFailuresLookTheSame(t *testing.T) {
	env := newCustEnv(t)
	custDo(env.h, "POST", "/customer/v1/auth/register", custRegisterBody)
	custDo(env.h, "POST", "/customer/v1/auth/register", strings.Replace(custRegisterBody, "Ani@", "Mati@", 1))
	env.repo.rows["mati@contoh.id"].c.IsActive = false

	var first string
	for _, body := range []string{
		`{"email":"asing@contoh.id","password":"rahasia123"}`,
		`{"email":"ani@contoh.id","password":"salah12345"}`,
		`{"email":"mati@contoh.id","password":"rahasia123"}`,
	} {
		rec := custDo(env.h, "POST", "/customer/v1/auth/login", body)
		b := custDecode(t, rec)
		if rec.Code != nethttp.StatusUnauthorized || b.Error.Code != "INVALID_CREDENTIALS" {
			t.Fatalf("%s = %d %s", body, rec.Code, rec.Body)
		}
		if first == "" {
			first = b.Error.Message
		} else if b.Error.Message != first {
			t.Fatalf("pesan beda: %q vs %q", b.Error.Message, first)
		}
	}
}

func TestCustomerLoginIsRateLimited(t *testing.T) {
	env := newCustEnv(t)
	for i := 0; i < 10; i++ {
		custDo(env.h, "POST", "/customer/v1/auth/login", `{}`)
	}
	if rec := custDo(env.h, "POST", "/customer/v1/auth/login", `{}`); rec.Code != nethttp.StatusTooManyRequests {
		t.Fatalf("percobaan ke-11 = %d, mau 429", rec.Code)
	}
}

func TestCustomerCookieRejectsInternalToken(t *testing.T) {
	env := newCustEnv(t)
	internal, err := env.tokens.Issue(user.Session{UserID: uuid.New(), Role: user.RoleAdmin})
	if err != nil {
		t.Fatal(err)
	}
	cookie := &nethttp.Cookie{Name: middleware.CustomerSessionCookie, Value: internal}
	if rec := custDo(env.h, "GET", "/customer/v1/me", "", cookie); rec.Code != nethttp.StatusUnauthorized {
		t.Fatalf("token internal di cookie pembeli = %d, mau 401", rec.Code)
	}
	// Cookie internal yang asli juga tidak dianggap sesi pembeli.
	cookie = &nethttp.Cookie{Name: middleware.SessionCookie, Value: internal}
	if rec := custDo(env.h, "GET", "/customer/v1/me", "", cookie); rec.Code != nethttp.StatusUnauthorized {
		t.Fatalf("cookie internal = %d, mau 401", rec.Code)
	}
}

func TestInternalSessionRejectsCustomerToken(t *testing.T) {
	env := newCustEnv(t)
	token, err := env.tokens.IssueCustomer(uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	ok := nethttp.HandlerFunc(func(w nethttp.ResponseWriter, _ *nethttp.Request) { w.WriteHeader(200) })
	h := middleware.NewSessions(env.tokens, false).Require(ok)
	rec := custDo(h, "GET", "/operational/v1/auth/me", "", &nethttp.Cookie{Name: middleware.SessionCookie, Value: token})
	if rec.Code != nethttp.StatusUnauthorized {
		t.Fatalf("token pembeli di antay_session = %d, mau 401", rec.Code)
	}
}

func TestCustomerWritesNeedCSRF(t *testing.T) {
	env := newCustEnv(t)
	req := httptest.NewRequest("POST", "/customer/v1/auth/register", strings.NewReader(custRegisterBody))
	rec := httptest.NewRecorder()
	env.h.ServeHTTP(rec, req)
	if rec.Code != nethttp.StatusForbidden {
		t.Fatalf("tanpa CSRF = %d, mau 403", rec.Code)
	}
}
