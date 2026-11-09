package response

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"
)

type ctxKey int

const traceKey ctxKey = 1

// Meta ikut di setiap respons sukses, sesuai standar envelope internal.
type Meta struct {
	Timestamp string `json:"timestamp"`
	Version   string `json:"version"`
}

type Envelope struct {
	Message string `json:"message"`
	Data    any    `json:"data"`
	Meta    Meta   `json:"meta"`
}

type ErrorDetail struct {
	Field string `json:"field"`
	Issue string `json:"issue"`
}

type ErrorBody struct {
	Message string        `json:"message"`
	Code    string        `json:"code"`
	TraceID string        `json:"traceId"`
	Details []ErrorDetail `json:"details,omitempty"`
}

type errorResponse struct {
	Error ErrorBody `json:"error"`
}

// Options dibawa lewat context supaya handler tidak perlu mengoper version terus.
type Options struct {
	Version string
	Now     func() time.Time
}

type optionsKey struct{}

func WithOptions(next http.Handler, opts Options) http.Handler {
	if opts.Now == nil {
		opts.Now = time.Now
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), optionsKey{}, opts)))
	})
}

func optionsOf(r *http.Request) Options {
	if opts, ok := r.Context().Value(optionsKey{}).(Options); ok {
		return opts
	}
	return Options{Version: "dev", Now: time.Now}
}

func TraceID(r *http.Request) string {
	if id, ok := r.Context().Value(traceKey).(string); ok {
		return id
	}
	return ""
}

// WithTraceID dipasang middleware RequestID; respons error mengutipnya.
func WithTraceID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, traceKey, id)
}

func OK(w http.ResponseWriter, r *http.Request, message string, data any) {
	JSON(w, r, http.StatusOK, message, data)
}

func Created(w http.ResponseWriter, r *http.Request, message string, data any) {
	JSON(w, r, http.StatusCreated, message, data)
}

func JSON(w http.ResponseWriter, r *http.Request, status int, message string, data any) {
	opts := optionsOf(r)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Envelope{
		Message: message,
		Data:    data,
		Meta:    Meta{Timestamp: opts.Now().Format(time.RFC3339), Version: opts.Version},
	})
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func Fail(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	FailDetails(w, r, status, code, message, nil)
}

func FailDetails(w http.ResponseWriter, r *http.Request, status int, code, message string, details []ErrorDetail) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorResponse{Error: ErrorBody{
		Message: message,
		Code:    code,
		TraceID: TraceID(r),
		Details: details,
	}})
}

// Decode membaca body JSON dan menolak key yang tidak dikenal, supaya salah tulis
// nama field langsung terlihat alih-alih diam-diam diabaikan.
func Decode(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("body hanya boleh berisi satu objek JSON")
	}
	return nil
}

func BadRequest(w http.ResponseWriter, r *http.Request, message string) {
	Fail(w, r, http.StatusBadRequest, "BAD_REQUEST", message)
}

func Unauthorized(w http.ResponseWriter, r *http.Request, message string) {
	Fail(w, r, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(w http.ResponseWriter, r *http.Request, message string) {
	Fail(w, r, http.StatusForbidden, "FORBIDDEN", message)
}

func NotFound(w http.ResponseWriter, r *http.Request, message string) {
	Fail(w, r, http.StatusNotFound, "NOT_FOUND", message)
}

func Conflict(w http.ResponseWriter, r *http.Request, message string) {
	Fail(w, r, http.StatusConflict, "CONFLICT", message)
}

func Unprocessable(w http.ResponseWriter, r *http.Request, code, message string) {
	Fail(w, r, http.StatusUnprocessableEntity, code, message)
}

func Internal(w http.ResponseWriter, r *http.Request) {
	Fail(w, r, http.StatusInternalServerError, "INTERNAL", "Terjadi kesalahan di server. Coba lagi sebentar lagi.")
}
