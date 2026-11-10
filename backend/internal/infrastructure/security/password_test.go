package security

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestDummyHashCostsTheSameAsRealHashes(t *testing.T) {
	cost, err := bcrypt.Cost([]byte(dummyHash))
	if err != nil {
		t.Fatalf("dummyHash tidak valid: %v", err)
	}
	if cost != bcrypt.DefaultCost {
		t.Fatalf("cost dummyHash = %d, mau %d", cost, bcrypt.DefaultCost)
	}
}

func TestMatchesEmptyHashIsAlwaysFalse(t *testing.T) {
	if (Bcrypt{}).Matches("", "apa-saja") {
		t.Fatal("hash kosong tidak boleh cocok dengan kata sandi apa pun")
	}
}

func TestMatchesRealHash(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("benar"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	if !(Bcrypt{}).Matches(string(hash), "benar") {
		t.Fatal("kata sandi benar ditolak")
	}
	if (Bcrypt{}).Matches(string(hash), "salah") {
		t.Fatal("kata sandi salah diterima")
	}
}
