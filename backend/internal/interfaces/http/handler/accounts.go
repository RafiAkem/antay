package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/accounts"
	"github.com/RafiAkem/antay/backend/internal/domain/organizer"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/middleware"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

const (
	msgOrganizerNotFound = "Penyelenggara tidak ditemukan."
	msgAccountNotFound   = "Akun tidak ditemukan."
)

// Accounts melayani panel admin untuk penyelenggara dan akun internal.
type Accounts struct {
	accounts *accounts.Service
}

func NewAccounts(svc *accounts.Service) *Accounts { return &Accounts{accounts: svc} }

func (h *Accounts) ListOrganizers(w http.ResponseWriter, r *http.Request) {
	list, err := h.accounts.ListOrganizers(r.Context())
	if err != nil {
		response.Internal(w, r)
		return
	}
	response.OK(w, r, "Daftar penyelenggara.", map[string]any{"organizers": dto.OrganizersOf(list)})
}

type createOrganizerRequest struct {
	Name         string `json:"name"`
	ContactEmail string `json:"contactEmail"`
	ContactPhone string `json:"contactPhone"`
}

func (h *Accounts) CreateOrganizer(w http.ResponseWriter, r *http.Request) {
	var req createOrganizerRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", msgAccountBadBody)
		return
	}
	o, err := h.accounts.CreateOrganizer(r.Context(), organizer.Draft{
		Name: req.Name, ContactEmail: req.ContactEmail, ContactPhone: req.ContactPhone,
	})
	if err != nil {
		writeContactErr(w, r, err)
		return
	}
	response.Created(w, r, "Penyelenggara ditambahkan.", map[string]any{"organizer": dto.OrganizerOf(o)})
}

type updateOrganizerRequest struct {
	Name         *string `json:"name"`
	ContactEmail *string `json:"contactEmail"`
	ContactPhone *string `json:"contactPhone"`
	IsActive     *bool   `json:"isActive"`
}

func (h *Accounts) UpdateOrganizer(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("organizerId"))
	if err != nil {
		response.NotFound(w, r, msgOrganizerNotFound)
		return
	}
	var req updateOrganizerRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", msgAccountBadBody)
		return
	}
	o, err := h.accounts.UpdateOrganizer(r.Context(), id, organizer.Patch{
		Name: req.Name, ContactEmail: req.ContactEmail, ContactPhone: req.ContactPhone, IsActive: req.IsActive,
	})
	if errors.Is(err, organizer.ErrNotFound) {
		response.NotFound(w, r, msgOrganizerNotFound)
		return
	}
	if err != nil {
		writeContactErr(w, r, err)
		return
	}
	response.OK(w, r, "Penyelenggara diperbarui.", map[string]any{"organizer": dto.OrganizerOf(o)})
}

func (h *Accounts) ListUsers(w http.ResponseWriter, r *http.Request) {
	list, err := h.accounts.ListUsers(r.Context())
	if err != nil {
		response.Internal(w, r)
		return
	}
	response.OK(w, r, "Daftar akun internal.", map[string]any{"users": dto.ManagedUsersOf(list)})
}

type createUserRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	Name        string  `json:"name"`
	Role        string  `json:"role"`
	OrganizerID *string `json:"organizerId"`
}

func (h *Accounts) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", msgAccountBadBody)
		return
	}
	u, err := h.accounts.CreateUser(r.Context(), accounts.NewUser{
		Email: req.Email, Password: req.Password, Name: req.Name, Role: req.Role, OrganizerID: req.OrganizerID,
	})
	switch {
	case errors.Is(err, accounts.ErrEmailTaken):
		response.Fail(w, r, http.StatusConflict, "EMAIL_TAKEN", "Email ini sudah dipakai akun lain.")
		return
	case errors.Is(err, accounts.ErrOrganizerInvalid):
		response.FailDetails(w, r, http.StatusUnprocessableEntity, "ORGANIZER_INVALID",
			"Penyelenggara tidak ditemukan atau sudah nonaktif.",
			[]response.ErrorDetail{{Field: "organizerId", Issue: "tidak ada atau nonaktif"}})
		return
	case err != nil:
		writeContactErr(w, r, err)
		return
	}
	response.Created(w, r, "Akun ditambahkan.", map[string]any{"user": dto.ManagedUserOf(u)})
}

type updateUserRequest struct {
	Name     *string `json:"name"`
	IsActive *bool   `json:"isActive"`
	Password *string `json:"password"`
}

func (h *Accounts) UpdateUser(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.SessionFrom(r.Context())
	if !ok {
		response.Unauthorized(w, r, msgNoSession)
		return
	}
	id, err := uuid.Parse(r.PathValue("userId"))
	if err != nil {
		response.NotFound(w, r, msgAccountNotFound)
		return
	}
	var req updateUserRequest
	if err := response.Decode(w, r, &req); err != nil {
		response.Fail(w, r, http.StatusBadRequest, "VALIDATION", msgAccountBadBody)
		return
	}
	u, err := h.accounts.UpdateUser(r.Context(), session.UserID, id, accounts.UserPatch{
		Name: req.Name, IsActive: req.IsActive, Password: req.Password,
	})
	switch {
	case errors.Is(err, accounts.ErrUserNotFound):
		response.NotFound(w, r, msgAccountNotFound)
		return
	case errors.Is(err, accounts.ErrSelfDeactivate):
		response.Unprocessable(w, r, "CANNOT_DEACTIVATE_SELF", "Akun yang sedang dipakai tidak bisa dinonaktifkan.")
		return
	case err != nil:
		writeContactErr(w, r, err)
		return
	}
	response.OK(w, r, "Akun diperbarui.", map[string]any{"user": dto.ManagedUserOf(u)})
}
