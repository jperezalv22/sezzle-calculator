import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  // Testing Library only unmounts automatically when test globals are enabled.
  // These tests import describe/it/expect explicitly instead, so unmount here,
  // or each render would pile up in the same document.
  cleanup()
  // Undo vi.stubGlobal('fetch', ...) so no test sees another test's fake.
  vi.unstubAllGlobals()
})
