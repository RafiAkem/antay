package security

import "golang.org/x/crypto/bcrypt"

// dummyHash adalah hash bcrypt cost 10 dari nilai acak yang tidak disimpan di mana pun.
const dummyHash = "$2a$10$.vcislaTkLWrizpOvZPqduoAl5J3f6EvC2upwn8bcYjZ/6bRserMO"

type Bcrypt struct{}

// Matches dengan hash kosong tetap menjalankan bcrypt lalu mengembalikan false,
// supaya email yang tidak dikenal tidak bisa dibedakan lewat waktu respons.
func (Bcrypt) Matches(hash, password string) bool {
	if hash == "" {
		_ = bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(password))
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// Hash memakai cost yang sama dengan dummyHash, supaya cek kata sandi untuk
// email asing tetap selama cek untuk akun sungguhan.
func (Bcrypt) Hash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}
