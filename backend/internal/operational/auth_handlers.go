package operational

import (
	"errors"
	"net/http"
	"strings"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/auth"
	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}

	email := strings.TrimSpace(req.Email)
	var details []httpx.ErrorDetail
	if email == "" {
		details = append(details, httpx.ErrorDetail{Field: "email", Issue: "wajib diisi"})
	}
	if req.Password == "" {
		details = append(details, httpx.ErrorDetail{Field: "password", Issue: "wajib diisi"})
	}
	if len(details) > 0 {
		httpx.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Email dan kata sandi wajib diisi.", details)
		return
	}

	user, err := h.deps.Store.GetUserByEmail(r.Context(), email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			invalidCredentials(w, r)
			return
		}
		httpx.Internal(w, r)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		invalidCredentials(w, r)
		return
	}

	token, err := h.deps.Auth.Sign(user.ID, user.Role)
	if err != nil {
		httpx.Internal(w, r)
		return
	}
	h.deps.Auth.SetSessionCookie(w, token)
	httpx.OK(w, r, "Berhasil masuk.", map[string]any{"user": userDTO(user)})
}

// Pesannya sengaja sama untuk email tidak dikenal maupun kata sandi salah,
// supaya tidak membocorkan email mana yang terdaftar.
func invalidCredentials(w http.ResponseWriter, r *http.Request) {
	httpx.Fail(w, r, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email atau kata sandi salah.")
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	h.deps.Auth.ClearSessionCookie(w)
	httpx.NoContent(w)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Unauthorized(w, r, "Sesi tidak ditemukan. Masuk dulu.")
		return
	}
	user, err := h.deps.Store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.Unauthorized(w, r, "Sesi sudah tidak berlaku. Masuk lagi.")
			return
		}
		httpx.Internal(w, r)
		return
	}
	httpx.OK(w, r, "Data pengguna.", map[string]any{"user": userDTO(user)})
}

func userDTO(u store.User) app.UserDTO {
	return app.UserDTO{ID: u.ID.String(), Email: u.Email, Name: u.Name, Role: u.Role}
}
