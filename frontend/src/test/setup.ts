import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  // Auto-cleanup needs test globals, which these tests don't use.
  cleanup()
  vi.unstubAllGlobals()
})
