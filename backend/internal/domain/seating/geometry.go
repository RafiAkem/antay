package seating

// MinSeatGap adalah jarak titik pusat terdekat antara dua kursi dari blok
// berbeda sebelum dianggap bertabrakan. Diambil dari jarak kursi terkecil
// yang diizinkan, karena di bawah itu gambar kursinya pasti saling tumpuk.
const MinSeatGap = MinSpacing

// SeatRadius dipakai untuk mengecek kursi yang menabrak panggung atau keluar
// kanvas: titik pusat boleh mepet, tapi gambar kursinya jangan masuk.
const SeatRadius = MinSpacing / 2

type Rect struct {
	X, Y, Width, Height int
}

// Bounds mengembalikan kotak terkecil yang memuat semua kursi. Untuk daftar
// kosong hasilnya nol semua.
func Bounds(seats []SeatPos) (minX, minY, maxX, maxY int) {
	if len(seats) == 0 {
		return 0, 0, 0, 0
	}
	minX, minY, maxX, maxY = seats[0].X, seats[0].Y, seats[0].X, seats[0].Y
	for _, s := range seats[1:] {
		minX, maxX = min(minX, s.X), max(maxX, s.X)
		minY, maxY = min(minY, s.Y), max(maxY, s.Y)
	}
	return minX, minY, maxX, maxY
}

type cell struct{ x, y int }

// Overlaps bernilai true bila ada kursi a yang jaraknya ke kursi b kurang dari
// minGap. Dua blok besar bisa 4000 x 4000 pasangan, jadi kursi b dimasukkan ke
// grid berukuran minGap dan tiap kursi a cukup mengecek 9 sel di sekitarnya.
func Overlaps(a, b []SeatPos, minGap int) bool {
	if len(a) == 0 || len(b) == 0 {
		return false
	}
	minGap = max(minGap, 1)
	ax0, ay0, ax1, ay1 := Bounds(a)
	bx0, by0, bx1, by1 := Bounds(b)
	if ax1+minGap <= bx0 || bx1+minGap <= ax0 || ay1+minGap <= by0 || by1+minGap <= ay0 {
		return false
	}

	grid := make(map[cell][]SeatPos, len(b))
	for _, s := range b {
		c := cellOf(s, minGap)
		grid[c] = append(grid[c], s)
	}
	limit := minGap * minGap
	for _, s := range a {
		c := cellOf(s, minGap)
		for dx := -1; dx <= 1; dx++ {
			for dy := -1; dy <= 1; dy++ {
				for _, o := range grid[cell{c.x + dx, c.y + dy}] {
					ddx, ddy := s.X-o.X, s.Y-o.Y
					if ddx*ddx+ddy*ddy < limit {
						return true
					}
				}
			}
		}
	}
	return false
}

// cellOf membulatkan ke bawah, termasuk untuk koordinat negatif; pembagian
// bilangan bulat Go membulatkan ke nol dan bisa membuat dua sel jadi satu.
func cellOf(s SeatPos, size int) cell {
	return cell{floorDiv(s.X, size), floorDiv(s.Y, size)}
}

func floorDiv(a, b int) int {
	q := a / b
	if (a%b != 0) && ((a < 0) != (b < 0)) {
		q--
	}
	return q
}

// HitsRect bernilai true bila ada kursi yang masuk ke kotak r yang
// diperlebar margin di semua sisi.
func HitsRect(seats []SeatPos, r Rect, margin int) bool {
	x0, y0 := r.X-margin, r.Y-margin
	x1, y1 := r.X+r.Width+margin, r.Y+r.Height+margin
	for _, s := range seats {
		if s.X > x0 && s.X < x1 && s.Y > y0 && s.Y < y1 {
			return true
		}
	}
	return false
}

// OutsideCanvas bernilai true bila ada gambar kursi yang keluar dari kanvas.
func OutsideCanvas(seats []SeatPos, width, height, margin int) bool {
	for _, s := range seats {
		if s.X-margin < 0 || s.Y-margin < 0 || s.X+margin > width || s.Y+margin > height {
			return true
		}
	}
	return false
}
