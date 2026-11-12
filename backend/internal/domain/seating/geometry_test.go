package seating

import "testing"

func TestBounds(t *testing.T) {
	seats := []SeatPos{{X: 5, Y: -3}, {X: -2, Y: 9}, {X: 1, Y: 1}}
	x0, y0, x1, y1 := Bounds(seats)
	if x0 != -2 || y0 != -3 || x1 != 5 || y1 != 9 {
		t.Fatalf("Bounds = %d,%d,%d,%d", x0, y0, x1, y1)
	}
	if a, b, c, d := Bounds(nil); a|b|c|d != 0 {
		t.Fatal("Bounds kosong harus nol")
	}
}

func TestOverlaps(t *testing.T) {
	left := baseSpec()
	a := mustGenerate(t, left)
	cases := []struct {
		name   string
		dx, dy int
		touch  bool
	}{
		{"tumpuk persis", 0, 0, true},
		{"geser sedikit", 10, 5, true},
		{"pas di batas jarak", 100, 0, false},
		{"jauh di kanan", 200, 0, false},
	}
	for _, c := range cases {
		b := left
		b.Code, b.X, b.Y = "R", left.X+c.dx, left.Y+c.dy
		if got := Overlaps(a, mustGenerate(t, b), MinSeatGap); got != c.touch {
			t.Fatalf("%s: Overlaps = %v, mau %v", c.name, got, c.touch)
		}
	}
}

// Pembagian bilangan bulat Go membulatkan ke nol; tanpa floorDiv dua kursi
// yang berdekatan di sekitar nol bisa jatuh ke sel yang tidak saling dicek.
func TestOverlapsAcrossNegativeCells(t *testing.T) {
	a := []SeatPos{{X: -20, Y: -1}}
	b := []SeatPos{{X: -5, Y: 1}}
	if !Overlaps(a, b, MinSeatGap) {
		t.Fatal("kursi berjarak 15 harus dianggap bertabrakan")
	}
}

func TestHitsRectAndCanvas(t *testing.T) {
	seats := []SeatPos{{X: 100, Y: 100}}
	if !HitsRect(seats, Rect{X: 90, Y: 90, Width: 20, Height: 20}, 0) {
		t.Fatal("kursi di dalam panggung harus terdeteksi")
	}
	if HitsRect(seats, Rect{X: 0, Y: 0, Width: 50, Height: 50}, SeatRadius) {
		t.Fatal("kursi jauh dari panggung tidak boleh terdeteksi")
	}
	if !OutsideCanvas([]SeatPos{{X: 3, Y: 100}}, 1000, 700, SeatRadius) {
		t.Fatal("kursi mepet tepi kiri harus dianggap keluar kanvas")
	}
}
