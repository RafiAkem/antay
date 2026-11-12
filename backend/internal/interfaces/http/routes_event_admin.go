package http

import (
	nethttp "net/http"

	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
)

// registerEventAdmin: kelola event versi 2. Prefix /manage/ dipakai supaya
// tidak bentrok dengan GET /operational/v1/events milik loket.
//
// requireManager = sesi + RequireRole(organizer), yang otomatis meloloskan
// admin. requireAdmin = sesi + RequireRole(admin). Batas "event milik
// organizer ini" dijaga di query dan dijawab 404.
func registerEventAdmin(mux *nethttp.ServeMux, h *handler.EventAdmin, requireManager, requireAdmin func(nethttp.Handler) nethttp.Handler) {
	manager := func(fn nethttp.HandlerFunc) nethttp.Handler { return requireManager(fn) }
	admin := func(fn nethttp.HandlerFunc) nethttp.Handler { return requireAdmin(fn) }
	const base = "/operational/v1/manage"

	mux.Handle("GET "+base+"/events", manager(h.ListEvents))
	mux.Handle("POST "+base+"/events", manager(h.CreateEvent))
	mux.Handle("GET "+base+"/events/{eventId}", manager(h.GetEvent))
	mux.Handle("PATCH "+base+"/events/{eventId}", manager(h.UpdateEvent))
	mux.Handle("DELETE "+base+"/events/{eventId}", manager(h.DeleteEvent))

	mux.Handle("GET "+base+"/events/{eventId}/categories", manager(h.ListCategories))
	mux.Handle("POST "+base+"/events/{eventId}/categories", manager(h.CreateCategory))
	mux.Handle("PATCH "+base+"/categories/{categoryId}", manager(h.UpdateCategory))
	mux.Handle("DELETE "+base+"/categories/{categoryId}", manager(h.DeleteCategory))

	mux.Handle("GET "+base+"/categories/{categoryId}/packages", manager(h.ListPackages))
	mux.Handle("POST "+base+"/categories/{categoryId}/packages", manager(h.CreatePackage))
	mux.Handle("PATCH "+base+"/packages/{packageId}", manager(h.UpdatePackage))
	mux.Handle("DELETE "+base+"/packages/{packageId}", manager(h.DeletePackage))

	mux.Handle("POST "+base+"/events/{eventId}/submissions", manager(h.Submit))
	mux.Handle("POST "+base+"/events/{eventId}/approvals", admin(h.Approve))
	mux.Handle("POST "+base+"/events/{eventId}/rejections", admin(h.Reject))
	mux.Handle("POST "+base+"/events/{eventId}/cancellations", admin(h.Cancel))
	mux.Handle("POST "+base+"/events/{eventId}/closures", admin(h.Close))
}
