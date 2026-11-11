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

	"github.com/RafiAkem/antay/backend/internal/application/storefront"
	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// shopRepo: satu event, satu kategori tanpa kursi, satu paket. Cukup untuk
// memastikan rute, CSRF, sesi, dan bentuk JSON; logika rinci dites di storefront.
type shopRepo struct {
	ev  event.Event
	cat category.Category
	pkg category.Package
}

func (r shopRepo) ListPublishedFrom(context.Context, string) ([]event.Event, error) {
	return []event.Event{r.ev}, nil
}

func (r shopRepo) GetPublished(_ context.Context, id uuid.UUID) (event.Event, error) {
	if id != r.ev.ID {
		return event.Event{}, event.ErrNotFound
	}
	return r.ev, nil
}

func (r shopRepo) Categories(context.Context, []uuid.UUID) ([]category.Category, error) {
	return []category.Category{r.cat}, nil
}

func (r shopRepo) ActivePackages(context.Context, []uuid.UUID) ([]category.Package, error) {
	return []category.Package{r.pkg}, nil
}

func (shopRepo) AvailableSeats(context.Context, []uuid.UUID) (map[uuid.UUID]int32, error) {
	return map[uuid.UUID]int32{}, nil
}

func (shopRepo) Gallery(context.Context, uuid.UUID) ([]storefront.Image, error) {
	return []storefront.Image{{FileName: "galeri-1.jpg", Width: 1200, Height: 800, Alt: "Panggung"}}, nil
}

func (shopRepo) SlotBookings(context.Context, []uuid.UUID) ([]event.SlotBooking, error) {
	return nil, nil
}

