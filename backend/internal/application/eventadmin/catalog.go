package eventadmin

import (
	"context"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/category"
)

type CategoryPatch struct {
	Name, Description *string
	SortOrder         *int32
	IsSeated          *bool
	Quota             Nullable[int32]
}

type PackagePatch struct {
	Name      *string
	Pax       *int32
	Price     *int64
	Quota     Nullable[int32]
	SortOrder *int32
	IsActive  *bool
}

func (s *Service) ListCategories(ctx context.Context, actor Actor, eventID uuid.UUID) ([]ManagedCategory, error) {
	if _, err := s.repo.GetEvent(ctx, actor.Scope(), eventID); err != nil {
		return nil, err
	}
	return s.repo.ListCategories(ctx, actor.Scope(), eventID)
}

func (s *Service) CreateCategory(ctx context.Context, actor Actor, eventID uuid.UUID, in category.CategoryInput) (ManagedCategory, error) {
	ev, err := s.repo.GetEvent(ctx, actor.Scope(), eventID)
	if err != nil {
		return ManagedCategory{}, err
	}
	if !editable(ev.Status) {
		return ManagedCategory{}, NotEditableError{}
	}
	clean, issues := in.Validate()
	if len(issues) > 0 {
		return ManagedCategory{}, fieldError(issues)
	}
	c, err := s.repo.CreateCategory(ctx, actor.Scope(), eventID, clean)
	if err != nil {
		return ManagedCategory{}, err
	}
	return ManagedCategory{Category: c, Packages: []category.Package{}}, nil
}

func (s *Service) UpdateCategory(ctx context.Context, actor Actor, id uuid.UUID, p CategoryPatch) (ManagedCategory, error) {
	rec, err := s.repo.GetCategory(ctx, actor.Scope(), id)
	if err != nil {
		return ManagedCategory{}, err
	}
	if !editable(rec.EventStatus) {
		return ManagedCategory{}, NotEditableError{}
	}
	in := category.CategoryInput{
		Name: rec.Name, Description: rec.Description, SortOrder: rec.SortOrder,
		IsSeated: rec.IsSeated, Quota: p.Quota.or(rec.Quota),
	}
	if p.Name != nil {
		in.Name = *p.Name
	}
	if p.Description != nil {
		in.Description = *p.Description
	}
	if p.SortOrder != nil {
		in.SortOrder = *p.SortOrder
	}
	if p.IsSeated != nil && *p.IsSeated != rec.IsSeated {
		// Blok kursi menempel ke kategori; mengubah jenisnya akan membuat
		// denah dan kuota saling bertentangan.
		if rec.BlockCount > 0 {
			return ManagedCategory{}, ErrCategoryHasSeats
		}
		in.IsSeated = *p.IsSeated
		// Pindah ke berkursi otomatis membuang kuota lama supaya frontend
		// tidak perlu mengirim quota:null secara eksplisit.
		if in.IsSeated && !p.Quota.Set {
			in.Quota = nil
		}
	}
	clean, issues := in.Validate()
	if len(issues) > 0 {
		return ManagedCategory{}, fieldError(issues)
	}
	if err := s.guardQuota(ctx, id, rec.Quota, clean.Quota); err != nil {
		return ManagedCategory{}, err
	}
	c, err := s.repo.UpdateCategory(ctx, actor.Scope(), id, clean)
	if err != nil {
		return ManagedCategory{}, err
	}
	pkgs, err := s.repo.ListPackages(ctx, actor.Scope(), id)
	if err != nil {
		return ManagedCategory{}, err
	}
	return ManagedCategory{Category: c, SeatCount: rec.SeatCount, Packages: emptyPackages(pkgs)}, nil
}

func (s *Service) DeleteCategory(ctx context.Context, actor Actor, id uuid.UUID) error {
	rec, err := s.repo.GetCategory(ctx, actor.Scope(), id)
	if err != nil {
		return err
	}
	if !editable(rec.EventStatus) {
		return NotEditableError{}
	}
	if rec.BlockCount > 0 {
		return ErrCategoryHasSeats
	}
	if sold, err := s.soldCount(ctx, id); err != nil || sold > 0 {
		return firstErr(err, ErrSold)
	}
	return s.repo.DeleteCategory(ctx, actor.Scope(), id)
}

