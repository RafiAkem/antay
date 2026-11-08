// Package app memuat dependensi bersama dan bentuk data yang dipakai lebih dari
// satu area. Semua handler menerima Deps, jadi area tidak saling mengimpor.
package app

import (
	"fmt"
	"math"
	"time"

	"github.com/RafiAkem/antay/backend/internal/auth"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const WaitLimitMinutes = 15

type Deps struct {
	Store   *store.Queries
	Pool    *pgxpool.Pool
	Auth    *auth.Service
	Now     func() time.Time
	Version string
}

func (d Deps) Today() string { return d.Now().Format("2006-01-02") }

func (d Deps) NowMinutes() int32 {
	t := d.Now()
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

// SlotStarts menghasilkan jam mulai setiap slot untuk satu event.
func SlotStarts(ev store.Event) []int32 {
	var out []int32
	for m := ev.OpenMinutes; m+ev.SlotMinutes <= ev.CloseMinutes; m += ev.SlotMinutes {
		out = append(out, m)
	}
	return out
}

func IsSlotStart(ev store.Event, minutes int32) bool {
	if minutes < ev.OpenMinutes || minutes+ev.SlotMinutes > ev.CloseMinutes {
		return false
	}
	return (minutes-ev.OpenMinutes)%ev.SlotMinutes == 0
}

func TimePtr(ts pgtype.Timestamptz) *time.Time {
	if !ts.Valid {
		return nil
	}
	t := ts.Time
	return &t
}

func Int32Ptr(v *int32) *int32 { return v }

func UUIDString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	return id.String()
}

// WaitMinutes = orang antre x detik layanan / loket, dibulatkan ke atas.
func WaitMinutes(waiting, serviceSeconds, counters int32) int32 {
	if counters <= 0 {
		return 0
	}
	seconds := float64(waiting) * float64(serviceSeconds) / float64(counters)
	return int32(math.Ceil(seconds / 60))
}

// CountersNeeded: loket minimum supaya tunggu di bawah WaitLimitMinutes.
func CountersNeeded(waiting, serviceSeconds int32) int32 {
	if waiting <= 0 {
		return 1
	}
	need := math.Ceil(float64(waiting) * float64(serviceSeconds) / 60 / WaitLimitMinutes)
	if need < 1 {
		return 1
	}
	return int32(need)
}
