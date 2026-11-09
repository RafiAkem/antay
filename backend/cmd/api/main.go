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

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/RafiAkem/antay/backend/internal/application/booking"
	"github.com/RafiAkem/antay/backend/internal/application/catalog"
	"github.com/RafiAkem/antay/backend/internal/application/counter"
	"github.com/RafiAkem/antay/backend/internal/application/identity"
	"github.com/RafiAkem/antay/backend/internal/application/reporting"
	"github.com/RafiAkem/antay/backend/internal/application/scheduling"
	"github.com/RafiAkem/antay/backend/internal/domain/shared"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/config"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/security"
	httpapi "github.com/RafiAkem/antay/backend/internal/interfaces/http"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/handler"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
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

	pool, err := postgres.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		return err
	}
	if cfg.AutoMigrate {
		if err := postgres.Migrate(ctx, pool); err != nil {
			return err
		}
	}

	api, err := buildHandler(cfg, pool, log)
	if err != nil {
		return err
	}

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api,
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

// buildHandler adalah composition root: repository infrastruktur dirangkai ke
// service application, lalu service ke handler HTTP.
func buildHandler(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger) (http.Handler, error) {
	tokens, err := security.NewTokenService(cfg.JWTPrivatePEM, cfg.SessionTTL)
	if err != nil {
		return nil, err
	}
	sessions := middleware.NewSessions(tokens, cfg.CookieSecure)

	q := store.New(pool)
	events := postgres.NewEventRepo(q)
	tickets := postgres.NewTicketRepo(pool, q)
	users := postgres.NewUserRepo(q)
	clock := shared.Clock(time.Now)

	return httpapi.NewRouter(
		httpapi.Config{Version: cfg.Version, Log: log, Sessions: sessions},
		httpapi.Handlers{
			Health: handler.NewHealth(pool, cfg.Version),
			Auth:   handler.NewAuth(identity.New(users, security.Bcrypt{}, tokens), sessions),
			Public: handler.NewPublic(
				catalog.New(events, clock),
				booking.New(events, tickets, clock),
			),
			Counter:    handler.NewCounter(counter.New(events, tickets, clock)),
			Scheduling: handler.NewScheduling(scheduling.New(events, clock)),
			Reporting:  handler.NewReporting(reporting.New(events, postgres.NewReportingReadModel(q), clock)),
		},
	), nil
}