func newShop(t *testing.T) (nethttp.Handler, shopRepo) {
	t.Helper()
	ends := time.Date(2026, 12, 31, 18, 0, 0, 0, shared.Jakarta)
	repo := shopRepo{
		ev: event.Event{
			ID: uuid.New(), CodePrefix: "NY", Name: "Malam Tahun Baru", Date: "2026-12-31",
			Status: event.StatusPublished, OpenMinutes: 1080, CloseMinutes: 1410,
			SlotMinutes: 30, SlotCapacity: 100, CounterCount: 4, ServiceSeconds: 60,
			FeeBearer: event.FeeBearerCustomer, FeePercentBP: 200, SaleEndsAt: &ends,
			PosterURL: "/media/poster.jpg",
		},
	}
	repo.cat = category.Category{ID: uuid.New(), EventID: repo.ev.ID, Name: "Festival", Quota: new(int32(600))}
	repo.pkg = category.Package{ID: uuid.New(), CategoryID: repo.cat.ID, Name: "Couple", Pax: 2, Price: 450000, IsActive: true}

	clock := shared.Clock(func() time.Time { return time.Date(2026, 11, 11, 10, 0, 0, 0, shared.Jakarta) })
	h := handler.NewStorefront(storefront.New(repo, clock))
	requireCustomer := func(next nethttp.Handler) nethttp.Handler {
		return nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
			if r.Header.Get("X-Test-Customer") == "" {
				response.Unauthorized(w, r, "Silakan masuk dulu.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
	mux := nethttp.NewServeMux()
	registerStorefrontPublic(mux, h)
	registerStorefrontCustomer(mux, h, requireCustomer, nil)
	return middleware.CSRF(mux), repo
}

func postQuote(api nethttp.Handler, body string, signedIn bool) *httptest.ResponseRecorder {
	req := httptest.NewRequest(nethttp.MethodPost, "/customer/v1/orders/quote", strings.NewReader(body))
	req.AddCookie(&nethttp.Cookie{Name: middleware.CSRFCookie, Value: "t"})
	req.Header.Set(middleware.CSRFHeader, "t")
	if signedIn {
		req.Header.Set("X-Test-Customer", "1")
	}
	rec := httptest.NewRecorder()
	api.ServeHTTP(rec, req)
	return rec
}

func TestStorefrontListAndDetailShape(t *testing.T) {
	api, repo := newShop(t)
	rec := httptest.NewRecorder()
	api.ServeHTTP(rec, httptest.NewRequest(nethttp.MethodGet, "/public/v1/events/"+repo.ev.ID.String(), nil))
	if rec.Code != nethttp.StatusOK {
		t.Fatalf("detail = %d: %s", rec.Code, rec.Body)
	}
	var body struct {
		Data struct {
			Event map[string]any `json:"event"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	ev := body.Data.Event
	for _, key := range []string{"slots", "leftTotal", "codePrefix", "description", "posterUrl",
		"saleStartsAt", "saleEndsAt", "onSale", "priceFrom", "left", "categories", "gallery"} {
		if _, ok := ev[key]; !ok {
			t.Fatalf("field %s tidak ada di detail event", key)
		}
	}
	if ev["saleStartsAt"] != nil || ev["saleEndsAt"] != "2026-12-31T18:00:00+07:00" {
		t.Fatalf("jendela jual = %v sampai %v", ev["saleStartsAt"], ev["saleEndsAt"])
	}
	if ev["priceFrom"] != float64(450000) || ev["left"] != float64(600) {
		t.Fatalf("priceFrom=%v left=%v", ev["priceFrom"], ev["left"])
	}
	cat := ev["categories"].([]any)[0].(map[string]any)
	pkg := cat["packages"].([]any)[0].(map[string]any)
	if pkg["pricePerPax"] != float64(225000) || pkg["left"] != nil || cat["soldOut"] != false {
		t.Fatalf("kategori = %v", cat)
	}
	img := ev["gallery"].([]any)[0].(map[string]any)
	if img["url"] != "/media/galeri-1.jpg" {
		t.Fatalf("url galeri = %v", img["url"])
	}

	rec = httptest.NewRecorder()
	api.ServeHTTP(rec, httptest.NewRequest(nethttp.MethodGet, "/public/v1/events/bukan-uuid", nil))
	if rec.Code != nethttp.StatusNotFound {
		t.Fatalf("id rusak = %d, mau 404", rec.Code)
	}
}

func TestStorefrontQuoteGuards(t *testing.T) {
	api, repo := newShop(t)
	body := `{"eventId":"` + repo.ev.ID.String() + `","items":[{"packageId":"` + repo.pkg.ID.String() + `","quantity":2}]}`

	req := httptest.NewRequest(nethttp.MethodPost, "/customer/v1/orders/quote", strings.NewReader(body))
	rec := httptest.NewRecorder()
	api.ServeHTTP(rec, req)
	if rec.Code != nethttp.StatusForbidden {
		t.Fatalf("tanpa CSRF = %d, mau 403", rec.Code)
	}
	if rec := postQuote(api, body, false); rec.Code != nethttp.StatusUnauthorized {
		t.Fatalf("tanpa sesi = %d, mau 401", rec.Code)
	}

	rec = postQuote(api, body, true)
	if rec.Code != nethttp.StatusOK {
		t.Fatalf("quote = %d: %s", rec.Code, rec.Body)
	}
	var ok struct {
		Data struct {
			Quote map[string]any `json:"quote"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ok); err != nil {
		t.Fatal(err)
	}
	q := ok.Data.Quote
	// 2 x 450.000 = 900.000, biaya 2% = 18.000
	if q["subtotal"] != float64(900000) || q["fee"] != float64(18000) || q["total"] != float64(918000) || q["totalPax"] != float64(4) {
		t.Fatalf("quote = %v", q)
	}
	if q["promoRejection"] != nil || len(q["appliedDiscounts"].([]any)) != 0 {
		t.Fatalf("promo = %v / %v", q["promoRejection"], q["appliedDiscounts"])
	}
}

func TestStorefrontQuoteErrorCodes(t *testing.T) {
	api, repo := newShop(t)
	ev, pkg := repo.ev.ID.String(), repo.pkg.ID.String()
	tests := []struct {
		name, body, code, field string
		status                  int
	}{
		{"kosong", `{"eventId":"` + ev + `","items":[]}`, "VALIDATION", "items", 400},
		{"id paket rusak", `{"eventId":"` + ev + `","items":[{"packageId":"x","quantity":1}]}`, "VALIDATION", "items[0].packageId", 400},
		{"event asing", `{"eventId":"` + uuid.NewString() + `","items":[{"packageId":"` + pkg + `","quantity":1}]}`, "NOT_FOUND", "", 404},
		{"lewat batas", `{"eventId":"` + ev + `","items":[{"packageId":"` + pkg + `","quantity":6}]}`, "PAX_LIMIT", "items", 422},
		{"paket asing", `{"eventId":"` + ev + `","items":[{"packageId":"` + uuid.NewString() + `","quantity":1}]}`, "PACKAGE_UNAVAILABLE", "items[0].packageId", 422},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := postQuote(api, tc.body, true)
			var body struct {
				Error struct {
					Code    string                 `json:"code"`
					Details []response.ErrorDetail `json:"details"`
				} `json:"error"`
			}
			_ = json.Unmarshal(rec.Body.Bytes(), &body)
			if rec.Code != tc.status || body.Error.Code != tc.code {
				t.Fatalf("status=%d code=%s, mau %d %s", rec.Code, body.Error.Code, tc.status, tc.code)
			}
			if tc.field != "" && (len(body.Error.Details) == 0 || body.Error.Details[0].Field != tc.field) {
				t.Fatalf("details = %+v, mau field %s", body.Error.Details, tc.field)
			}
		})
	}
}
