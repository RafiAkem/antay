package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config dibaca sekali saat start. Semua nilai bisa ditimpa lewat environment.
type Config struct {
	Addr          string
	DatabaseURL   string
	SessionTTL    time.Duration
	JWTPrivatePEM string
	JWTPublicPEM  string
	CookieSecure  bool
	Version       string
	AutoMigrate   bool
}

func Load() Config {
	loadDotEnv(".env")
	return Config{
		Addr:          env("ADDR", ":8080"),
		DatabaseURL:   env("DATABASE_URL", "postgres://antay:antay@127.0.0.1:5432/antay?sslmode=disable"),
		SessionTTL:    durationEnv("SESSION_TTL", 15*time.Minute),
		JWTPrivatePEM: os.Getenv("JWT_PRIVATE_KEY_PEM"),
		JWTPublicPEM:  os.Getenv("JWT_PUBLIC_KEY_PEM"),
		CookieSecure:  boolEnv("COOKIE_SECURE", false),
		Version:       env("APP_VERSION", "dev"),
		AutoMigrate:   boolEnv("AUTO_MIGRATE", true),
	}
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func boolEnv(key string, fallback bool) bool {
	v, err := strconv.ParseBool(strings.TrimSpace(os.Getenv(key)))
	if err != nil {
		return fallback
	}
	return v
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	v, err := time.ParseDuration(strings.TrimSpace(os.Getenv(key)))
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

// loadDotEnv cukup untuk file KEY=VALUE sederhana; nilai yang sudah ada di
// environment tidak ditimpa supaya container tetap bisa override.
func loadDotEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if os.Getenv(key) == "" {
			_ = os.Setenv(key, value)
		}
	}
}
