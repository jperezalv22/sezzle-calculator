// Package history keeps the most recent calculations in memory.
package history

import (
	"slices"
	"sync"
	"time"
)

// Entry is one recorded calculation. The struct tags control the JSON field
// names; without them the encoder would emit "Operation", "Operands", "Result".
type Entry struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
	Result    float64   `json:"result"`
	At        time.Time `json:"at"`
}

// Store holds the most recent entries, newest first, dropping the oldest once
// it is full.
//
// It is safe for concurrent use, which matters because net/http runs every
// request on its own goroutine: two calculations really can call Add at the
// same instant. A plain Mutex is enough here; RWMutex only earns its extra
// complexity under read contention this store will never see.
type Store struct {
	mu      sync.Mutex
	entries []Entry
	limit   int

	// now is a field rather than a direct call to time.Now so tests can supply
	// a fixed clock.
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
		// A slice header points at an array the caller still holds, so storing
		// it directly would let the caller change a recorded entry after the
		// fact. Clone takes the store's own copy.
		Operands: slices.Clone(operands),
		Result:   result,
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	entry.At = s.now().UTC()

	// Prepending copies the slice, which is O(n) — irrelevant at a limit of a
	// few dozen, and it keeps the store a plain newest-first slice. A ring
	// buffer would be the answer at a larger limit.
	s.entries = append([]Entry{entry}, s.entries...)
	if len(s.entries) > s.limit {
		s.entries = s.entries[:s.limit]
	}
}

// Entries returns the recorded calculations, newest first.
//
// It returns copies: handing out the internal slice would let a caller read it
// while Add is writing, which is a data race even though the caller only reads.
// Each Operands slice is cloned for the same reason.
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
