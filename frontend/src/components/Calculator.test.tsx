import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HistoryEntry } from '../api/client'
import { Calculator } from './Calculator'

type Handler = (init: RequestInit | undefined) => { status: number; body: unknown }

/** Fakes fetch by path, answering the way the Go API does. */
function stubApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url, 'http://localhost').pathname
    const handler = routes[path]
    if (!handler) {
      throw new Error(`Unexpected request to ${path}`)
    }
    const { status, body } = handler(init)
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const entry = (operation: HistoryEntry['operation'], operands: number[], result: number): HistoryEntry => ({
  operation,
  operands,
  result,
  at: '2026-09-17T15:04:05.123456789Z',
})

function press(...names: string[]) {
  for (const name of names) {
    fireEvent.click(screen.getByRole('button', { name }))
  }
}

function historyPanel() {
  return within(screen.getByRole('region', { name: 'History' }))
}

describe('Calculator', () => {
  it('shows the API error when the user divides 8 by 0', async () => {
    const fetchMock = stubApi({
      '/api/v1/history': () => ({ status: 200, body: [] }),
      '/api/v1/calculate': () => ({
        status: 400,
        body: { error: { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' } },
      }),
    })

    render(<Calculator />)

    // Looking keys up by accessible name also checks that a screen reader can name them.
    press('8', 'Divide', '0', 'Equals')

    // <output> has the implicit role "status".
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Cannot divide by zero.'))

    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/v1/calculate'))
    expect(JSON.parse(call?.[1]?.body as string)).toEqual({ operation: 'divide', operands: [8, 0] })
  })

  it('treats Enter as = after a key was clicked with the mouse', async () => {
    const fetchMock = stubApi({
      '/api/v1/history': () => ({ status: 200, body: [] }),
      '/api/v1/calculate': () => ({ status: 200, body: { result: 8 } }),
    })

    render(<Calculator />)

    // A clicked key must not keep focus, or Enter would press it again.
    const seven = screen.getByRole('button', { name: '7' })
    const focusable = fireEvent.mouseDown(seven)
    fireEvent.click(seven)
    expect(focusable).toBe(false)

    fireEvent.keyDown(window, { key: '+' })
    fireEvent.keyDown(window, { key: '1' })
    fireEvent.keyDown(window, { key: 'Enter' })

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('8'))
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/v1/calculate'))
    expect(JSON.parse(call?.[1]?.body as string)).toEqual({ operation: 'add', operands: [7, 1] })
  })

  it('lists past calculations, newest first', async () => {
    stubApi({
      '/api/v1/history': () => ({
        status: 200,
        body: [entry('multiply', [6, 7], 42), entry('sqrt', [9], 3)],
      }),
    })

    render(<Calculator />)

    const items = await historyPanel().findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('6 × 7 =42'),
      expect.stringContaining('√9 =3'),
    ])
  })

  it('says so when nothing has been calculated', async () => {
    stubApi({ '/api/v1/history': () => ({ status: 200, body: [] }) })

    render(<Calculator />)

    expect(await historyPanel().findByText('Nothing calculated yet.')).toBeTruthy()
  })

  it('puts a past result on the display and chains from it', async () => {
    const fetchMock = stubApi({
      '/api/v1/history': () => ({ status: 200, body: [entry('multiply', [6, 7], 42)] }),
      '/api/v1/calculate': () => ({ status: 200, body: { result: 44 } }),
    })

    render(<Calculator />)

    fireEvent.click(await historyPanel().findByRole('button', { name: 'Use 42, from 6 × 7' }))
    expect(screen.getByRole('status').textContent).toBe('42')

    press('Add', '2', 'Equals')

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('44'))
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/v1/calculate'))
    expect(JSON.parse(call?.[1]?.body as string)).toEqual({ operation: 'add', operands: [42, 2] })
  })

  it('reloads the history after each calculation', async () => {
    const recorded: HistoryEntry[] = []
    stubApi({
      '/api/v1/history': () => ({ status: 200, body: [...recorded] }),
      '/api/v1/calculate': () => {
        recorded.unshift(entry('add', [2, 3], 5))
        return { status: 200, body: { result: 5 } }
      },
    })

    render(<Calculator />)
    await historyPanel().findByText('Nothing calculated yet.')

    press('2', 'Add', '3', 'Equals')

    expect(await historyPanel().findByRole('button', { name: 'Use 5, from 2 + 3' })).toBeTruthy()
  })

  it('shows why the history failed to load and retries on request', async () => {
    let available = false
    stubApi({
      '/api/v1/history': () =>
        available
          ? { status: 200, body: [entry('add', [1, 1], 2)] }
          : { status: 502, body: 'Bad Gateway' },
    })

    render(<Calculator />)

    expect(await historyPanel().findByText('Unexpected response from the server (HTTP 502).')).toBeTruthy()

    available = true
    fireEvent.click(historyPanel().getByRole('button', { name: 'Retry' }))

    expect(await historyPanel().findByRole('button', { name: 'Use 2, from 1 + 1' })).toBeTruthy()
    expect(historyPanel().queryByRole('button', { name: 'Retry' })).toBeNull()
  })
})
