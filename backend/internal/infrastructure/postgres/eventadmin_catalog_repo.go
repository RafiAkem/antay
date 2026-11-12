package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/domain/category"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

func manageCategoryOf(c store.TicketCategory) category.Category {
	return category.Category{
		ID:          c.ID,
		EventID:     c.EventID,
		Name:        c.Name,
		Description: c.Description,
		SortOrder:   c.SortOrder,
		IsSeated:    c.IsSeated,
		Quota:       c.Quota,
		CreatedAt:   c.CreatedAt.Time,
		UpdatedAt:   c.UpdatedAt.Time,
	}
}

func managePackageOf(p store.Package) category.Package {
	return category.Package{
		ID:         p.ID,
		CategoryID: p.CategoryID,
		Name:       p.Name,
		Pax:        p.Pax,
		Price:      p.Price,
		Quota:      p.Quota,
		SortOrder:  p.SortOrder,
		IsActive:   p.IsActive,
		CreatedAt:  p.CreatedAt.Time,
		UpdatedAt:  p.UpdatedAt.Time,
	}
}

func managePackagesOf(rows []store.Package) []category.Package {
	out := make([]category.Package, 0, len(rows))
	for _, row := range rows {
		out = append(out, managePackageOf(row))
	}
	return out
}

// manageWriteErr menerjemahkan nol baris dan nama kembar. Nol baris di insert
// berarti induknya tidak ketemu dalam scope, jadi notFound diisi sesuai induk.
func manageWriteErr(err, notFound error) error {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return notFound
	case uniqueViolationOn(err, "ticket_categories_event_name_key"):
		return eventadmin.ErrCategoryNameTaken
	case uniqueViolationOn(err, "packages_category_name_key"):
		return eventadmin.ErrPackageNameTaken
	}
	return err
}

// ListCategories mengambil kategori dan semua paketnya dalam dua query, lalu
// dirakit di sini supaya tidak ada query per kategori.
func (r *EventAdminRepo) ListCategories(ctx context.Context, scope *uuid.UUID, eventID uuid.UUID) ([]eventadmin.ManagedCategory, error) {
	rows, err := r.q.ManageListCategories(ctx, store.ManageListCategoriesParams{EventID: eventID, OrganizerID: manageScope(scope)})
	if err != nil {
		return nil, err
	}
	pkgs, err := r.q.ManageListEventPackages(ctx, store.ManageListEventPackagesParams{EventID: eventID, OrganizerID: manageScope(scope)})
	if err != nil {
		return nil, err
	}
	byCategory := make(map[uuid.UUID][]category.Package, len(rows))
	for _, p := range pkgs {
		byCategory[p.CategoryID] = append(byCategory[p.CategoryID], managePackageOf(p))
	}
	out := make([]eventadmin.ManagedCategory, 0, len(rows))
	for _, row := range rows {
		list := byCategory[row.TicketCategory.ID]
		if list == nil {
			list = []category.Package{}
		}
		out = append(out, eventadmin.ManagedCategory{
			Category:  manageCategoryOf(row.TicketCategory),
			SeatCount: row.SeatCount,
			Packages:  list,
		})
	}
	return out, nil
}

func (r *EventAdminRepo) GetCategory(ctx context.Context, scope *uuid.UUID, id uuid.UUID) (eventadmin.CategoryRecord, error) {
	row, err := r.q.ManageGetCategory(ctx, store.ManageGetCategoryParams{ID: id, OrganizerID: manageScope(scope)})
	if err != nil {
		return eventadmin.CategoryRecord{}, manageWriteErr(err, eventadmin.ErrCategoryNotFound)
	}
	return eventadmin.CategoryRecord{
		Category:    manageCategoryOf(row.TicketCategory),
		EventStatus: row.EventStatus,
		SeatCount:   row.SeatCount,
		BlockCount:  row.BlockCount,
	}, nil
}

