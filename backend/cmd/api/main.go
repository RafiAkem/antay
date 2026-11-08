package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/RafiAkem/antay/backend/internal/analytics"
	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/auth"
	"github.com/RafiAkem/antay/backend/internal/config"
	"github.com/RafiAkem/antay/backend/internal/db"
	"github.com/RafiAkem/antay/backend/internal/health"
	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/RafiAkem/antay/backend/internal/operational"
	"github.com/RafiAkem/antay/backend/internal/public"
	"github.com/RafiAkem/antay/backend/internal/store"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	if err := run(log); err != nil {
		log.Error("server berhenti", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		return err
	}
	if cfg.AutoMigrate {
		if err := db.Migrate(ctx, pool); err != nil {
			return err
		}
	}

	authSvc, err := auth.New(cfg.JWTPrivatePEM, cfg.JWTPublicPEM, cfg.SessionTTL, cfg.CookieSecure)
	if err != nil {
		return err
	}

	deps := app.Deps{
		Store:   store.New(pool),
		Pool:    pool,
		Auth:    authSvc,
		Now:     time.Now,
		Version: cfg.Version,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		httpx.OK(w, r, "Antay API", map[string]string{"service": "antay-api", "version": cfg.Version})
	})
	// Klien memanggil ini sekali sebelum menulis, lalu mengirim tokennya balik.
	mux.HandleFunc("GET /csrf", func(w http.ResponseWriter, r *http.Request) {
		authSvc.IssueCSRF(w)
		httpx.NoContent(w)
	})

	health.New(pool, cfg.Version).Register(mux)
	public.New(deps).Register(mux)
	operational.New(deps).Register(mux, authSvc.Middleware)
	analytics.New(deps).Register(mux, authSvc.Middleware)

	handler := httpx.WithOptions(auth.Chain(mux,
		httpx.RequestID,
		httpx.LogRequests(log),
		httpx.Recover(log),
		auth.CSRFMiddleware,
	), httpx.Options{Version: cfg.Version, Now: time.Now})

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("antay api jalan", "addr", cfg.Addr, "version", cfg.Version)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		log.Info("mematikan server, menunggu request selesai")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return server.Shutdown(shutdownCtx)
	}
}
