package event

import (
	"errors"
	"strings"
	"unicode/utf8"
)

// ErrInvalidStatus berarti aksinya sah, tapi status event saat ini tidak cocok,
// misalnya menyetujui event yang masih draft.
var ErrInvalidStatus = errors.New("status event tidak cocok untuk tindakan ini")

// ErrRejectionReason dipakai bila alasan penolakan kosong atau kepanjangan.
var ErrRejectionReason = errors.New("alasan penolakan harus 3 sampai 300 karakter")

type Action string

const (
	ActionSubmit  Action = "submit"
	ActionApprove Action = "approve"
	ActionReject  Action = "reject"
	ActionCancel  Action = "cancel"
	ActionClose   Action = "close"
)

// transition adalah satu baris tabel alur status. AdminOnly sengaja ikut
// dicatat di sini walau rute juga menjaganya, supaya tabelnya bisa dibaca
// sebagai satu-satunya sumber kebenaran.
type transition struct {
	From, To  string
	AdminOnly bool
}

var transitions = map[Action]transition{
	ActionSubmit:  {From: StatusDraft, To: StatusReview},
	ActionApprove: {From: StatusReview, To: StatusPublished, AdminOnly: true},
	ActionReject:  {From: StatusReview, To: StatusDraft, AdminOnly: true},
	ActionCancel:  {From: StatusPublished, To: StatusCancelled, AdminOnly: true},
	ActionClose:   {From: StatusPublished, To: StatusClosed, AdminOnly: true},
}

// StatusChange adalah hasil rencana transisi yang tinggal disimpan.
// RejectionReason nil berarti kolomnya dikosongkan: alasan lama tidak relevan
// lagi begitu event diajukan ulang atau disetujui.
type StatusChange struct {
	From, To        string
	StampSubmitted  bool
	StampPublished  bool
	RejectionReason *string
}

// AdminOnly menjawab apakah aksi ini khusus admin. Aksi tak dikenal dianggap
// khusus admin supaya salah ketik tidak membuka akses.
func (a Action) AdminOnly() bool {
	t, ok := transitions[a]
	return !ok || t.AdminOnly
}

// PlanTransition memeriksa status sekarang lalu menyusun perubahan yang harus
// disimpan. reason hanya dibaca untuk ActionReject.
func PlanTransition(action Action, current, reason string) (StatusChange, error) {
	t, ok := transitions[action]
	if !ok || t.From != current {
		return StatusChange{}, ErrInvalidStatus
	}
	change := StatusChange{From: t.From, To: t.To}
	switch action {
	case ActionSubmit:
		change.StampSubmitted = true
	case ActionApprove:
		change.StampPublished = true
	case ActionReject:
		clean, err := CleanRejectionReason(reason)
		if err != nil {
			return StatusChange{}, err
		}
		change.RejectionReason = &clean
	}
	return change, nil
}

func CleanRejectionReason(reason string) (string, error) {
	clean := strings.TrimSpace(reason)
	if n := utf8.RuneCountInString(clean); n < 3 || n > 300 {
		return "", ErrRejectionReason
	}
	return clean, nil
}
