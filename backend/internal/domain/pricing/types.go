// Package pricing menghitung harga pesanan: subtotal, diskon, biaya layanan, dan
// total. Sengaja murni tanpa I/O supaya angka di quote, di pesanan, dan di
// tagihan gateway keluar dari fungsi yang sama dan bisa diuji tanpa database.
//
// Semua uang dalam rupiah bulat (int64), persen dalam basis poin (1000 = 10%).
// Tidak ada float di mana pun, karena selisih satu rupiah antara quote dan
// tagihan sudah cukup bikin pembeli komplain.
package pricing

import (
	"time"

	"github.com/google/uuid"
)

// Kind menentukan cara diskon terpasang.
type Kind string

const (
	KindAuto Kind = "auto" // langsung terpasang, misal early bird
	KindCode Kind = "code" // pembeli harus mengetik kode promo
)

// ValueType menentukan arti Discount.Value.
type ValueType string

const (
	ValuePercent ValueType = "percent" // Value dalam basis poin
	ValueAmount  ValueType = "amount"  // Value dalam rupiah
)

// FeeBearer menentukan siapa yang menanggung biaya layanan. Nilainya sama
// dengan kolom events.fee_bearer.
type FeeBearer string

const (
	FeeBearerCustomer  FeeBearer = "customer"
	FeeBearerOrganizer FeeBearer = "organizer"
)

// RejectReason adalah alasan kode promo tidak terpasang. String kosong artinya
// kode lolos. Nilainya stabil dan sengaja snake_case supaya frontend tinggal
// memetakan ke kalimat yang dibaca pembeli.
type RejectReason string

const (
	RejectUnknownCode    RejectReason = "unknown_code"
	RejectInactive       RejectReason = "inactive"
	RejectNotStarted     RejectReason = "not_started"
	RejectExpired        RejectReason = "expired"
	RejectQuotaExhausted RejectReason = "quota_exhausted"
	RejectCustomerLimit  RejectReason = "customer_limit"
	RejectNotApplicable  RejectReason = "not_applicable"
	RejectMinSubtotal    RejectReason = "min_subtotal"
	// Kodenya sah, tapi tidak bisa digabung dan kombinasi lain lebih murah
	// buat pembeli, jadi server memilih tanpa kode ini.
	RejectNotCombinable RejectReason = "not_combinable"
	// Kodenya sah, tapi baris yang dicakup sudah habis dipotong diskon lain
	// sehingga potongannya nol.
	RejectNoEffect RejectReason = "no_effect"
)

// Line adalah satu baris keranjang: satu paket dengan jumlahnya.
type Line struct {
	PackageID  uuid.UUID
	CategoryID uuid.UUID
	UnitPrice  int64
	Quantity   int32
}

// Discount adalah aturan diskon apa adanya dari database. Field pointer yang
// nil artinya batasan itu tidak dipakai.
type Discount struct {
	ID        uuid.UUID
	Name      string
	Kind      Kind
	Code      string // hanya dipakai bila Kind = code, dibandingkan tanpa peduli huruf besar
	ValueType ValueType
	Value     int64
	MaxAmount *int64 // batas potongan untuk diskon persen

	// MinSubtotal dibandingkan dengan subtotal pesanan sebelum diskon apa pun.
	// Nol artinya tanpa minimal belanja.
	MinSubtotal int64

	// Cakupan. Keduanya nil berarti seluruh event. Kalau dua-duanya diisi,
	// baris harus cocok dengan keduanya.
	CategoryID *uuid.UUID
	PackageID  *uuid.UUID

	StartsAt *time.Time // inklusif
	EndsAt   *time.Time // eksklusif: tepat di EndsAt diskon sudah kedaluwarsa

	UsageLimit       *int32
	UsedCount        int32 // pemakaian dari pesanan yang sudah dibayar
	HeldCount        int32 // pemakaian yang sedang ditahan pesanan belum bayar
	PerCustomerLimit *int32

	Stackable bool
	IsActive  bool
	CreatedAt time.Time
}

// FeeRule adalah aturan biaya layanan satu event.
type FeeRule struct {
	Bearer    FeeBearer
	PercentBP int32 // dari harga setelah diskon
	Flat      int64 // per pesanan
}

// Input adalah semua yang dibutuhkan untuk menghitung satu pesanan.
type Input struct {
	Lines []Line
	// Discounts berisi semua diskon event, auto maupun kode. Yang tidak lolos
	// syarat disaring di sini, jadi pemanggil tidak perlu memilah dulu.
	Discounts []Discount
	Code      string // kode promo yang diketik pembeli, boleh kosong
	// CustomerUses adalah jumlah pemakaian pembeli ini per ID diskon. Boleh nil
	// untuk pembeli yang belum pernah pakai apa-apa.
	CustomerUses map[uuid.UUID]int32
	Fee          FeeRule
	Now          time.Time
}

// LineResult adalah rincian satu baris setelah diskon.
type LineResult struct {
	PackageID         uuid.UUID
	CategoryID        uuid.UUID
	UnitPrice         int64
	Quantity          int32
	LineTotal         int64
	DiscountAmount    int64
	LineAfterDiscount int64
}

// Applied adalah satu diskon yang benar-benar memotong harga.
type Applied struct {
	DiscountID uuid.UUID
	Name       string
	Kind       Kind
	Code       string
	Amount     int64
}

// Result adalah hasil hitung lengkap.
type Result struct {
	Lines         []LineResult
	Applied       []Applied
	Subtotal      int64
	DiscountTotal int64
	AfterDiscount int64

	// Fee selalu diisi berapa pun penanggungnya, karena laporan penyelenggara
	// tetap butuh angkanya. Yang masuk ke Total hanya CustomerFee.
	Fee          int64
	FeeBearer    FeeBearer
	CustomerFee  int64
	OrganizerFee int64

	Total int64

	// CodeRejection diisi bila kode diketik tapi tidak terpasang.
	CodeRejection RejectReason
}