func (r *EventAdminRepo) CreateCategory(ctx context.Context, scope *uuid.UUID, eventID uuid.UUID, in category.CategoryInput) (category.Category, error) {
	row, err := r.q.ManageCreateCategory(ctx, store.ManageCreateCategoryParams{
		Name: in.Name, Description: in.Description, SortOrder: in.SortOrder,
		IsSeated: in.IsSeated, Quota: in.Quota,
		EventID: eventID, OrganizerID: manageScope(scope),
	})
	if err != nil {
		return category.Category{}, manageWriteErr(err, event.ErrNotFound)
	}
	return manageCategoryOf(row), nil
}

func (r *EventAdminRepo) UpdateCategory(ctx context.Context, scope *uuid.UUID, id uuid.UUID, in category.CategoryInput) (category.Category, error) {
	row, err := r.q.ManageUpdateCategory(ctx, store.ManageUpdateCategoryParams{
		Name: in.Name, Description: in.Description, SortOrder: in.SortOrder,
		IsSeated: in.IsSeated, Quota: in.Quota,
		ID: id, OrganizerID: manageScope(scope),
	})
	if err != nil {
		return category.Category{}, manageWriteErr(err, eventadmin.ErrCategoryNotFound)
	}
	return manageCategoryOf(row), nil
}

func (r *EventAdminRepo) DeleteCategory(ctx context.Context, scope *uuid.UUID, id uuid.UUID) error {
	n, err := r.q.ManageDeleteCategory(ctx, store.ManageDeleteCategoryParams{ID: id, OrganizerID: manageScope(scope)})
	if err != nil {
		return err
	}
	if n == 0 {
		return eventadmin.ErrCategoryNotFound
	}
	return nil
}

func (r *EventAdminRepo) ListPackages(ctx context.Context, scope *uuid.UUID, categoryID uuid.UUID) ([]category.Package, error) {
	rows, err := r.q.ManageListPackages(ctx, store.ManageListPackagesParams{CategoryID: categoryID, OrganizerID: manageScope(scope)})
	if err != nil {
		return nil, err
	}
	return managePackagesOf(rows), nil
}

func (r *EventAdminRepo) GetPackage(ctx context.Context, scope *uuid.UUID, id uuid.UUID) (eventadmin.PackageRecord, error) {
	row, err := r.q.ManageGetPackage(ctx, store.ManageGetPackageParams{ID: id, OrganizerID: manageScope(scope)})
	if err != nil {
		return eventadmin.PackageRecord{}, manageWriteErr(err, eventadmin.ErrPackageNotFound)
	}
	return eventadmin.PackageRecord{Package: managePackageOf(row.Package), EventStatus: row.EventStatus}, nil
}

func (r *EventAdminRepo) CreatePackage(ctx context.Context, scope *uuid.UUID, categoryID uuid.UUID, in category.PackageInput) (category.Package, error) {
	row, err := r.q.ManageCreatePackage(ctx, store.ManageCreatePackageParams{
		Name: in.Name, Pax: in.Pax, Price: in.Price, Quota: in.Quota,
		SortOrder: in.SortOrder, IsActive: in.IsActive,
		CategoryID: categoryID, OrganizerID: manageScope(scope),
	})
	if err != nil {
		return category.Package{}, manageWriteErr(err, eventadmin.ErrCategoryNotFound)
	}
	return managePackageOf(row), nil
}

func (r *EventAdminRepo) UpdatePackage(ctx context.Context, scope *uuid.UUID, id uuid.UUID, in category.PackageInput) (category.Package, error) {
	row, err := r.q.ManageUpdatePackage(ctx, store.ManageUpdatePackageParams{
		Name: in.Name, Pax: in.Pax, Price: in.Price, Quota: in.Quota,
		SortOrder: in.SortOrder, IsActive: in.IsActive,
		ID: id, OrganizerID: manageScope(scope),
	})
	if err != nil {
		return category.Package{}, manageWriteErr(err, eventadmin.ErrPackageNotFound)
	}
	return managePackageOf(row), nil
}

func (r *EventAdminRepo) DeletePackage(ctx context.Context, scope *uuid.UUID, id uuid.UUID) error {
	n, err := r.q.ManageDeletePackage(ctx, store.ManageDeletePackageParams{ID: id, OrganizerID: manageScope(scope)})
	if err != nil {
		return err
	}
	if n == 0 {
		return eventadmin.ErrPackageNotFound
	}
	return nil
}
