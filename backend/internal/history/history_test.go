package history

import (
	"sync"
	"testing"
	"time"
)

func TestStoreKeepsNewestEntriesUpToLimit(t *testing.T) {
	store := New(2)
	for _, op := range []string{"first", "second", "third"} {
		store.Add(op, []float64{1, 2}, 3)
	}

	entries := store.Entries()
	if len(entries) != 2 {
		t.Fatalf("got %d entries, want 2", len(entries))
	}
	if entries[0].Operation != "third" || entries[1].Operation != "second" {
		t.Errorf("got %q, %q; want newest first: \"third\", \"second\"",
			entries[0].Operation, entries[1].Operation)
	}
}

func TestStoreStampsEntries(t *testing.T) {
	fixed := time.Date(2026, time.September, 17, 12, 0, 0, 0, time.UTC)
	store := New(1)
	store.now = func() time.Time { return fixed } // the injectable clock earns its keep here

	store.Add("add", []float64{1, 1}, 2)

	entry := store.Entries()[0]
	if !entry.At.Equal(fixed) {
		t.Errorf("At = %v, want %v", entry.At, fixed)
	}
	if entry.Result != 2 {
		t.Errorf("Result = %v, want 2", entry.Result)
	}
}

// TestAddClonesOperands checks that the store does not alias the caller's
// slice: a slice header points at an array the caller still holds.
func TestAddClonesOperands(t *testing.T) {
	store := New(1)
	operands := []float64{2, 3}

	store.Add("add", operands, 5)
	operands[0] = 999 // the caller reuses its slice afterwards

	if got := store.Entries()[0].Operands[0]; got != 2 {
		t.Errorf("stored operand changed to %v when the caller mutated its slice, want 2", got)
	}
}

func TestEntriesReturnsCopies(t *testing.T) {
	store := New(2)
	store.Add("add", []float64{2, 3}, 5)

	entries := store.Entries()
	entries[0].Operation = "mutated"
	entries[0].Operands[0] = 999

	stored := store.Entries()[0]
	if stored.Operation != "add" {
		t.Errorf("mutating the returned slice changed the store: operation is %q", stored.Operation)
	}
	if stored.Operands[0] != 2 {
		t.Errorf("mutating the returned operands changed the store: got %v", stored.Operands[0])
	}
}

// TestStoreIsSafeForConcurrentUse is meaningful under `go test -race`: without
// the mutex, the race detector flags the concurrent slice writes.
func TestStoreIsSafeForConcurrentUse(t *testing.T) {
	store := New(8)

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(2)
		go func() { defer wg.Done(); store.Add("add", []float64{1, 1}, 2) }()
		go func() { defer wg.Done(); _ = store.Entries() }()
	}
	wg.Wait()

	if got := len(store.Entries()); got != 8 {
		t.Errorf("got %d entries, want the store filled to its limit of 8", got)
	}
}
