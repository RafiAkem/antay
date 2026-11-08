package health

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool    *pgxpool.Pool
	version string
}

func New(pool *pgxpool.Pool, version string) *Handler {
	return &Handler{pool: pool, version: version}
}

// Register memisahkan probe sesuai keputusan yang dipicunya: liveness tidak
// menyentuh database, readiness melakukannya.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /health/live", h.live)
	mux.HandleFunc("GET /health/ready", h.ready)
	mux.HandleFunc("GET /health/startup", h.ready)
	mux.HandleFunc("GET /health/dependencies", h.dependencies)
}

type checkResponse struct {
	Status    string            `json:"status"`
	Service   string            `json:"service"`
	Version   string            `json:"version"`
	Timestamp string            `json:"timestamp"`
	Checks    map[string]string `json:"checks,omitempty"`
}

func write(w http.ResponseWriter, status int, body checkResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func (h *Handler) live(w http.ResponseWriter, _ *http.Request) {
	write(w, http.StatusOK, checkResponse{Status: "UP", Service: "antay-api", Version: h.version, Timestamp: time.Now().Format(time.RFC3339)})
}

func (h *Handler) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	dbStatus := "UP"
	status := http.StatusOK
	overall := "UP"
	if err := h.pool.Ping(ctx); err != nil {
		dbStatus = "DOWN"
		status = http.StatusServiceUnavailable
		overall = "DOWN"
	}
	write(w, status, checkResponse{
		Status:    overall,
		Service:   "antay-api",
		Version:   h.version,
		Timestamp: time.Now().Format(time.RFC3339),
		Checks:    map[string]string{"database": dbStatus},
	})
}

// dependencies untuk dashboard internal; jangan diekspos ke publik.
func (h *Handler) dependencies(w http.ResponseWriter, r *http.Request) {
	h.ready(w, r)
}
