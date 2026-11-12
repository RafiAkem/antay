package event

import (
	"errors"
	"strings"
	"testing"
)

func TestPlanTransitionTable(t *testing.T) {
	allStatuses := []string{StatusDraft, StatusReview, StatusPublished, StatusClosed, StatusCancelled}
	want := map[Action]struct{ from, to string }{
		ActionSubmit:  {StatusDraft, StatusReview},
		ActionApprove: {StatusReview, StatusPublished},
		ActionReject:  {StatusReview, StatusDraft},
		ActionCancel:  {StatusPublished, StatusCancelled},
		ActionClose:   {StatusPublished, StatusClosed},
	}
	// Setiap aksi dicoba dari semua status: hanya satu yang boleh lolos.
	for action, w := range want {
		for _, from := range allStatuses {
			change, err := PlanTransition(action, from, "Poster buram")
			if from != w.from {
				if !errors.Is(err, ErrInvalidStatus) {
					t.Fatalf("%s dari %s: err = %v, mau ErrInvalidStatus", action, from, err)
				}
				continue
			}
			if err != nil {
				t.Fatalf("%s dari %s: %v", action, from, err)
			}
			if change.From != w.from || change.To != w.to {
				t.Fatalf("%s: %s -> %s, mau %s -> %s", action, change.From, change.To, w.from, w.to)
			}
		}
	}
}

func TestPlanTransitionStamps(t *testing.T) {
	submit, _ := PlanTransition(ActionSubmit, StatusDraft, "")
	if !submit.StampSubmitted || submit.StampPublished || submit.RejectionReason != nil {
		t.Fatalf("submit = %+v", submit)
	}
	approve, _ := PlanTransition(ActionApprove, StatusReview, "")
	if !approve.StampPublished || approve.StampSubmitted || approve.RejectionReason != nil {
		t.Fatalf("approve = %+v", approve)
	}
	reject, err := PlanTransition(ActionReject, StatusReview, "  Harga belum final  ")
	if err != nil || reject.RejectionReason == nil || *reject.RejectionReason != "Harga belum final" {
		t.Fatalf("reject = %+v, err %v", reject, err)
	}
}

func TestRejectReasonLength(t *testing.T) {
	for _, reason := range []string{"", "  ", "ab", strings.Repeat("x", 301)} {
		if _, err := PlanTransition(ActionReject, StatusReview, reason); !errors.Is(err, ErrRejectionReason) {
			t.Fatalf("alasan %q: err = %v, mau ErrRejectionReason", reason, err)
		}
	}
	if _, err := PlanTransition(ActionReject, StatusReview, strings.Repeat("é", 300)); err != nil {
		t.Fatalf("300 karakter multibyte harus lolos: %v", err)
	}
}

func TestAdminOnlyActions(t *testing.T) {
	if ActionSubmit.AdminOnly() {
		t.Fatal("submit harus boleh untuk organizer")
	}
	for _, a := range []Action{ActionApprove, ActionReject, ActionCancel, ActionClose, Action("lain")} {
		if !a.AdminOnly() {
			t.Fatalf("%s harus khusus admin", a)
		}
	}
}
