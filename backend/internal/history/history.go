// Package history keeps the most recent calculations in memory.
package history

import (
	"slices"
	"sync"
	"time"
)

// Entry is one recorded calculation.
type Entry struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
	Result    float64   `json:"result"`
	At        time.Time `json:"at"`
}

// Store holds the latest entries, newest first, dropping the oldest when full.
// It is safe for concurrent use, since every request runs on its own goroutine.
type Store struct {
	mu      sync.Mutex
	entries []Entry
	limit   int

	// Swappable so tests can fix the clock.
	now func() time.Time
}

// New returns a Store that remembers at most limit entries.
func New(limit int) *Store {
	if limit < 1 {
		limit = 1
	}
	return &Store{
		entries: make([]Entry, 0, limit),
		limit:   limit,
		now:     time.Now,
	}
}

// Add records a calculation as the newest entry.
func (s *Store) Add(operation string, operands []float64, result float64) {
	entry := Entry{
		Operation: operation,
		// Copied so the caller can't change a recorded entry later.
		Operands: slices.Clone(operands),
		Result:   result,
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	entry.At = s.now().UTC()

	// Prepending is O(n), fine at this size. Use a ring buffer if the limit grows.
	s.entries = append([]Entry{entry}, s.entries...)
	if len(s.entries) > s.limit {
		s.entries = s.entries[:s.limit]
	}
}

// Entries returns a copy of the entries, newest first, so callers can't race
// with Add.
func (s *Store) Entries() []Entry {
	s.mu.Lock()
	defer s.mu.Unlock()

	out := make([]Entry, len(s.entries))
	for i, entry := range s.entries {
		entry.Operands = slices.Clone(entry.Operands)
		out[i] = entry
	}
	return out
}
