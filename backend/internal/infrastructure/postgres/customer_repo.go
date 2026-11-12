package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/RafiAkem/antay/backend/internal/domain/customer"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

const customerAccountEmailKey = "customers_email_key"

type CustomerRepo struct {
	q *store.Queries
}

func NewCustomerRepo(q *store.Queries) *CustomerRepo { return &CustomerRepo{q: q} }

func (r *CustomerRepo) Create(ctx context.Context, a customer.NewAccount) (customer.Customer, error) {
	row, err := r.q.RegisterCustomer(ctx, store.RegisterCustomerParams{
		Email: a.Email, PasswordHash: a.PasswordHash, Name: a.Name, Phone: a.Phone,
	})
	if err != nil {
		if uniqueViolationOn(err, customerAccountEmailKey) {
			return customer.Customer{}, customer.ErrEmailTaken
		}
		return customer.Customer{}, err
	}
	return customerAccountOf(row), nil
}

func (r *CustomerRepo) FindForLogin(ctx context.Context, email string) (customer.Customer, string, error) {
	row, err := r.q.FindCustomerForLogin(ctx, email)
	if err != nil {
		return customer.Customer{}, "", customerAccountErr(err)
	}
	return customerAccountOf(row), row.PasswordHash, nil
}

func (r *CustomerRepo) FindActive(ctx context.Context, id uuid.UUID) (customer.Customer, error) {
	row, err := r.q.FindActiveCustomer(ctx, id)
	if err != nil {
		return customer.Customer{}, customerAccountErr(err)
	}
	return customerAccountOf(row), nil
}

func (r *CustomerRepo) UpdateProfile(ctx context.Context, id uuid.UUID, u customer.ProfileUpdate) (customer.Customer, error) {
	row, err := r.q.UpdateCustomerProfile(ctx, store.UpdateCustomerProfileParams{Name: u.Name, Phone: u.Phone, ID: id})
	if err != nil {
		return customer.Customer{}, customerAccountErr(err)
	}
	return customerAccountOf(row), nil
}

func customerAccountErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return customer.ErrNotFound
	}
	return err
}

func customerAccountOf(row store.Customer) customer.Customer {
	return customer.Customer{
		ID:        row.ID,
		Email:     row.Email,
		Name:      row.Name,
		Phone:     row.Phone,
		IsActive:  row.IsActive,
		CreatedAt: row.CreatedAt.Time,
	}
}
