/** The operations the backend implements. Mirrors the Op* constants in Go. */
export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage'

/** An entry from GET /api/v1/history. */
export interface HistoryEntry {
  operation: Operation
  operands: number[]
  result: number
  /** RFC 3339 timestamp, UTC. */
  at: string
}

/** The API rejected the calculation. `message` is safe to show the user. */
export class CalculationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CalculationError'
    this.code = code
  }
}

/**
 * No usable answer: the request failed, or the response didn't come from the API
 * (e.g. a proxy's HTML error page). `status` is set when there was a response.
 */
export class NetworkError extends Error {
  readonly status?: number

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.name = 'NetworkError'
    this.status = options?.status
  }
}

// `??`, not `||`: an empty value means same origin, not localhost.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '')

export async function calculate(
  operation: Operation,
  operands: number[],
  signal?: AbortSignal,
): Promise<number> {
  const body = await request('/api/v1/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, operands }),
    signal,
  })

  if (!isRecord(body) || typeof body.result !== 'number') {
    throw new NetworkError('The server sent a response without a result.')
  }
  return body.result
}

export async function fetchHistory(signal?: AbortSignal): Promise<HistoryEntry[]> {
  const body = await request('/api/v1/history', { signal })
  if (!Array.isArray(body)) {
    throw new NetworkError('The server sent a history that is not a list.')
  }
  return body as HistoryEntry[]
}

/** Returns `unknown` so callers have to check the shape of the response. */
async function request(path: string, init: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(BASE_URL + path, init)
  } catch (error) {
    // Rethrow aborts as-is so callers can tell a cancel from a network error.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    // No response at all: server down, offline, DNS or CORS (the browser hides which).
    throw new NetworkError('Could not reach the calculator service.', { cause: error })
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    throw new NetworkError(`Unexpected response from the server (HTTP ${response.status}).`, {
      status: response.status,
      cause: error,
    })
  }

  if (response.ok) {
    return body
  }

  // Anything not in the API's error shape, even valid JSON, came from a proxy.
  if (isRecord(body) && isRecord(body.error)) {
    const { code, message } = body.error
    if (typeof code === 'string' && typeof message === 'string') {
      throw new CalculationError(code, message)
    }
  }
  throw new NetworkError(`Unexpected response from the server (HTTP ${response.status}).`, {
    status: response.status,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
