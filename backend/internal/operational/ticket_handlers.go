package operational

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/auth"
	"github.com/RafiAkem/antay/backend/internal/httpx"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type ticketCheck struct {
	Timing          string `json:"timing"`
	WrongEvent      bool   `json:"wrongEvent"`
	AlreadyRedeemed bool   `json:"alreadyRedeemed"`
	CanRedeem       bool   `json:"canRedeem"`
}

func (h *Handler) lookupTicket(w http.ResponseWriter, r *http.Request) {
	row, ok := h.ticketFromPath(w, r)
	if !ok {
		return
	}

	wrongEvent := false
	if raw := r.URL.Query().Get("eventId"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			httpx.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "eventId tidak valid.",
				[]httpx.ErrorDetail{{Field: "eventId", Issue: "harus UUID"}})
			return
		}
		wrongEvent = id != row.EventID
	}

	httpx.OK(w, r, "Tiket ditemukan.", map[string]any{
		"ticket": app.BuildTicket(ticketFromRow(row), eventFromTicketRow(row)),
		"check": ticketCheck{
			Timing:          classifyTiming(h.deps.NowMinutes(), row.SlotStart, row.SlotMinutes, row.Status),
			WrongEvent:      wrongEvent,
			AlreadyRedeemed: row.Status == "redeemed",
			CanRedeem:       row.Status == "booked" && !wrongEvent,
		},
	})
}

type redeemRequest struct {
	EventID    string `json:"eventId"`
	Counter    int32  `json:"counter"`
	KTPChecked bool   `json:"ktpChecked"`
}

func (h *Handler) redeemTicket(w http.ResponseWriter, r *http.Request) {
	var req redeemRequest
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.Fail(w, r, http.StatusBadRequest, "VALIDATION", "Body permintaan tidak valid.")
		return
	}
	if !req.KTPChecked {
		httpx.Unprocessable(w, r, "KTP_REQUIRED", "KTP harus diperiksa dan dicentang dulu.")
		return
	}

	eventID, err := uuid.Parse(req.EventID)
	if err != nil {
		httpx.FailDetails(w, r, http.StatusBadRequest, "VALIDATION", "eventId tidak valid.",
			[]httpx.ErrorDetail{{Field: "eventId", Issue: "harus UUID"}})
		return
	}

	row, ok := h.ticketFromPath(w, r)
	if !ok {
		return
	}
	if row.EventID != eventID {
		httpx.Fail(w, r, http.StatusConflict, "WRONG_EVENT", "Tiket ini milik event lain.")
		return
	}
	if req.Counter < 1 || req.Counter > row.CounterCount {
		httpx.Fail(w, r, http.StatusUnprocessableEntity, "INVALID_COUNTER",
			fmt.Sprintf("Loket harus antara 1 dan %d.", row.CounterCount))
		return
	}

	claims, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Unauthorized(w, r, "Sesi tidak ditemukan. Masuk dulu.")
		return
	}

	ticket, err := h.deps.Store.RedeemTicket(r.Context(), store.RedeemTicketParams{
		RedeemedBy:      pgtype.UUID{Bytes: claims.UserID, Valid: true},
		RedeemedCounter: &req.Counter,
		Code:            row.Code,
		EventID:         eventID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			h.explainRedeemFailure(w, r)
			return
		}
		httpx.Internal(w, r)
		return
	}

	httpx.OK(w, r, "Tiket berhasil ditukar.", map[string]any{
		"ticket": app.BuildTicket(ticket, eventFromTicketRow(row)),
	})
}

// Nol baris dari UPDATE bisa berarti tiket sudah ditukar atau statusnya bukan
// booked. Membaca ulang membuat pesannya tepat, termasuk saat dua loket
// menukar tiket yang sama hampir bersamaan.
func (h *Handler) explainRedeemFailure(w http.ResponseWriter, r *http.Request) {
	row, err := h.deps.Store.GetTicketByCode(r.Context(), normalizeCode(r.PathValue("code")))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Tiket dengan kode itu tidak ditemukan.")
			return
		}
		httpx.Internal(w, r)
		return
	}
	if row.Status == "redeemed" {
		httpx.Fail(w, r, http.StatusConflict, "ALREADY_REDEEMED", "Tiket ini sudah ditukar.")
		return
	}
	httpx.Fail(w, r, http.StatusConflict, "NOT_BOOKED", "Tiket ini tidak dalam status yang bisa ditukar.")
}

func (h *Handler) ticketFromPath(w http.ResponseWriter, r *http.Request) (store.GetTicketByCodeRow, bool) {
	row, err := h.deps.Store.GetTicketByCode(r.Context(), normalizeCode(r.PathValue("code")))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, r, "Tiket dengan kode itu tidak ditemukan.")
			return store.GetTicketByCodeRow{}, false
		}
		httpx.Internal(w, r)
		return store.GetTicketByCodeRow{}, false
	}
	return row, true
}
