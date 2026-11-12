package customer

import (
	"errors"
	"testing"

	"github.com/RafiAkem/antay/backend/internal/domain/contact"
)

func TestRegistrationNormalize(t *testing.T) {
	got, err := Registration{Email: " Ani@Contoh.id", Password: " rahasia1 ", Name: " Ani ", Phone: "0812 3456 789"}.Normalize()
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	want := Registration{Email: "ani@contoh.id", Password: " rahasia1 ", Name: "Ani", Phone: "628123456789"}
	if got != want {
		t.Fatalf("got %+v, mau %+v", got, want)
	}
}

func TestRegistrationReportsEveryField(t *testing.T) {
	_, err := Registration{}.Normalize()
	var verr *contact.ValidationError
	if !errors.As(err, &verr) || len(verr.Issues) != 4 {
		t.Fatalf("err = %v, mau 4 issue", err)
	}
}

func TestProfileUpdateNeedsAField(t *testing.T) {
	if _, err := (ProfileUpdate{}).Normalize(); err == nil {
		t.Fatal("update kosong harus ditolak")
	}
	phone := "+6281234567890"
	got, err := ProfileUpdate{Phone: &phone}.Normalize()
	if err != nil || got.Name != nil || *got.Phone != "6281234567890" {
		t.Fatalf("got %+v, err %v", got, err)
	}
}
