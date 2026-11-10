package postgres

import (
	"context"
	"errors"
	"testing"

	"github.com/RafiAkem/antay/backend/internal/domain/ticket"
)

func TestGetByCodeTreatsUnstorableCodeAsNotFound(t *testing.T) {
	// Repo tanpa koneksi: kode seperti ini harus berhenti sebelum menyentuh database.
	repo := &TicketRepo{}
	for _, code := range []string{"AB-\x00CD", "A\xc3-\x891234", "\xff\xfe12"} {
		if _, err := repo.GetByCode(context.Background(), code); !errors.Is(err, ticket.ErrNotFound) {
			t.Fatalf("GetByCode(%q) error = %v, mau ErrNotFound", code, err)
		}
	}
}
