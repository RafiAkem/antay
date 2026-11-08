SHELL := /bin/sh
DATABASE_URL ?= postgres://antay:antay@127.0.0.1:5432/antay?sslmode=disable

.PHONY: db-up db-down seed api web build test lint sqlc

db-up:
	docker compose up -d db

db-down:
	docker compose down

# Migrasi ikut jalan otomatis saat seed atau api start (AUTO_MIGRATE=true).
seed:
	cd backend && DATABASE_URL="$(DATABASE_URL)" go run ./cmd/seed

api:
	cd backend && DATABASE_URL="$(DATABASE_URL)" go run ./cmd/api

web:
	cd frontend && npm run dev

build:
	cd backend && go build -o ../bin/antay-api ./cmd/api
	cd frontend && npm run build

test:
	cd backend && go test ./...
	cd frontend && npm run build

lint:
	cd backend && go vet ./...
	cd frontend && npm run lint

sqlc:
	cd backend && sqlc generate
