import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Calculator } from './Calculator'

describe('Calculator', () => {
  it('shows the API error when the user divides 8 by 0', async () => {
    // Only fetch is faked; it answers the way the Go API does.
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<Calculator />)

    // Looking keys up by accessible name also checks that a screen reader can name them.
    fireEvent.click(screen.getByRole('button', { name: '8' }))
    fireEvent.click(screen.getByRole('button', { name: 'Divide' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: 'Equals' }))

    // <output> has the implicit role "status".
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Cannot divide by zero.'))

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ operation: 'divide', operands: [8, 0] })
  })
})
