package seating

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/domain/event"
	"github.com/RafiAkem/antay/backend/internal/domain/seating"
	"github.com/RafiAkem/antay/backend/internal/domain/user"
)

type fixture struct {
	repo     *fakeRepo
	svc      *Service
	eventID  uuid.UUID
	seated   uuid.UUID
	standing uuid.UUID
	owner    user.Session
}

func newFixture(status string) fixture {
	repo := newFakeRepo()
	org := uuid.New()
	f := fixture{
		repo: repo, svc: New(repo), eventID: uuid.New(), seated: uuid.New(), standing: uuid.New(),
		owner: user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &org},
	}
	repo.events[f.eventID] = seating.EventRef{ID: f.eventID, OrganizerID: &org, Status: status}
	repo.categories[f.seated] = seating.CategoryRef{ID: f.seated, EventID: f.eventID, Name: "VIP A", IsSeated: true}
	repo.categories[f.standing] = seating.CategoryRef{ID: f.standing, EventID: f.eventID, Name: "Festival"}
	return f
}

func blockInput(category uuid.UUID, code string, x int) BlockInput {
	return BlockInput{CategoryID: category, Name: "Blok " + code, Spec: seating.BlockSpec{
		Code: code, X: x, Y: 300, RowCount: 3, SeatsPerRow: 4,
		SeatSpacing: 28, RowSpacing: 32, FirstRowLabel: "A", Numbering: seating.NumberingLTR,
	}}
}

func (f fixture) create(t *testing.T, code string, x int) BlockResult {
	t.Helper()
	res, err := f.svc.CreateBlock(context.Background(), f.owner, f.eventID, blockInput(f.seated, code, x))
	if err != nil {
		t.Fatalf("CreateBlock %s: %v", code, err)
	}
	return res
}

func TestCreateBlockWritesSeats(t *testing.T) {
	f := newFixture(event.StatusDraft)
	res := f.create(t, "L", 300)
	if res.Block.SeatCount != 12 || res.Block.CategoryName != "VIP A" {
		t.Fatalf("blok = %+v", res.Block)
	}
	if len(res.Warnings) != 0 {
		t.Fatalf("tidak mau ada peringatan, dapat %v", res.Warnings)
	}
	if f.repo.status("L-C4") != seating.StatusAvailable {
		t.Fatal("kursi L-C4 harus tersedia")
	}
}

func TestCreateBlockRejectsUnseatedCategory(t *testing.T) {
	f := newFixture(event.StatusDraft)
	foreign := uuid.New()
	f.repo.categories[foreign] = seating.CategoryRef{ID: foreign, EventID: uuid.New(), IsSeated: true}
	for _, cat := range []uuid.UUID{f.standing, foreign, uuid.New()} {
		_, err := f.svc.CreateBlock(context.Background(), f.owner, f.eventID, blockInput(cat, "L", 300))
		if !errors.Is(err, ErrCategoryNotSeated) {
			t.Fatalf("kategori %s: mau ErrCategoryNotSeated, dapat %v", cat, err)
		}
	}
}

func TestCreateBlockRejectsTakenCode(t *testing.T) {
	f := newFixture(event.StatusDraft)
	f.create(t, "L", 300)
	_, err := f.svc.CreateBlock(context.Background(), f.owner, f.eventID, blockInput(f.seated, "L", 700))
	if !errors.Is(err, ErrCodeTaken) {
		t.Fatalf("mau ErrCodeTaken, dapat %v", err)
	}
}

func TestOverlapIsWarningNotFailure(t *testing.T) {
	f := newFixture(event.StatusDraft)
	f.create(t, "L", 300)
	res := f.create(t, "R", 310)
	if len(res.Warnings) != 1 || res.Warnings[0] != "Blok R bertabrakan dengan blok L" {
		t.Fatalf("peringatan = %v", res.Warnings)
	}
}

func TestLockedBlockCannotChangeShape(t *testing.T) {
	f := newFixture(event.StatusPublished)
	id := f.create(t, "L", 300).Block.ID
	f.repo.setStatus("L-B2", seating.StatusSold)
	ctx := context.Background()

	rows := 5
	if _, err := f.svc.UpdateBlock(ctx, f.owner, id, BlockPatch{RowCount: &rows}); !errors.Is(err, ErrBlockLocked) {
		t.Fatalf("ubah bentuk: mau ErrBlockLocked, dapat %v", err)
	}
	if err := f.svc.DeleteBlock(ctx, f.owner, id); !errors.Is(err, ErrBlockLocked) {
		t.Fatalf("hapus: mau ErrBlockLocked, dapat %v", err)
	}
	// Ganti nama tidak menyentuh kursi, jadi tetap boleh.
	name := "Tribun Kiri"
	res, err := f.svc.UpdateBlock(ctx, f.owner, id, BlockPatch{Name: &name})
	if err != nil || res.Block.Name != name {
		t.Fatalf("ganti nama: %v %+v", err, res.Block)
	}
	if f.repo.status("L-B2") != seating.StatusSold {
		t.Fatal("kursi terjual tidak boleh berubah")
	}
}

