package event

import "math"

const WaitLimitMinutes = 15

type Queue struct {
	Waiting        int32
	WaitMinutes    int32
	CountersNeeded int32
	Long           bool
}

func (e Event) Queue() Queue {
	wait := WaitMinutes(e.WaitingCount, e.ServiceSeconds, e.CounterCount)
	return Queue{
		Waiting:        e.WaitingCount,
		WaitMinutes:    wait,
		CountersNeeded: CountersNeeded(e.WaitingCount, e.ServiceSeconds),
		Long:           wait > WaitLimitMinutes,
	}
}

// WaitMinutes = orang antre x detik layanan / loket, dibulatkan ke atas.
func WaitMinutes(waiting, serviceSeconds, counters int32) int32 {
	if counters <= 0 {
		return 0
	}
	seconds := float64(waiting) * float64(serviceSeconds) / float64(counters)
	return int32(math.Ceil(seconds / 60))
}

// CountersNeeded: loket minimum supaya tunggu di bawah WaitLimitMinutes.
func CountersNeeded(waiting, serviceSeconds int32) int32 {
	if waiting <= 0 {
		return 1
	}
	need := math.Ceil(float64(waiting) * float64(serviceSeconds) / 60 / WaitLimitMinutes)
	if need < 1 {
		return 1
	}
	return int32(need)
}

// QueueUpdate adalah koreksi antrean dari petugas; field nil berarti tidak diubah.
type QueueUpdate struct {
	WaitingCount *int32
	CounterCount *int32
}

func (u QueueUpdate) Empty() bool { return u.WaitingCount == nil && u.CounterCount == nil }

func (u QueueUpdate) Validate() []FieldIssue {
	var issues []FieldIssue
	if u.WaitingCount != nil && *u.WaitingCount < 0 {
		issues = append(issues, FieldIssue{Field: "waitingCount", Issue: "tidak boleh negatif"})
	}
	if u.CounterCount != nil && (*u.CounterCount < 1 || *u.CounterCount > 20) {
		issues = append(issues, FieldIssue{Field: "counterCount", Issue: "harus antara 1 dan 20"})
	}
	return issues
}
