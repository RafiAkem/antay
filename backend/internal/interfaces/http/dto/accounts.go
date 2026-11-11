package dto

import (
	"github.com/RafiAkem/antay/backend/internal/application/accounts"
	"github.com/RafiAkem/antay/backend/internal/domain/organizer"
)

type Organizer struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	ContactEmail string `json:"contactEmail"`
	ContactPhone string `json:"contactPhone"`
	IsActive     bool   `json:"isActive"`
}

func OrganizerOf(o organizer.Organizer) Organizer {
	return Organizer{
		ID:           o.ID.String(),
		Name:         o.Name,
		ContactEmail: o.ContactEmail,
		ContactPhone: o.ContactPhone,
		IsActive:     o.IsActive,
	}
}

func OrganizersOf(list []organizer.Organizer) []Organizer {
	out := make([]Organizer, 0, len(list))
	for _, o := range list {
		out = append(out, OrganizerOf(o))
	}
	return out
}

// ManagedUser sama dengan User ditambah isActive, khusus untuk panel admin.
type ManagedUser struct {
	User
	IsActive bool `json:"isActive"`
}

func ManagedUserOf(u accounts.User) ManagedUser {
	out := ManagedUser{
		User:     User{ID: u.ID.String(), Email: u.Email, Name: u.Name, Role: u.Role},
		IsActive: u.IsActive,
	}
	if u.OrganizerID != nil {
		id := u.OrganizerID.String()
		out.OrganizerID = &id
	}
	return out
}

func ManagedUsersOf(list []accounts.User) []ManagedUser {
	out := make([]ManagedUser, 0, len(list))
	for _, u := range list {
		out = append(out, ManagedUserOf(u))
	}
	return out
}
