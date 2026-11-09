package identity

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

type noUsers struct{}

func (noUsers) GetByEmail(context.Context, string) (user.User, error) {
	return user.User{}, user.ErrNotFound
}

func (noUsers) GetByID(context.Context, uuid.UUID) (user.User, error) {
	return user.User{}, user.ErrNotFound
}

type recordingPasswords struct{ hashes []string }

func (p *recordingPasswords) Matches(hash, _ string) bool {
	p.hashes = append(p.hashes, hash)
	return false
}

type noTokens struct{}

func (noTokens) Issue(user.Session) (string, error) { return "", nil }

func TestLoginWithUnknownEmailStillChecksPassword(t *testing.T) {
	passwords := &recordingPasswords{}
	svc := New(noUsers{}, passwords, noTokens{})

	_, _, err := svc.Login(context.Background(), "tidak-ada@antay.id", "rahasia")

	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("Login error = %v, mau ErrInvalidCredentials", err)
	}
	if len(passwords.hashes) != 1 || passwords.hashes[0] != "" {
		t.Fatalf("Matches dipanggil dengan %q, mau sekali dengan hash kosong", passwords.hashes)
	}
}
