package public

import (
	"context"
	"crypto/rand"
	"errors"
	"math/big"
	"strings"
	"unicode/utf8"

	"github.com/RafiAkem/antay/backend/internal/app"
	"github.com/RafiAkem/antay/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	ticketAlphabet  = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	ticketCodeLen   = 4
	maxCodeAttempts = 5
)

var (
	errSlotInvalid = errors.New("slot tidak valid")
	errSlotPast    = errors.New("slot sudah lewat")
	errSlotFull    = errors.New("slot penuh")
	errEventGone   = errors.New("event tidak lagi dibuka")
)

// normalizeVisitorName merapikan spasi berlebih sebelum dihitung, karena nama
// yang diketik cepat sering membawa spasi ganda di ujung.
func normalizeVisitorName(raw string) (string, bool) {
	name := strings.Join(strings.Fields(raw), " ")
	n := utf8.RuneCountInString(name)
	return name, n >= 3 && n <= 60
}

// parseSlot memastikan jam yang dikirim memang batas slot event dan belum
// selesai. Slot yang sedang berjalan masih boleh dipesan.
func parseSlot(ev store.Event, raw string, nowMinutes int32) (int32, error) {
	minutes, err := app.MinutesOf(raw)
	if err != nil || !app.IsSlotStart(ev, minutes) {
		return 0, errSlotInvalid
	}
	if minutes+ev.SlotMinutes <= nowMinutes {
		return 0, errSlotPast
	}
	return minutes, nil
}

// normalizeTicketCode membuat input petugas/pengunjung tahan salah ketik:
// huruf kecil, spasi, dan tanda hubung yang lupa ditulis tetap diterima.
func normalizeTicketCode(raw string) string {
	code := strings.ToUpper(strings.Join(strings.Fields(raw), ""))
	if !strings.Contains(code, "-") && len(code) > 2 {
		code = code[:2] + "-" + code[2:]
	}
	return code
}

func newTicketCode(prefix string) (string, error) {
	var b strings.Builder
	b.Grow(len(prefix) + 1 + ticketCodeLen)
	b.WriteString(prefix)
	b.WriteByte('-')
	for i := 0; i < ticketCodeLen; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(ticketAlphabet))))
		if err != nil {
			return "", err
		}
		b.WriteByte(ticketAlphabet[n.Int64()])
	}
	return b.String(), nil
}

// isDuplicateCode hanya menandai bentrokan kode tiket, bukan pelanggaran unik
// lain, supaya kesalahan data tidak dicoba ulang lima kali dengan sia-sia.
func isDuplicateCode(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
		return false
	}
	return pgErr.ConstraintName == "tickets_code_key"
}

func (h *Handler) slotCounts(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]map[int32]app.SlotCount, error) {
	counts := make(map[uuid.UUID]map[int32]app.SlotCount, len(ids))
	if len(ids) == 0 {
		return counts, nil
	}
	rows, err := h.deps.Store.EventSlotBookings(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		perSlot := counts[row.EventID]
		if perSlot == nil {
			perSlot = make(map[int32]app.SlotCount)
			counts[row.EventID] = perSlot
		}
		// Query memisah booked dan redeemed; kontrak menghitung redeemed sebagai
		// terisi juga, jadi keduanya dijumlahkan untuk sisa kuota.
		perSlot[row.SlotStart] = app.SlotCount{
			Booked:   row.Booked + row.Redeemed,
			Redeemed: row.Redeemed,
		}
	}
	return counts, nil
}

// ticketDTOOf menyusun DTO dari baris join, karena GetTicketByCode mengembalikan
// event yang sudah diratakan menjadi kolom-kolom.
func ticketDTOOf(row store.GetTicketByCodeRow) app.TicketDTO {
	ev := store.Event{
		ID:             row.EventID,
		Name:           row.EventName,
		Place:          row.EventPlace,
		Item:           row.EventItem,
		Requirement:    row.EventRequirement,
		EventDate:      row.EventDate,
		OpenMinutes:    row.OpenMinutes,
		CloseMinutes:   row.CloseMinutes,
		SlotMinutes:    row.SlotMinutes,
		CounterCount:   row.CounterCount,
		ServiceSeconds: row.ServiceSeconds,
		WaitingCount:   row.WaitingCount,
		Status:         row.EventStatus,
	}
	t := store.Ticket{
		ID:              row.ID,
		Code:            row.Code,
		EventID:         row.EventID,
		VisitorName:     row.VisitorName,
		SlotStart:       row.SlotStart,
		Status:          row.Status,
		RedeemedAt:      row.RedeemedAt,
		RedeemedCounter: row.RedeemedCounter,
	}
	return app.BuildTicket(t, ev)
}
