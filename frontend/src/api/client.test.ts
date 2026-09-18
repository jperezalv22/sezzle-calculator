import { describe, expect, it, vi } from 'vitest'
import { CalculationError, NetworkError, calculate } from './client'

/** A fetch that answers every request with this status and JSON body. */
function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('calculate', () => {
  it('POSTs the operation and operands as JSON and returns the result', async () => {
    const fetchMock = stubFetch(200, { result: 2.5 })

    const result = await calculate('divide', [10, 4])

    expect(result).toBe(2.5)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    // The base URL depends on the environment; the path does not.
    expect(url).toMatch(/\/api\/v1\/calculate$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({ operation: 'divide', operands: [10, 4] })
  })

  it('turns a 400 into a CalculationError carrying the code and message', async () => {
    stubFetch(400, { error: { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' } })

    const error = await calculate('divide', [1, 0]).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(CalculationError)
    expect(error).toMatchObject({ code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' })
  })

  it('reports a request that never completed as a NetworkError, not a CalculationError', async () => {
    // fetch only rejects (with a TypeError) when no response arrived.
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))

    const error = await calculate('add', [1, 2]).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(NetworkError)
    expect(error).not.toBeInstanceOf(CalculationError)
  })
})
