package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const (
	serviceName  = "antay-api"
	readyTimeout = 2 * time.Second
)

type Pinger interface {
	Ping(ctx context.Context) error
}

// Health memisahkan probe sesuai keputusan yang dipicunya: liveness tidak
// menyentuh database, readiness melakukannya.
type Health struct {
	db      Pinger
	version string
}

func NewHealth(db Pinger, version string) *Health {
	return &Health{db: db, version: version}
}

// Root menjawab GET / supaya mudah mengecek API hidup dari browser.
func (h *Health) Root(w http.ResponseWriter, r *http.Request) {
	response.OK(w, r, "Antay API", map[string]string{"service": serviceName, "version": h.version})
}

type checkResponse struct {
	Status    string            `json:"status"`
	Service   string            `json:"service"`
	Version   string            `json:"version"`
	Timestamp string            `json:"timestamp"`
	Checks    map[string]string `json:"checks,omitempty"`
}

func writeCheck(w http.ResponseWriter, status int, body checkResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func nowStamp() string { return time.Now().In(shared.Jakarta).Format(time.RFC3339) }

func (h *Health) Live(w http.ResponseWriter, _ *http.Request) {
	writeCheck(w, http.StatusOK, checkResponse{
		Status: "UP", Service: serviceName, Version: h.version, Timestamp: nowStamp(),
	})
}

func (h *Health) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), readyTimeout)
	defer cancel()

	dbStatus, overall, status := "UP", "UP", http.StatusOK
	if err := h.db.Ping(ctx); err != nil {
		dbStatus, overall, status = "DOWN", "DOWN", http.StatusServiceUnavailable
	}
	writeCheck(w, status, checkResponse{
		Status:    overall,
		Service:   serviceName,
		Version:   h.version,
		Timestamp: nowStamp(),
		Checks:    map[string]string{"database": dbStatus},
	})
}
