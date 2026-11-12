package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/RafiAkem/antay/backend/internal/application/customeraccount"
	"github.com/RafiAkem/antay/backend/internal/domain/contact"
	"github.com/RafiAkem/antay/backend/internal/domain/customer"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const (
	msgAccountBadBody    = "Body permintaan tidak valid."
	msgCustomerGone      = "Sesi sudah tidak berlaku. Masuk lagi."
	msgCustomerInvalidIn = "Periksa lagi isian yang ditandai."
)

// CustomerAuth melayani akun pembeli di /customer/v1.
type CustomerAuth struct {
	accounts *customeraccount.Service
	sessions *middleware.CustomerSessions
}

func NewCustomerAuth(accounts *customeraccount.Service, sessions *middleware.CustomerSessions) *CustomerAuth {
	return &CustomerAuth{accounts: accounts, sessions: sessions}
}

type customerRegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Phone    string `json:"phone"`
}

func (h *CustomerAuth) Register(w http.ResponseWriter, r *http.Request) {
	var req customerRegisterRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", msgAccountBadBody)
		return
	}
	c, token, err := h.accounts.Register(r.Context(), customer.Registration{
		Email: req.Email, Password: req.Password, Name: req.Name, Phone: req.Phone,
	})
	if err != nil {
		if errors.Is(err, customer.ErrEmailTaken) {
			response.Fail(w, r, http.StatusConflict, "EMAIL_TAKEN", "Email ini sudah terdaftar. Coba masuk, atau pakai email lain.")
			return
		}
		writeContactErr(w, r, err)
		return
	}
	h.sessions.SetCookie(w, token)
	response.Created(w, r, "Akun berhasil dibuat.", map[string]any{"customer": dto.CustomerOf(c)})
}

type customerLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *CustomerAuth) Login(w http.ResponseWriter, r *http.Request) {
	var req customerLoginRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", msgAccountBadBody)
		return
	}
	var issues contact.Issues
	if strings.TrimSpace(req.Email) == "" {
		issues.Add("email", contact.IssueRequired)
	}
	if req.Password == "" {
		issues.Add("password", contact.IssueRequired)
	}
	if len(issues) > 0 {
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Email dan kata sandi wajib diisi.",
			dto.ContactIssueDetails(issues))
		return
	}
	c, token, err := h.accounts.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, customeraccount.ErrInvalidCredentials) {
			response.Fail(w, r, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email atau kata sandi salah.")
			return
		}
		response.Internal(w, r)
		return
	}
	h.sessions.SetCookie(w, token)
	response.OK(w, r, "Berhasil masuk.", map[string]any{"customer": dto.CustomerOf(c)})
}

// Logout tidak butuh sesi valid: cookie yang sudah kedaluwarsa pun tetap
// perlu dibersihkan dari browser.
func (h *CustomerAuth) Logout(w http.ResponseWriter, _ *http.Request) {
	h.sessions.ClearCookie(w)
	response.NoContent(w)
}

func (h *CustomerAuth) Me(w http.ResponseWriter, r *http.Request) {
	id, ok := middleware.CustomerFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return
	}
	c, err := h.accounts.Get(r.Context(), id)
	if err != nil {
		h.writeLookupErr(w, r, err)
		return
	}
	response.OK(w, r, "Profil pembeli.", map[string]any{"customer": dto.CustomerOf(c)})
}

type customerProfileRequest struct {
	Name  *string `json:"name"`
	Phone *string `json:"phone"`
}

func (h *CustomerAuth) UpdateMe(w http.ResponseWriter, r *http.Request) {
	id, ok := middleware.CustomerFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return
	}
	var req customerProfileRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", msgAccountBadBody)
		return
	}
	c, err := h.accounts.UpdateProfile(r.Context(), id, customer.ProfileUpdate{Name: req.Name, Phone: req.Phone})
	if err != nil {
		h.writeLookupErr(w, r, err)
		return
	}
	response.OK(w, r, "Profil diperbarui.", map[string]any{"customer": dto.CustomerOf(c)})
}

// writeLookupErr: akun yang hilang atau nonaktif dijawab 401 supaya frontend
// membuang sesinya, sama seperti /operational/v1/auth/me.
func (h *CustomerAuth) writeLookupErr(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, customer.ErrNotFound) {
		h.sessions.ClearCookie(w)
		response.Unauthorized(w, r, msgCustomerGone)
		return
	}
	writeContactErr(w, r, err)
}

// writeContactErr menjawab 400 VALIDATION untuk *contact.ValidationError, 500 untuk sisanya.
func writeContactErr(w http.ResponseWriter, r *http.Request, err error) {
	var verr *contact.ValidationError
	if errors.As(err, &verr) {
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", msgCustomerInvalidIn,
			dto.ContactIssueDetails(verr.Issues))
		return
	}
	response.Internal(w, r)
}
