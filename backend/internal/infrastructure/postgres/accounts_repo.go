package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/RafiAkem/antay/backend/internal/application/accounts"
	"github.com/RafiAkem/antay/backend/internal/domain/organizer"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

const (
	accountsFKViolation  = "23503"
	accountsUserEmailKey = "users_email_key"
)

// AccountsRepo dipakai panel admin; query login tetap di UserRepo karena
// hanya boleh melihat akun aktif.
type AccountsRepo struct {
	q *store.Queries
}

func NewAccountsRepo(q *store.Queries) *AccountsRepo { return &AccountsRepo{q: q} }

func (r *AccountsRepo) ListOrganizers(ctx context.Context) ([]organizer.Organizer, error) {
	rows, err := r.q.AdminListOrganizers(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]organizer.Organizer, 0, len(rows))
	for _, row := range rows {
		out = append(out, adminOrganizerOf(row))
	}
	return out, nil
}

func (r *AccountsRepo) GetOrganizer(ctx context.Context, id uuid.UUID) (organizer.Organizer, error) {
	return adminOneOrganizer(r.q.AdminGetOrganizer(ctx, id))
}

func (r *AccountsRepo) CreateOrganizer(ctx context.Context, d organizer.Draft) (organizer.Organizer, error) {
	return adminOneOrganizer(r.q.AdminCreateOrganizer(ctx, store.AdminCreateOrganizerParams{
		Name: d.Name, ContactEmail: d.ContactEmail, ContactPhone: d.ContactPhone,
	}))
}

func (r *AccountsRepo) UpdateOrganizer(ctx context.Context, id uuid.UUID, p organizer.Patch) (organizer.Organizer, error) {
	return adminOneOrganizer(r.q.AdminUpdateOrganizer(ctx, store.AdminUpdateOrganizerParams{
		Name: p.Name, ContactEmail: p.ContactEmail, ContactPhone: p.ContactPhone, IsActive: p.IsActive, ID: id,
	}))
}

func (r *AccountsRepo) ListUsers(ctx context.Context) ([]accounts.User, error) {
	rows, err := r.q.AdminListUsers(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]accounts.User, 0, len(rows))
	for _, row := range rows {
		out = append(out, adminUserOf(row))
	}
	return out, nil
}

func (r *AccountsRepo) CreateUser(ctx context.Context, rec accounts.NewUserRecord) (accounts.User, error) {
	var orgID pgtype.UUID
	if rec.OrganizerID != nil {
		orgID = pgtype.UUID{Bytes: *rec.OrganizerID, Valid: true}
	}
	row, err := r.q.AdminCreateUser(ctx, store.AdminCreateUserParams{
		Email: rec.Email, PasswordHash: rec.PasswordHash, Name: rec.Name, Role: rec.Role, OrganizerID: orgID,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		switch {
		case uniqueViolationOn(err, accountsUserEmailKey):
			return accounts.User{}, accounts.ErrEmailTaken
		case errors.As(err, &pgErr) && pgErr.Code == accountsFKViolation:
			return accounts.User{}, accounts.ErrOrganizerInvalid
		}
		return accounts.User{}, err
	}
	return adminUserOf(row), nil
}

func (r *AccountsRepo) UpdateUser(ctx context.Context, id uuid.UUID, c accounts.UserChanges) (accounts.User, error) {
	row, err := r.q.AdminUpdateUser(ctx, store.AdminUpdateUserParams{
		Name: c.Name, IsActive: c.IsActive, PasswordHash: c.PasswordHash, ID: id,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return accounts.User{}, accounts.ErrUserNotFound
		}
		return accounts.User{}, err
	}
	return adminUserOf(row), nil
}

func adminOneOrganizer(row store.Organizer, err error) (organizer.Organizer, error) {
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return organizer.Organizer{}, organizer.ErrNotFound
		}
		return organizer.Organizer{}, err
	}
	return adminOrganizerOf(row), nil
}

func adminOrganizerOf(row store.Organizer) organizer.Organizer {
	return organizer.Organizer{
		ID:           row.ID,
		Name:         row.Name,
		ContactEmail: row.ContactEmail,
		ContactPhone: row.ContactPhone,
		IsActive:     row.IsActive,
		CreatedAt:    row.CreatedAt.Time,
	}
}

func adminUserOf(row store.User) accounts.User {
	return accounts.User{
		ID:          row.ID,
		Email:       row.Email,
		Name:        row.Name,
		Role:        row.Role,
		OrganizerID: uuidPtr(row.OrganizerID),
		IsActive:    row.IsActive,
		CreatedAt:   row.CreatedAt.Time,
	}
}
