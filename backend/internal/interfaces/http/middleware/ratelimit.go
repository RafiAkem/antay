package middleware

import (
	"math"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// maxTrackedClients membatasi memori: bila penuh, jendela yang sudah habis dibuang;
// bila masih penuh juga, semua hitungan direset.
const maxTrackedClients = 10000

// RateLimit membatasi jumlah request per IP klien dalam satu jendela waktu tetap.
// shortcut: hitungan disimpan di memori satu proses; kalau API jalan lebih dari satu instance, pindahkan ke Postgres atau Redis.
type RateLimit struct {
	max    int
	window time.Duration
	now    func() time.Time

	mu   sync.Mutex
	hits map[string]hitWindow
}

type hitWindow struct {
	start time.Time
	count int
}

func NewRateLimit(max int, window time.Duration) *RateLimit {
	return &RateLimit{max: max, window: window, now: time.Now, hits: map[string]hitWindow{}}
}

// allow mencatat satu request. Bila kuota habis, mengembalikan sisa waktu tunggu.
func (l *RateLimit) allow(key string) (time.Duration, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	w := l.hits[key]
	if now.Sub(w.start) >= l.window {
		if len(l.hits) >= maxTrackedClients {
			for k, old := range l.hits {
				if now.Sub(old.start) >= l.window {
					delete(l.hits, k)
				}
			}
			if len(l.hits) >= maxTrackedClients {
				// shortcut: reset total; penyerang dengan 10.000 IP aktif memang sudah lolos batas per IP. Ganti ke LRU bila perlu adil.
				clear(l.hits)
			}
		}
		w = hitWindow{start: now}
	}
	if w.count >= l.max {
		return w.start.Add(l.window).Sub(now), false
	}
	w.count++
	l.hits[key] = w
	return 0, true
}

// Middleware menjawab 429 dengan Retry-After bila IP ini melewati batas.
func (l *RateLimit) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := ClientIP(r)
		if ip == "" {
			// IP asli tidak diketahui: lebih baik tanpa batas daripada semua pengunjung berbagi satu kuota.
			next.ServeHTTP(w, r)
			return
		}
		if wait, ok := l.allow(ip); !ok {
			w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(wait.Seconds()))))
			response.Fail(w, r, http.StatusTooManyRequests, "RATE_LIMITED",
				"Terlalu banyak percobaan dari jaringan ini. Coba lagi dalam beberapa menit.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ClientIP mengambil IP klien. X-Real-IP dan X-Forwarded-For hanya dipercaya bila
// koneksi datang dari loopback atau jaringan privat (nginx di mesin yang sama, di
// container lain, atau di host internal), karena klien dari internet bisa
// memalsukannya. Hasil kosong berarti di balik proxy tanpa header tersebut.
// Alamat IPv6 dipotong ke /64 karena satu pelanggan biasanya memegang satu /64 penuh.
func ClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	peer := net.ParseIP(host)
	if peer == nil {
		return ""
	}
	if !peer.IsLoopback() && !peer.IsPrivate() {
		return keyOf(peer)
	}
	if ip := net.ParseIP(strings.TrimSpace(r.Header.Get("X-Real-IP"))); ip != nil {
		return keyOf(ip)
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		// Entri terakhir ditambahkan nginx sendiri; entri sebelumnya bisa dikarang klien.
		if ip := net.ParseIP(strings.TrimSpace(parts[len(parts)-1])); ip != nil {
			return keyOf(ip)
		}
	}
	return ""
}

func keyOf(ip net.IP) string {
	if v4 := ip.To4(); v4 != nil {
		return v4.String()
	}
	return ip.Mask(net.CIDRMask(64, 128)).String() + "/64"
}
