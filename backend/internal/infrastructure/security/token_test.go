package security

import (
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

// Satu kunci RSA untuk semua tes; membangkitkan kunci 2048 bit itu lambat.
var testTokens = mustTokens()

func mustTokens() *TokenService {
	s, err := NewTokenService("", 15*time.Minute, 24*time.Hour)
	if err != nil {
		panic(err)
	}
	return s
}

func TestInternalTokenRoundTripKeepsOrganizer(t *testing.T) {
	org := uuid.New()
	in := user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &org}
	token, err := testTokens.Issue(in)
	if err != nil {
		t.Fatal(err)
	}
	got, err := testTokens.Parse(token)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got.UserID != in.UserID || got.Role != in.Role || got.OrganizerID == nil || *got.OrganizerID != org {
		t.Fatalf("sesi = %+v, mau %+v", got, in)
	}
}

func TestInternalTokenWithoutOrganizer(t *testing.T) {
	token, err := testTokens.Issue(user.Session{UserID: uuid.New(), Role: user.RoleStaff})
	if err != nil {
		t.Fatal(err)
	}
	got, err := testTokens.Parse(token)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got.OrganizerID != nil {
		t.Fatalf("OrganizerID = %v, mau nil", *got.OrganizerID)
	}
}

func TestCustomerTokenRoundTrip(t *testing.T) {
	id := uuid.New()
	token, err := testTokens.IssueCustomer(id)
	if err != nil {
		t.Fatal(err)
	}
	got, err := testTokens.ParseCustomer(token)
	if err != nil || got != id {
		t.Fatalf("ParseCustomer = (%v, %v), mau (%v, nil)", got, err, id)
	}
}

func TestParseRejectsCustomerToken(t *testing.T) {
	token, err := testTokens.IssueCustomer(uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := testTokens.Parse(token); !errors.Is(err, ErrBadSession) {
		t.Fatalf("Parse(token pembeli) error = %v, mau ErrBadSession", err)
	}
}

func TestParseCustomerRejectsInternalToken(t *testing.T) {
	token, err := testTokens.Issue(user.Session{UserID: uuid.New(), Role: user.RoleAdmin})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := testTokens.ParseCustomer(token); !errors.Is(err, ErrBadSession) {
		t.Fatalf("ParseCustomer(token internal) error = %v, mau ErrBadSession", err)
	}
}

// Token format lama tidak punya aud; harus ditolak, bukan dianggap internal.
func TestParseRejectsTokenWithoutAudience(t *testing.T) {
	now := time.Now()
	token, err := testTokens.sign(claims{
		UserID: uuid.New(),
		Role:   user.RoleAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Minute)),
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := testTokens.Parse(token); !errors.Is(err, ErrBadSession) {
		t.Fatalf("Parse(token tanpa aud) error = %v, mau ErrBadSession", err)
	}
}

func TestCustomerTokenUsesItsOwnTTL(t *testing.T) {
	if testTokens.CustomerTTL() != 24*time.Hour || testTokens.TTL() != 15*time.Minute {
		t.Fatalf("TTL = %v / %v", testTokens.TTL(), testTokens.CustomerTTL())
	}
}
