package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/RafiAkem/antay/backend/internal/application/identity"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const msgNoSession = "Sesi tidak ditemukan. Masuk dulu."

type Auth struct {
	identity *identity.Service
	sessions *middleware.Sessions
}

func NewAuth(id *identity.Service, sessions *middleware.Sessions) *Auth {
	return &Auth{identity: id, sessions: sessions}
}

// CSRF dipanggil klien sekali sebelum menulis, lalu tokennya dikirim balik.
func (h *Auth) CSRF(w http.ResponseWriter, _ *http.Request) {
	h.sessions.IssueCSRF(w)
	response.NoContent(w)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Auth) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}

	var details []response.ErrorDetail
	if strings.TrimSpace(req.Email) == "" {
		details = append(details, response.ErrorDetail{Field: "email", Issue: "wajib diisi"})
	}
	if req.Password == "" {
		details = append(details, response.ErrorDetail{Field: "password", Issue: "wajib diisi"})
	}
	if len(details) > 0 {
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Email dan kata sandi wajib diisi.", details)
		return
	}

	u, token, err := h.identity.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, identity.ErrInvalidCredentials) {
			response.Fail(w, r, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email atau kata sandi salah.")
			return
		}
		response.Internal(w, r)
		return
	}
	h.sessions.SetCookie(w, token)
	response.OK(w, r, "Berhasil masuk.", map[string]any{"user": dto.UserOf(u)})
}

func (h *Auth) Logout(w http.ResponseWriter, _ *http.Request) {
	h.sessions.ClearCookie(w)
	response.NoContent(w)
}

func (h *Auth) Me(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.SessionFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return
	}
	u, err := h.identity.Current(r.Context(), session)
	if err != nil {
		if errors.Is(err, user.ErrNotFound) {
			response.Unauthorized(w, r, "Sesi sudah tidak berlaku. Masuk lagi.")
			return
		}
		response.Internal(w, r)
		return
	}
	response.OK(w, r, "Data pengguna.", map[string]any{"user": dto.UserOf(u)})
}
