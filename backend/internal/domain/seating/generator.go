// Package seating adalah denah kursi berbasis blok. Penyelenggara menaruh
// beberapa blok di kanvas di sekitar panggung, lalu posisi tiap kursi dihitung
// dari parameter blok. Paket ini murni hitungan, tanpa I/O, supaya pratinjau
// di editor dan kursi yang disimpan selalu keluar dari rumus yang sama.
package seating

import (
	"fmt"
	"math"
	"regexp"
)

const (
	NumberingLTR = "ltr"
	NumberingRTL = "rtl"
)

// Batas di bawah ini sama dengan CHECK di migrasi 0005. Kalau salah satu
// berubah di sana, ubah juga di sini, jangan sampai validasi lolos lalu
// database menolak dengan 500.
const (
	MaxRows        = 50
	MaxSeatsPerRow = 80
	MinSpacing     = 16
	MaxSpacing     = 80
	MaxCurve       = 100
	MaxRotation    = 180
	// Kolom x/y tidak dibatasi di database, tapi angka liar bikin kanvas
	// tidak bisa dipakai dan berisiko meluap waktu diputar.
	MaxCoord = 20000
)

var (
	codePattern     = regexp.MustCompile(`^[A-Z0-9]{1,3}$`)
	rowLabelPattern = regexp.MustCompile(`^[A-Z]$`)
)

// BlockSpec adalah parameter bentuk satu blok. X dan Y adalah titik tengah
// baris terdepan (baris yang paling dekat panggung) di kanvas.
type BlockSpec struct {
	Code          string
	X, Y          int
	Rotation      int // derajat, searah jarum jam di layar (sumbu y ke bawah)
	RowCount      int
	SeatsPerRow   int
	Curve         int // 0 lurus, 100 lengkung sekitar 90 derajat
	SeatSpacing   int
	RowSpacing    int
	FirstRowLabel string
	Numbering     string
	AisleAfter    []int
}

// SeatPos adalah satu kursi hasil generator, sudah dalam koordinat kanvas.
type SeatPos struct {
	RowLabel string
	Number   int
	Label    string
	X, Y     int
}

// Issue adalah satu masalah isian; Field memakai nama field JSON.
type Issue struct {
	Field   string
	Message string
}

// InvalidError mengumpulkan semua masalah sekaligus supaya editor bisa
// menandai semua field yang salah dalam satu kali kirim.
type InvalidError struct{ Issues []Issue }

func (e InvalidError) Error() string {
	return fmt.Sprintf("denah tidak valid: %d masalah", len(e.Issues))
}

func (b BlockSpec) Validate() error {
	var issues []Issue
	add := func(field, msg string) { issues = append(issues, Issue{Field: field, Message: msg}) }

	if !codePattern.MatchString(b.Code) {
		add("code", "Kode blok 1 sampai 3 huruf kapital atau angka.")
	}
	if b.X < -MaxCoord || b.X > MaxCoord || b.Y < -MaxCoord || b.Y > MaxCoord {
		add("x", fmt.Sprintf("Posisi blok harus di antara -%d dan %d.", MaxCoord, MaxCoord))
	}
	if b.Rotation < -MaxRotation || b.Rotation > MaxRotation {
		add("rotation", "Rotasi harus di antara -180 dan 180 derajat.")
	}
	if b.RowCount < 1 || b.RowCount > MaxRows {
		add("rowCount", fmt.Sprintf("Jumlah baris 1 sampai %d.", MaxRows))
	}
	if b.SeatsPerRow < 1 || b.SeatsPerRow > MaxSeatsPerRow {
		add("seatsPerRow", fmt.Sprintf("Kursi per baris 1 sampai %d.", MaxSeatsPerRow))
	}
	if b.Curve < 0 || b.Curve > MaxCurve {
		add("curve", "Lengkungan 0 sampai 100.")
	}
	if b.SeatSpacing < MinSpacing || b.SeatSpacing > MaxSpacing {
		add("seatSpacing", fmt.Sprintf("Jarak antarkursi %d sampai %d.", MinSpacing, MaxSpacing))
	}
	if b.RowSpacing < MinSpacing || b.RowSpacing > MaxSpacing {
		add("rowSpacing", fmt.Sprintf("Jarak antarbaris %d sampai %d.", MinSpacing, MaxSpacing))
	}
	if !rowLabelPattern.MatchString(b.FirstRowLabel) {
		add("firstRowLabel", "Label baris pertama satu huruf kapital A sampai Z.")
	}
	if b.Numbering != NumberingLTR && b.Numbering != NumberingRTL {
		add("numbering", "Arah penomoran harus ltr atau rtl.")
	}
	seen := make(map[int]bool, len(b.AisleAfter))
	for _, n := range b.AisleAfter {
		// Lorong setelah kursi terakhir tidak ada artinya, jadi ditolak saja.
		if n < 1 || n >= b.SeatsPerRow || seen[n] {
			add("aisleAfter", "Lorong harus setelah nomor kursi 1 sampai jumlah kursi dikurangi satu, tanpa dobel.")
			break
		}
		seen[n] = true
	}
	if len(issues) > 0 {
		return InvalidError{Issues: issues}
	}
	return nil
}

