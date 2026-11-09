// Package shared memuat konsep waktu yang dipakai semua bounded context.
// Jam slot disimpan sebagai menit sejak tengah malam; acara berjalan satu hari
// di satu zona waktu, jadi aritmetika slot bebas masalah zona waktu.
package shared

import (
	"fmt"
	"time"
)

// Clock adalah sumber waktu yang bisa diganti saat tes.
type Clock func() time.Time

func (c Clock) Today() string { return c().Format("2006-01-02") }

func (c Clock) Minutes() int32 {
	t := c()
	return int32(t.Hour()*60 + t.Minute())
}

// ClockOf mengubah menit sejak tengah malam menjadi "10:30".
func ClockOf(minutes int32) string {
	return fmt.Sprintf("%02d:%02d", minutes/60, minutes%60)
}

// MinutesOf membaca "10:30"; menolak jam di luar 00:00-23:59.
func MinutesOf(clock string) (int32, error) {
	var h, m int
	if _, err := fmt.Sscanf(clock, "%d:%d", &h, &m); err != nil {
		return 0, fmt.Errorf("format jam harus HH:MM")
	}
	if h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, fmt.Errorf("jam %s di luar rentang yang wajar", clock)
	}
	return int32(h*60 + m), nil
}