func (s *Service) ListPackages(ctx context.Context, actor Actor, categoryID uuid.UUID) ([]category.Package, error) {
	if _, err := s.repo.GetCategory(ctx, actor.Scope(), categoryID); err != nil {
		return nil, err
	}
	pkgs, err := s.repo.ListPackages(ctx, actor.Scope(), categoryID)
	return emptyPackages(pkgs), err
}

func (s *Service) CreatePackage(ctx context.Context, actor Actor, categoryID uuid.UUID, in category.PackageInput) (category.Package, error) {
	rec, err := s.repo.GetCategory(ctx, actor.Scope(), categoryID)
	if err != nil {
		return category.Package{}, err
	}
	if !editable(rec.EventStatus) {
		return category.Package{}, NotEditableError{}
	}
	clean, issues := in.Validate()
	if len(issues) > 0 {
		return category.Package{}, fieldError(issues)
	}
	return s.repo.CreatePackage(ctx, actor.Scope(), categoryID, clean)
}

func (s *Service) UpdatePackage(ctx context.Context, actor Actor, id uuid.UUID, p PackagePatch) (category.Package, error) {
	rec, err := s.repo.GetPackage(ctx, actor.Scope(), id)
	if err != nil {
		return category.Package{}, err
	}
	if !editable(rec.EventStatus) {
		return category.Package{}, NotEditableError{}
	}
	in := category.PackageInput{
		Name: rec.Name, Pax: rec.Pax, Price: rec.Price, Quota: p.Quota.or(rec.Quota),
		SortOrder: rec.SortOrder, IsActive: rec.IsActive,
	}
	if p.Name != nil {
		in.Name = *p.Name
	}
	if p.Pax != nil {
		in.Pax = *p.Pax
	}
	if p.Price != nil {
		in.Price = *p.Price
	}
	if p.SortOrder != nil {
		in.SortOrder = *p.SortOrder
	}
	if p.IsActive != nil {
		in.IsActive = *p.IsActive
	}
	clean, issues := in.Validate()
	if len(issues) > 0 {
		return category.Package{}, fieldError(issues)
	}
	// Harga dan jumlah orang dipaku begitu ada yang terjual (PRD 5.2).
	sold, err := s.soldCount(ctx, id)
	if err != nil {
		return category.Package{}, err
	}
	if sold > 0 && (clean.Price != rec.Price || clean.Pax != rec.Pax) {
		return category.Package{}, ErrSold
	}
	if err := s.guardQuota(ctx, id, rec.Quota, clean.Quota); err != nil {
		return category.Package{}, err
	}
	return s.repo.UpdatePackage(ctx, actor.Scope(), id, clean)
}

func (s *Service) DeletePackage(ctx context.Context, actor Actor, id uuid.UUID) error {
	rec, err := s.repo.GetPackage(ctx, actor.Scope(), id)
	if err != nil {
		return err
	}
	if !editable(rec.EventStatus) {
		return NotEditableError{}
	}
	if sold, err := s.soldCount(ctx, id); err != nil || sold > 0 {
		return firstErr(err, ErrSold)
	}
	return s.repo.DeletePackage(ctx, actor.Scope(), id)
}

// guardQuota: kuota boleh naik kapan saja, tapi tidak boleh turun di bawah yang
// sudah terjual. Kuota kosong artinya tanpa batas, jadi selalu aman.
func (s *Service) guardQuota(ctx context.Context, id uuid.UUID, before, after *int32) error {
	if after == nil || (before != nil && *after >= *before) {
		return nil
	}
	sold, err := s.soldCount(ctx, id)
	if err != nil {
		return err
	}
	if *after < sold {
		return ErrSold
	}
	return nil
}

func firstErr(err, fallback error) error {
	if err != nil {
		return err
	}
	return fallback
}
