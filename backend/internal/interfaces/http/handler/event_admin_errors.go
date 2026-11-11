package handler

import (
	"errors"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/application/eventadmin"
	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/dto"
	"github.com/RafiAkem/antay/backend/internal/interfaces/http/response"
)

// writeManageErr memetakan semua error modul kelola event ke satu tempat,
// supaya kode error yang dipakai frontend untuk bercabang tidak tercecer.
func writeManageErr(w http.ResponseWriter, r *http.Request, err error) {
	var (
		invalid    eventadmin.ValidationError
		locked     eventadmin.NotEditableError
		incomplete eventadmin.IncompleteError
	)
	switch {
	case errors.Is(err, event.ErrNotFound):
		response.NotFound(w, r, "Event tidak ditemukan.")
	case errors.Is(err, eventadmin.ErrCategoryNotFound):
		response.NotFound(w, r, "Kategori tidak ditemukan.")
	case errors.Is(err, eventadmin.ErrPackageNotFound):
		response.NotFound(w, r, "Paket tidak ditemukan.")
	case errors.As(err, &invalid):
		writeScheduleIssues(w, r, invalid.Validation)
	case errors.As(err, &locked):
		details := make([]response.ErrorDetail, 0, len(locked.Fields))
		for _, f := range locked.Fields {
			details = append(details, response.ErrorDetail{Field: f, Issue: "tidak bisa diubah setelah event tayang"})
		}
		response.FailDetails(w, r, http.StatusUnprocessableEntity, "EVENT_NOT_EDITABLE",
			"Event pada status ini tidak bisa diubah.", details)
	case errors.As(err, &incomplete):
		response.FailDetails(w, r, http.StatusUnprocessableEntity, "EVENT_INCOMPLETE",
			"Event belum lengkap untuk diajukan.", dto.FieldDetails(incomplete.Issues))
	case errors.Is(err, event.ErrInvalidStatus):
		response.Fail(w, r, http.StatusConflict, "INVALID_STATUS", "Status event sudah tidak cocok untuk tindakan ini. Muat ulang halaman.")
	case errors.Is(err, event.ErrRejectionReason):
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Alasan penolakan wajib diisi.",
			[]response.ErrorDetail{{Field: "reason", Issue: "harus 3 sampai 300 karakter"}})
	case errors.Is(err, eventadmin.ErrOrganizerInvalid):
		response.Unprocessable(w, r, "ORGANIZER_INVALID", "Penyelenggara tidak ditemukan atau sudah nonaktif.")
	case errors.Is(err, event.ErrPrefixTaken):
		response.Conflict(w, r, "Prefix event untuk tanggal ini sudah dipakai. Pilih nama lain.")
	case errors.Is(err, eventadmin.ErrCategoryHasSeats):
		response.Fail(w, r, http.StatusConflict, "CATEGORY_HAS_SEATS", "Kategori ini sudah punya denah kursi. Hapus blok kursinya dulu.")
	case errors.Is(err, eventadmin.ErrCategoryNameTaken):
		response.Fail(w, r, http.StatusConflict, "CATEGORY_NAME_TAKEN", "Nama kategori sudah dipakai di event ini.")
	case errors.Is(err, eventadmin.ErrPackageNameTaken):
		response.Fail(w, r, http.StatusConflict, "PACKAGE_NAME_TAKEN", "Nama paket sudah dipakai di kategori ini.")
	case errors.Is(err, eventadmin.ErrSold):
		response.Fail(w, r, http.StatusConflict, "ALREADY_SOLD", "Sudah ada tiket terjual, jadi perubahan ini tidak diizinkan.")
	case errors.Is(err, eventadmin.ErrForbidden):
		response.Forbidden(w, r, "Akun ini tidak punya akses ke tindakan tersebut.")
	case errors.Is(err, eventadmin.ErrBadStatusFilter):
		response.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "Filter status tidak dikenal.",
			[]response.ErrorDetail{{Field: "status", Issue: "pilih draft, review, published, closed, atau cancelled"}})
	default:
		response.Internal(w, r)
	}
}
