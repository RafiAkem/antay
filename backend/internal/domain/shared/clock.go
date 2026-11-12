// Package shared memuat konsep waktu yang dipakai semua bounded context.
// Jam slot disimpan sebagai menit sejak tengah malam; acara berjalan satu hari
// di satu zona waktu, jadi aritmetika slot bebas masalah zona waktu.
package shared

import (
	"fmt"
	"time"
	// Data zona waktu ikut di-embed ke binary. Image container minimal sering
	// tidak punya /usr/share/zoneinfo, dan tanpa ini LoadLocation gagal di sana.
	_ "time/tzdata"
)

// Jakarta adalah zona waktu semua jam event dan slot. Server bisa saja jalan
// di UTC, jadi "hari ini" dan "jam sekarang" tidak boleh ikut zona server.
var Jakarta = mustLoadLocation("Asia/Jakarta")

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic("zona waktu " + name + " tidak bisa dimuat: " + err.Error())
	}
	return loc
}

// Clock adalah sumber waktu yang bisa diganti saat tes.
type Clock func() time.Time

// NewJakartaClock adalah jam yang dipakai aplikasi sungguhan.
func NewJakartaClock() Clock {
	return func() time.Time { return time.Now().In(Jakarta) }
}

func (c Clock) Today() string { return c().Format("2006-01-02") }

func (c Clock) Minutes() int32 {
	t := c()
	return int32(t.Hour()*60 + t.Minute())
}

// ClockOf mengubah menit sejak tengah malam menjadi "10:30".
func ClockOf(minutes int32) string {
	return fmt.Sprintf("%02d:%02d", minutes/60, minutes%60)
}

// MinutesOf membaca "10:30"; menolak selain HH:MM dan jam di luar 00:00-23:59.
func MinutesOf(clock string) (int32, error) {
	t, err := time.Parse("15:04", clock)
	// time.Parse menerima jam satu digit, jadi panjangnya dicek terpisah.
	if err != nil || len(clock) != len("15:04") {
		return 0, fmt.Errorf("format jam harus HH:MM")
	}
	return int32(t.Hour()*60 + t.Minute()), nil
}