func TestRegenerateKeepsDisabledSeats(t *testing.T) {
	f := newFixture(event.StatusDraft)
	ctx := context.Background()
	id := f.create(t, "L", 300).Block.ID
	if _, err := f.svc.SetSeatsDisabled(ctx, f.owner, f.eventID, []string{"L-A2", "L-C4"}, true); err != nil {
		t.Fatal(err)
	}
	// Kursi per baris dikurangi jadi 3, jadi L-C4 hilang; L-A2 harus tetap nonaktif.
	code, perRow := "M", 3
	res, err := f.svc.UpdateBlock(ctx, f.owner, id, BlockPatch{Code: &code, SeatsPerRow: &perRow})
	if err != nil {
		t.Fatal(err)
	}
	if res.Block.SeatCount != 9 {
		t.Fatalf("jumlah kursi %d, mau 9", res.Block.SeatCount)
	}
	if got := f.repo.status("M-A2"); got != seating.StatusDisabled {
		t.Fatalf("M-A2 = %s, mau disabled", got)
	}
	if got := f.repo.status("M-A1"); got != seating.StatusAvailable {
		t.Fatalf("M-A1 = %s, mau available", got)
	}
}

func TestUpdateSeatsRules(t *testing.T) {
	f := newFixture(event.StatusDraft)
	ctx := context.Background()
	f.create(t, "L", 300)
	f.repo.setStatus("L-A1", seating.StatusHeld)

	var locked SeatLockedError
	if _, err := f.svc.UpdateSeats(ctx, f.owner, f.eventID, []string{"L-A1", "L-A2"}, nil); !errors.As(err, &locked) || locked.Labels[0] != "L-A1" {
		t.Fatalf("mau SeatLockedError L-A1, dapat %v", err)
	}
	if f.repo.status("L-A2") != seating.StatusAvailable {
		t.Fatal("gagal satu harus batal semua")
	}
	var unknown UnknownSeatsError
	if _, err := f.svc.UpdateSeats(ctx, f.owner, f.eventID, []string{"L-Z9"}, nil); !errors.As(err, &unknown) {
		t.Fatalf("mau UnknownSeatsError, dapat %v", err)
	}
	if _, err := f.svc.UpdateSeats(ctx, f.owner, f.eventID, []string{"L-A2"}, []string{"L-A2"}); !errors.Is(err, ErrSeatInBothLists) {
		t.Fatalf("mau ErrSeatInBothLists, dapat %v", err)
	}
	changed, err := f.svc.UpdateSeats(ctx, f.owner, f.eventID, []string{"L-A2"}, []string{"L-A3"})
	if err != nil || len(changed) != 1 || changed[0].Label != "L-A2" {
		t.Fatalf("hanya L-A2 yang berubah, dapat %v %v", changed, err)
	}
}

func TestAuthorizationAndEditability(t *testing.T) {
	ctx := context.Background()
	f := newFixture(event.StatusDraft)
	other := uuid.New()
	stranger := user.Session{UserID: uuid.New(), Role: user.RoleOrganizer, OrganizerID: &other}
	if _, err := f.svc.SeatMap(ctx, stranger, f.eventID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("organizer lain: mau ErrNotFound, dapat %v", err)
	}
	admin := user.Session{UserID: uuid.New(), Role: user.RoleAdmin}
	if m, err := f.svc.SeatMap(ctx, admin, f.eventID); err != nil || m.Layout.StageLabel != "Panggung" {
		t.Fatalf("admin harus bisa membuka denah bawaan: %v", err)
	}

	for _, status := range []string{event.StatusCancelled, event.StatusClosed} {
		g := newFixture(status)
		_, err := g.svc.CreateBlock(ctx, g.owner, g.eventID, blockInput(g.seated, "L", 300))
		if !errors.Is(err, ErrEventNotEditable) {
			t.Fatalf("%s: mau ErrEventNotEditable, dapat %v", status, err)
		}
	}
	if _, err := f.svc.PublicSeatMap(ctx, f.eventID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("draft tidak boleh tampil ke publik, dapat %v", err)
	}
}

func TestPutLayoutValidates(t *testing.T) {
	f := newFixture(event.StatusDraft)
	l := seating.DefaultLayout(f.eventID)
	l.Stage.X = 900 // panggung menembus tepi kanan kanvas
	if _, err := f.svc.PutLayout(context.Background(), f.owner, l); err == nil {
		t.Fatal("panggung di luar kanvas harus ditolak")
	}
	l = seating.DefaultLayout(f.eventID)
	l.StageLabel = "  Panggung Utama  "
	saved, err := f.svc.PutLayout(context.Background(), f.owner, l)
	if err != nil || saved.StageLabel != "Panggung Utama" {
		t.Fatalf("simpan layout: %v %q", err, saved.StageLabel)
	}
}
