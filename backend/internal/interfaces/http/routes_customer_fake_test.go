package http

import (
	"context"
	"sync"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/customer"
)

type custRow struct {
	c    customer.Customer
	hash string
}

// custRepo meniru tabel customers di memori; akun nonaktif tidak ketemu,
// sama seperti query aslinya.
type custRepo struct {
	mu   sync.Mutex
	rows map[string]*custRow
}

func (f *custRepo) Create(_ context.Context, a customer.NewAccount) (customer.Customer, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.rows[a.Email]; ok {
		return customer.Customer{}, customer.ErrEmailTaken
	}
	c := customer.Customer{ID: uuid.New(), Email: a.Email, Name: a.Name, Phone: a.Phone, IsActive: true}
	f.rows[a.Email] = &custRow{c: c, hash: a.PasswordHash}
	return c, nil
}

func (f *custRepo) FindForLogin(_ context.Context, email string) (customer.Customer, string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if row, ok := f.rows[email]; ok && row.c.IsActive {
		return row.c, row.hash, nil
	}
	return customer.Customer{}, "", customer.ErrNotFound
}

func (f *custRepo) find(id uuid.UUID) *custRow {
	for _, row := range f.rows {
		if row.c.ID == id && row.c.IsActive {
			return row
		}
	}
	return nil
}

func (f *custRepo) FindActive(_ context.Context, id uuid.UUID) (customer.Customer, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if row := f.find(id); row != nil {
		return row.c, nil
	}
	return customer.Customer{}, customer.ErrNotFound
}

func (f *custRepo) UpdateProfile(_ context.Context, id uuid.UUID, u customer.ProfileUpdate) (customer.Customer, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	row := f.find(id)
	if row == nil {
		return customer.Customer{}, customer.ErrNotFound
	}
	if u.Name != nil {
		row.c.Name = *u.Name
	}
	if u.Phone != nil {
		row.c.Phone = *u.Phone
	}
	return row.c, nil
}
