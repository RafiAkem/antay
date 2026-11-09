package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

type UserRepo struct {
	q *store.Queries
}

func NewUserRepo(q *store.Queries) *UserRepo { return &UserRepo{q: q} }

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (user.User, error) {
	return oneUser(r.q.GetUserByEmail(ctx, email))
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (user.User, error) {
	return oneUser(r.q.GetUserByID(ctx, id))
}

func oneUser(row store.User, err error) (user.User, error) {
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return user.User{}, user.ErrNotFound
		}
		return user.User{}, err
	}
	return user.User{
		ID:           row.ID,
		Email:        row.Email,
		PasswordHash: row.PasswordHash,
		Name:         row.Name,
		Role:         row.Role,
	}, nil
}