// Generate menghitung semua kursi satu blok, urut per baris lalu per nomor.
func Generate(b BlockSpec) ([]SeatPos, error) {
	if err := b.Validate(); err != nil {
		return nil, err
	}
	offsets := seatOffsets(b)
	n := b.SeatsPerRow

	// Lengkungan: baris depan dijadikan busur dengan panjang sama dengan lebar
	// lurusnya, jadi jarak antarkursi di sepanjang busur tetap seatSpacing.
	// Pusat lingkaran ada di arah panggung, dan baris di belakangnya memakai
	// radius lebih besar dari pusat yang sama supaya barisnya sejajar.
	width := offsets[n-1] - offsets[0]
	span := float64(b.Curve) / MaxCurve * math.Pi / 2
	curved := span > 0 && width > 0
	var r0 float64
	if curved {
		r0 = width / span
	}
	sin, cos := math.Sincos(float64(b.Rotation) * math.Pi / 180)
	first := int(b.FirstRowLabel[0] - 'A')

	out := make([]SeatPos, 0, b.RowCount*n)
	for r := 0; r < b.RowCount; r++ {
		row := RowLabel(first + r)
		depth := float64(r * b.RowSpacing)
		for number := 1; number <= n; number++ {
			u := offsets[physicalIndex(b.Numbering, n, number)]
			lx, ly := u, depth
			if curved {
				radius := r0 + depth
				phi := u / radius
				lx = radius * math.Sin(phi)
				ly = radius*math.Cos(phi) - r0
			}
			out = append(out, SeatPos{
				RowLabel: row,
				Number:   number,
				Label:    fmt.Sprintf("%s-%s%d", b.Code, row, number),
				X:        b.X + int(math.Round(lx*cos-ly*sin)),
				Y:        b.Y + int(math.Round(lx*sin+ly*cos)),
			})
		}
	}
	return out, nil
}

// seatOffsets memberi posisi x tiap kursi dalam satu baris lurus, diurutkan
// dari kiri ke kanan di layar dan sudah ditengahkan di titik nol.
func seatOffsets(b BlockSpec) []float64 {
	n := b.SeatsPerRow
	aisle := make(map[int]bool, len(b.AisleAfter))
	for _, a := range b.AisleAfter {
		aisle[a] = true
	}
	spacing := float64(b.SeatSpacing)
	pos := make([]float64, n)
	for i := 1; i < n; i++ {
		pos[i] = pos[i-1] + spacing
		// Lorong "setelah kursi 5" artinya di antara nomor 5 dan 6. Untuk rtl
		// nomor kecil ada di kanan, jadi yang dicek nomor terkecil dari pasangan
		// kursi yang bersebelahan, bukan indeks fisiknya.
		left, right := numberAt(b.Numbering, n, i-1), numberAt(b.Numbering, n, i)
		if aisle[min(left, right)] {
			pos[i] += spacing
		}
	}
	half := pos[n-1] / 2
	for i := range pos {
		pos[i] -= half
	}
	return pos
}

func numberAt(numbering string, n, index int) int {
	if numbering == NumberingRTL {
		return n - index
	}
	return index + 1
}

func physicalIndex(numbering string, n, number int) int {
	if numbering == NumberingRTL {
		return n - number
	}
	return number - 1
}

// RowLabel mengubah indeks baris (0 = A) jadi label. Setelah Z lanjut AA, AB,
// dan seterusnya. Dengan batas 50 baris dari Z paling jauh sampai BW, masih
// muat di pola ^[A-Z]{1,2}$.
func RowLabel(index int) string {
	if index < 26 {
		return string(rune('A' + index))
	}
	index -= 26
	return string(rune('A'+index/26)) + string(rune('A'+index%26))
}
