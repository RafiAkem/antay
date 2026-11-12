// Package category adalah kategori tiket dan paket di dalamnya. Pembeli memilih
// kategori dulu, baru paket, jadi keduanya disimpan terpisah.
package category

import (
	"time"

	"github.com/google/uuid"
)

// Category berkursi tidak punya Quota sendiri: kuotanya jumlah kursi aktif di
// denah. Kategori tanpa kursi wajib punya Quota, dihitung dalam orang.
type Category struct {
	ID          uuid.UUID
	EventID     uuid.UUID
	Name        string
	Description string
	SortOrder   int32
	IsSeated    bool
	Quota       *int32
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Package punya harga sendiri per kombinasi kategori dan paket, bukan hasil
// kali harga per orang. Quota opsional dan dihitung dalam jumlah paket; satu
// paket memakai Pax kuota kategori.
type Package struct {
	ID         uuid.UUID
	CategoryID uuid.UUID
	Name       string
	Pax        int32
	Price      int64
	Quota      *int32
	SortOrder  int32
	IsActive   bool
	CreatedAt  time.Time
	UpdatedAt  time.Time
}
