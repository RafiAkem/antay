package handler

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/storefront"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// Storefront melayani katalog publik versi 2 dan quote untuk pembeli yang login.
type Storefront struct {
	svc *storefront.Service
}

func NewStorefront(svc *storefront.Service) *Storefront { return &Storefront{svc: svc} }

func (h *Storefront) internal(w http.ResponseWriter, r *http.Request, action string, err error) {
	slog.Error("storefront: "+action, "traceId", response.TraceID(r), "error", err)
	response.Internal(w, r)
}

func (h *Storefront) ListEvents(w http.ResponseWriter, r *http.Request) {
	views, err := h.svc.ListEvents(r.Context())
	if err != nil {
		h.internal(w, r, "daftar event", err)
		return
	}
	response.OK(w, r, "Data retrieved", map[string]any{"events": dto.CatalogEventsOf(views)})
}

func (h *Storefront) GetEvent(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("eventId"))
	if err != nil {
		response.NotFound(w, r, msgEventNotFound)
		return
	}
	detail, err := h.svc.GetEvent(r.Context(), id)
	if err != nil {
		if errors.Is(err, event.ErrNotFound) {
			response.NotFound(w, r, msgEventNotFound)
			return
		}
		h.internal(w, r, "detail event", err)
		return
	}
	response.OK(w, r, "Data retrieved", map[string]any{"event": dto.CatalogEventDetailOf(detail)})
}

type quoteItemRequest struct {
	PackageID string `json:"packageId"`
	Quantity  int32  `json:"quantity"`
}

type quoteRequest struct {
	EventID   string             `json:"eventId"`
	Items     []quoteItemRequest `json:"items"`
	PromoCode *string            `json:"promoCode"`
}

func (h *Storefront) Quote(w http.ResponseWriter, r *http.Request) {
	var body quoteRequest
	if err := response.Decode(w, r, &body); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}
	if body.EventID == "" {
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Event wajib diisi.",
			[]response.ErrorDetail{{Field: "eventId", Issue: "Wajib diisi."}})
		return
	}
	eventID, err := uuid.Parse(body.EventID)
	if err != nil {
		response.NotFound(w, r, msgEventNotFound)
		return
	}
	req := storefront.QuoteRequest{EventID: eventID, Items: make([]storefront.QuoteItem, 0, len(body.Items))}
	// Kosong kalau rute dipasang tanpa RequireCustomer (misal di tes); quote
	// tetap bisa dihitung karena diskon per pembeli belum ada.
	req.CustomerID, _ = middleware.CustomerFrom(r.Context())
	if body.PromoCode != nil {
		req.PromoCode = *body.PromoCode
	}
	var bad []response.ErrorDetail
	for i, it := range body.Items {
		id, err := uuid.Parse(it.PackageID)
		if err != nil {
			bad = append(bad, response.ErrorDetail{Field: fmt.Sprintf("items[%d].packageId", i), Issue: "Id paket tidak valid."})
			continue
		}
		req.Items = append(req.Items, storefront.QuoteItem{PackageID: id, Quantity: it.Quantity})
	}
	if len(bad) > 0 {
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Isi pesanan tidak valid.", bad)
		return
	}

	q, err := h.svc.Quote(r.Context(), req)
	if err != nil {
		h.quoteError(w, r, err)
		return
	}
	response.OK(w, r, "Harga dihitung.", map[string]any{"quote": dto.QuoteOf(q)})
}

// quoteFailures memetakan error service ke status, kode, dan kalimat untuk pembeli.
var quoteFailures = []struct {
	err     error
	status  int
	code    string
	message string
}{
	{storefront.ErrInvalidItems, http.StatusBadRequest, "VALIDATION", "Isi pesanan tidak valid."},
	{storefront.ErrSaleNotOpen, http.StatusUnprocessableEntity, "SALE_NOT_OPEN", "Penjualan tiket event ini belum dibuka."},
	{storefront.ErrSaleEnded, http.StatusUnprocessableEntity, "SALE_ENDED", "Penjualan tiket event ini sudah berakhir."},
	{storefront.ErrPaxLimit, http.StatusUnprocessableEntity, "PAX_LIMIT", fmt.Sprintf("Satu pesanan maksimal %d orang.", storefront.MaxPax)},
	{storefront.ErrPackageUnavailable, http.StatusUnprocessableEntity, "PACKAGE_UNAVAILABLE", "Ada paket yang sudah tidak tersedia. Muat ulang halaman lalu pilih lagi."},
	{storefront.ErrMixedCategory, http.StatusUnprocessableEntity, "MIXED_CATEGORY", "Satu pesanan hanya boleh berisi paket dari satu kategori."},
	{storefront.ErrQuotaExceeded, http.StatusUnprocessableEntity, "QUOTA_EXCEEDED", "Sisa kuota tidak cukup untuk pilihan ini."},
}

func (h *Storefront) quoteError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, event.ErrNotFound) {
		response.NotFound(w, r, msgEventNotFound)
		return
	}
	var details []response.ErrorDetail
	var rej *storefront.Rejection
	if errors.As(err, &rej) {
		for _, i := range rej.Issues {
			details = append(details, response.ErrorDetail{Field: i.Field, Issue: i.Issue})
		}
	}
	for _, f := range quoteFailures {
		if errors.Is(err, f.err) {
			response.FailDetails(w, r, f.status, f.code, f.message, details)
			return
		}
	}
	h.internal(w, r, "menghitung harga", err)
}
