package postgres

import (
	"context"

	"github.com/google/uuid"

	"github.com/RafiAkem/antay/backend/internal/application/reporting"
	"github.com/RafiAkem/antay/backend/internal/infrastructure/postgres/store"
)

// ReportingReadModel memenuhi reporting.ReadModel langsung dari query agregat.
type ReportingReadModel struct {
	q *store.Queries
}

func NewReportingReadModel(q *store.Queries) *ReportingReadModel {
	return &ReportingReadModel{q: q}
}

func (r *ReportingReadModel) TicketTotals(ctx context.Context, eventID uuid.UUID) (reporting.TicketTotals, error) {
	row, err := r.q.EventTicketCounts(ctx, eventID)
	if err != nil {
		return reporting.TicketTotals{}, err
	}
	return reporting.TicketTotals{
		Registered: row.Registered,
		Redeemed:   row.Redeemed,
		Pending:    row.Pending,
		Cancelled:  row.Cancelled,
	}, nil
}

func (r *ReportingReadModel) NoShowCount(ctx context.Context, eventID uuid.UUID, nowMinutes int32) (int32, error) {
	return r.q.EventNoShowCount(ctx, store.EventNoShowCountParams{EventID: eventID, NowMinutes: nowMinutes})
}

func (r *ReportingReadModel) SlotStats(ctx context.Context, eventID uuid.UUID) ([]reporting.SlotStat, error) {
	rows, err := r.q.EventSlotStats(ctx, eventID)
	if err != nil {
		return nil, err
	}
	out := make([]reporting.SlotStat, 0, len(rows))
	for _, row := range rows {
		out = append(out, reporting.SlotStat{
			SlotStart:  row.SlotStart,
			Registered: row.Registered,
			Redeemed:   row.Redeemed,
		})
	}
	return out, nil
}

func (r *ReportingReadModel) Overview(ctx context.Context, date string) ([]reporting.OverviewRow, error) {
	rows, err := r.q.EventsOverview(ctx, date)
	if err != nil {
		return nil, err
	}
	out := make([]reporting.OverviewRow, 0, len(rows))
	for _, row := range rows {
		out = append(out, reporting.OverviewRow{
			ID:             row.ID,
			Name:           row.Name,
			Place:          row.Place,
			OpenMinutes:    row.OpenMinutes,
			CloseMinutes:   row.CloseMinutes,
			CounterCount:   row.CounterCount,
			ServiceSeconds: row.ServiceSeconds,
			WaitingCount:   row.WaitingCount,
			Registered:     row.Registered,
			Redeemed:       row.Redeemed,
		})
	}
	return out, nil
}
