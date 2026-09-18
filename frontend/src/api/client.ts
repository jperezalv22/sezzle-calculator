/** The operations the backend implements. Mirrors the Op* constants in Go. */
export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage'

/** One recorded calculation, as returned by GET /api/v1/history. */
export interface HistoryEntry {
  operation: Operation
  operands: number[]
  result: number
  /** RFC 3339 timestamp, UTC. */
  at: string
}

/**
 * The API answered, and said no: division by zero, an unknown operation and so
 * on. `code` is the API's stable error code; `message` is safe to show a user.
 */
export class CalculationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CalculationError'
    this.code = code
  }
}

/**
 * No usable answer from the API: the request never completed, or what came back
 * was not the API speaking. A proxy's HTML error page when the backend is down
 * is the common case of the second. `status` is set when there was a response.
 */
export class NetworkError extends Error {
  readonly status?: number

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.name = 'NetworkError'
    this.status = options?.status
  }
}

// `??` rather than `||`, so an explicitly empty value means "same origin" (for a
// build served behind a proxy) instead of falling back to localhost.
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

/**
 * Sends a request and returns the parsed JSON of a successful response.
 *
 * Returns `unknown` on purpose: callers must check the shape before trusting it,
 * because a type assertion on a network response is a claim nothing verifies.
 */
async function request(path: string, init: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(BASE_URL + path, init)
  } catch (error) {
    // An abort is the caller cancelling, not the network failing, so it must
    // reach the caller unchanged or they cannot tell the two apart.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    // fetch rejects only when no response arrived at all: server down, DNS,
    // offline, or a CORS rejection, which the browser deliberately makes look
    // identical to the others.
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

  // Only a body in the API's error shape is the API speaking. Anything else,
  // even valid JSON, came from something in between.
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
