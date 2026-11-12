package dto

import (
	"github.com/RafiAkem/antay/backend/internal/domain/contact"
	"github.com/RafiAkem/antay/backend/internal/domain/customer"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// Customer adalah profil pembeli. Status aktif tidak dikirim karena pembeli
// nonaktif memang tidak pernah sampai melihat profilnya.
type Customer struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

func CustomerOf(c customer.Customer) Customer {
	return Customer{ID: c.ID.String(), Email: c.Email, Name: c.Name, Phone: c.Phone}
}

// ContactIssueDetails padanan FieldDetails untuk validasi akun dan kontak.
func ContactIssueDetails(issues []contact.FieldIssue) []response.ErrorDetail {
	out := make([]response.ErrorDetail, 0, len(issues))
	for _, i := range issues {
		out = append(out, response.ErrorDetail{Field: i.Field, Issue: i.Issue})
	}
	return out
}
