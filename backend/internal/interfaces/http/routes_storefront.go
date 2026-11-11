package http

import (
	nethttp "net/http"

	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
)

// registerStorefrontPublic memasang katalog versi 2. Rute ini menggantikan
// GET /public/v1/events dan GET /public/v1/events/{eventId} versi 1, jadi
// keduanya jangan didaftarkan bersamaan (ServeMux panik kalau pola kembar).
func registerStorefrontPublic(mux *nethttp.ServeMux, h *handler.Storefront) {
	mux.HandleFunc("GET /public/v1/events", h.ListEvents)
	mux.HandleFunc("GET /public/v1/events/{eventId}", h.GetEvent)
}

// registerStorefrontCustomer memasang quote. requireCustomer wajib berupa
// middleware sesi pembeli. limit boleh nil; kalau diisi, dipakai membatasi
// percobaan kode promo per IP (PRD bagian 6).
func registerStorefrontCustomer(
	mux *nethttp.ServeMux,
	h *handler.Storefront,
	requireCustomer func(nethttp.Handler) nethttp.Handler,
	limit func(nethttp.Handler) nethttp.Handler,
) {
	var quote nethttp.Handler = nethttp.HandlerFunc(h.Quote)
	quote = requireCustomer(quote)
	if limit != nil {
		// Limit dipasang paling luar supaya request tanpa sesi pun ikut terhitung.
		quote = limit(quote)
	}
	mux.Handle("POST /customer/v1/orders/quote", quote)
}
