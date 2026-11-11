package handler

import (
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

type manageCategoryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	SortOrder   int32  `json:"sortOrder"`
	IsSeated    bool   `json:"isSeated"`
	Quota       *int32 `json:"quota"`
}

type manageCategoryPatchRequest struct {
	Name        *string             `json:"name"`
	Description *string             `json:"description"`
	SortOrder   *int32              `json:"sortOrder"`
	IsSeated    *bool               `json:"isSeated"`
	Quota       dto.Nullable[int32] `json:"quota"`
}

// isActive opsional saat membuat; paket baru defaultnya langsung aktif.
type managePackageRequest struct {
	Name      string `json:"name"`
	Pax       int32  `json:"pax"`
	Price     int64  `json:"price"`
	Quota     *int32 `json:"quota"`
	SortOrder int32  `json:"sortOrder"`
	IsActive  *bool  `json:"isActive"`
}

type managePackagePatchRequest struct {
	Name      *string             `json:"name"`
	Pax       *int32              `json:"pax"`
	Price     *int64              `json:"price"`
	Quota     dto.Nullable[int32] `json:"quota"`
	SortOrder *int32              `json:"sortOrder"`
	IsActive  *bool               `json:"isActive"`
}

func (h *EventAdmin) ListCategories(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "eventId")
	if !ok {
		return
	}
	list, err := h.svc.ListCategories(r.Context(), actor, id)
	if err != nil {
		writeManageErr(w, r, err)
		return
	}
	response.OK(w, r, "Data retrieved", map[string]any{"categories": dto.ManagedCategoriesOf(list)})
}

func (h *EventAdmin) CreateCategory(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "eventId")
	if !ok {
		return
	}
	var req manageCategoryRequest
	if !decodeManage(w, r, &req) {
		return
	}
	c, err := h.svc.CreateCategory(r.Context(), actor, id, category.CategoryInput(req))
	respondCategory(w, r, http.StatusCreated, "Kategori dibuat.", c, err)
}

func (h *EventAdmin) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "categoryId")
	if !ok {
		return
	}
	var req manageCategoryPatchRequest
	if !decodeManage(w, r, &req) {
		return
	}
	c, err := h.svc.UpdateCategory(r.Context(), actor, id, eventadmin.CategoryPatch{
		Name: req.Name, Description: req.Description, SortOrder: req.SortOrder,
		IsSeated: req.IsSeated, Quota: eventadmin.Nullable[int32](req.Quota),
	})
	respondCategory(w, r, http.StatusOK, "Kategori diperbarui.", c, err)
}

func (h *EventAdmin) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "categoryId")
	if !ok {
		return
	}
	if err := h.svc.DeleteCategory(r.Context(), actor, id); err != nil {
		writeManageErr(w, r, err)
		return
	}
	response.OK(w, r, "Kategori dihapus.", map[string]any{"id": id.String()})
}

func (h *EventAdmin) ListPackages(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "categoryId")
	if !ok {
		return
	}
	list, err := h.svc.ListPackages(r.Context(), actor, id)
	if err != nil {
		writeManageErr(w, r, err)
		return
	}
	response.OK(w, r, "Data retrieved", map[string]any{"packages": dto.ManagedPackagesOf(list)})
}

func (h *EventAdmin) CreatePackage(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "categoryId")
	if !ok {
		return
	}
	var req managePackageRequest
	if !decodeManage(w, r, &req) {
		return
	}
	active := req.IsActive == nil || *req.IsActive
	p, err := h.svc.CreatePackage(r.Context(), actor, id, category.PackageInput{
		Name: req.Name, Pax: req.Pax, Price: req.Price, Quota: req.Quota,
		SortOrder: req.SortOrder, IsActive: active,
	})
	respondPackage(w, r, http.StatusCreated, "Paket dibuat.", p, err)
}

func (h *EventAdmin) UpdatePackage(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "packageId")
	if !ok {
		return
	}
	var req managePackagePatchRequest
	if !decodeManage(w, r, &req) {
		return
	}
	p, err := h.svc.UpdatePackage(r.Context(), actor, id, eventadmin.PackagePatch{
		Name: req.Name, Pax: req.Pax, Price: req.Price, Quota: eventadmin.Nullable[int32](req.Quota),
		SortOrder: req.SortOrder, IsActive: req.IsActive,
	})
	respondPackage(w, r, http.StatusOK, "Paket diperbarui.", p, err)
}

func (h *EventAdmin) DeletePackage(w http.ResponseWriter, r *http.Request) {
	actor, id, ok := manageTarget(w, r, "packageId")
	if !ok {
		return
	}
	if err := h.svc.DeletePackage(r.Context(), actor, id); err != nil {
		writeManageErr(w, r, err)
		return
	}
	response.OK(w, r, "Paket dihapus.", map[string]any{"id": id.String()})
}

func decodeManage(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := response.Decode(w, r, dst); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", msgManageBadBody)
		return false
	}
	return true
}

func respondCategory(w http.ResponseWriter, r *http.Request, status int, message string, c eventadmin.ManagedCategory, err error) {
	if err != nil {
		writeManageErr(w, r, err)
		return
	}
	response.JSON(w, r, status, message, map[string]any{"category": dto.ManagedCategoryOf(c)})
}

func respondPackage(w http.ResponseWriter, r *http.Request, status int, message string, p category.Package, err error) {
	if err != nil {
		writeManageErr(w, r, err)
		return
	}
	response.JSON(w, r, status, message, map[string]any{"package": dto.ManagedPackageOf(p)})
}
