package seating

import (
	"errors"
	"math"
	"strconv"
	"testing"
)

func baseSpec() BlockSpec {
	return BlockSpec{
		Code: "L", X: 500, Y: 400, RowCount: 3, SeatsPerRow: 5,
		SeatSpacing: 20, RowSpacing: 30, FirstRowLabel: "A", Numbering: NumberingLTR,
	}
}

func mustGenerate(t *testing.T, b BlockSpec) []SeatPos {
	t.Helper()
	seats, err := Generate(b)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	return seats
}

func find(seats []SeatPos, label string) SeatPos {
	for _, s := range seats {
		if s.Label == label {
			return s
		}
	}
	return SeatPos{Label: "tidak ada"}
}

func dist(a, b SeatPos) float64 {
	return math.Hypot(float64(a.X-b.X), float64(a.Y-b.Y))
}

func TestGenerateCounts(t *testing.T) {
	cases := []struct{ rows, perRow int }{{1, 1}, {3, 5}, {50, 80}}
	for _, c := range cases {
		b := baseSpec()
		b.RowCount, b.SeatsPerRow = c.rows, c.perRow
		if got := len(mustGenerate(t, b)); got != c.rows*c.perRow {
			t.Fatalf("%dx%d menghasilkan %d kursi", c.rows, c.perRow, got)
		}
	}
}

func TestNumberingDirection(t *testing.T) {
	cases := []struct {
		numbering string
		leftmost  string
	}{
		{NumberingLTR, "L-A1"},
		{NumberingRTL, "L-A5"},
	}
	for _, c := range cases {
		b := baseSpec()
		b.Numbering = c.numbering
		seats := mustGenerate(t, b)
		left := seats[0]
		for _, s := range seats[:5] {
			if s.X < left.X {
				left = s
			}
		}
		if left.Label != c.leftmost {
			t.Fatalf("%s: kursi paling kiri %s, mau %s", c.numbering, left.Label, c.leftmost)
		}
	}
}

func TestBlockIsCentredOnFrontRow(t *testing.T) {
	seats := mustGenerate(t, baseSpec())
	if mid := find(seats, "L-A3"); mid.X != 500 || mid.Y != 400 {
		t.Fatalf("kursi tengah baris A di (%d,%d), mau (500,400)", mid.X, mid.Y)
	}
	// Baris berikutnya menjauh dari panggung, yaitu ke bawah.
	if b := find(seats, "L-B3"); b.Y != 430 {
		t.Fatalf("baris B di y=%d, mau 430", b.Y)
	}
}

func TestAisleGap(t *testing.T) {
	for _, numbering := range []string{NumberingLTR, NumberingRTL} {
		b := baseSpec()
		b.SeatsPerRow, b.AisleAfter, b.Numbering = 6, []int{3}, numbering
		seats := mustGenerate(t, b)
		if d := dist(find(seats, "L-A3"), find(seats, "L-A4")); d != 40 {
			t.Fatalf("%s: jarak kursi 3 ke 4 = %v, mau 40", numbering, d)
		}
		if d := dist(find(seats, "L-A4"), find(seats, "L-A5")); d != 20 {
			t.Fatalf("%s: jarak kursi 4 ke 5 = %v, mau 20", numbering, d)
		}
	}
}

func TestRotation90MapsXToY(t *testing.T) {
	flat := mustGenerate(t, baseSpec())
	b := baseSpec()
	b.Rotation = 90
	turned := mustGenerate(t, b)
	for i := range flat {
		fx, fy := flat[i].X-500, flat[i].Y-400
		tx, ty := turned[i].X-500, turned[i].Y-400
		if tx != -fy || ty != fx {
			t.Fatalf("%s: (%d,%d) diputar jadi (%d,%d)", flat[i].Label, fx, fy, tx, ty)
		}
	}
}

func TestCurveBendsTowardStage(t *testing.T) {
	b := baseSpec()
	b.SeatsPerRow, b.Curve = 9, 100
	seats := mustGenerate(t, b)
	mid := find(seats, "L-A5")
	stage := SeatPos{X: 500, Y: 340} // titik panggung tepat di depan blok

	for n := 1; n <= 9; n++ {
		s := seats[n-1]
		if s.Label != mid.Label && dist(s, stage) <= dist(mid, stage) {
			t.Fatalf("%s lebih dekat ke panggung daripada kursi tengah", s.Label)
		}
	}
	// Ujung baris naik ke arah panggung: cekungnya menghadap panggung.
	if end := find(seats, "L-A1"); end.Y >= mid.Y {
		t.Fatalf("ujung baris y=%d tidak lebih dekat ke panggung dari tengah y=%d", end.Y, mid.Y)
	}
	// Jarak antarkursi di busur tetap kira-kira seatSpacing di semua baris.
	for _, row := range []string{"A", "C"} {
		for n := 1; n < 9; n++ {
			d := dist(find(seats, "L-"+row+strconv.Itoa(n)), find(seats, "L-"+row+strconv.Itoa(n+1)))
			if math.Abs(d-20) > 2 {
				t.Fatalf("baris %s kursi %d-%d berjarak %.1f", row, n, n+1, d)
			}
		}
	}
}

func TestRowLabelsContinuePastZ(t *testing.T) {
	b := baseSpec()
	b.FirstRowLabel, b.RowCount, b.SeatsPerRow = "Y", 4, 1
	seats := mustGenerate(t, b)
	want := []string{"L-Y1", "L-Z1", "L-AA1", "L-AB1"}
	for i, w := range want {
		if seats[i].Label != w {
			t.Fatalf("baris ke-%d = %s, mau %s", i, seats[i].Label, w)
		}
	}
	if got := RowLabel(25 + MaxRows - 1); got != "BW" {
		t.Fatalf("baris terjauh = %s, mau BW", got)
	}
}

func TestInvalidSpecs(t *testing.T) {
	cases := []struct {
		field string
		edit  func(*BlockSpec)
	}{
		{"code", func(b *BlockSpec) { b.Code = "abcd" }},
		{"code", func(b *BlockSpec) { b.Code = "" }},
		{"rotation", func(b *BlockSpec) { b.Rotation = 181 }},
		{"rowCount", func(b *BlockSpec) { b.RowCount = 51 }},
		{"seatsPerRow", func(b *BlockSpec) { b.SeatsPerRow = 0 }},
		{"curve", func(b *BlockSpec) { b.Curve = 101 }},
		{"seatSpacing", func(b *BlockSpec) { b.SeatSpacing = 15 }},
		{"rowSpacing", func(b *BlockSpec) { b.RowSpacing = 81 }},
		{"firstRowLabel", func(b *BlockSpec) { b.FirstRowLabel = "AA" }},
		{"numbering", func(b *BlockSpec) { b.Numbering = "zigzag" }},
		{"aisleAfter", func(b *BlockSpec) { b.AisleAfter = []int{5} }},
		{"aisleAfter", func(b *BlockSpec) { b.AisleAfter = []int{2, 2} }},
		{"x", func(b *BlockSpec) { b.X = MaxCoord + 1 }},
	}
	for _, c := range cases {
		b := baseSpec()
		c.edit(&b)
		_, err := Generate(b)
		var invalid InvalidError
		if !errors.As(err, &invalid) || invalid.Issues[0].Field != c.field {
			t.Fatalf("mau masalah di %s, dapat %v", c.field, err)
		}
	}
}
