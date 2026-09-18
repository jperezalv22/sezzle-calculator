# Calculator

A calculator with a Go backend that does the arithmetic and a React + TypeScript
frontend with a keypad. Seven operations: add, subtract, multiply, divide, power,
square root and percentage.

The backend uses only the Go standard library. The frontend uses no UI libraries.

## Structure

```
backend/
  cmd/server/          entry point: env config, timeouts, graceful shutdown
  internal/calc/       the math, and nothing else
  internal/api/        HTTP: decode, call calc, map errors to codes, CORS
  internal/history/    in-memory list of recent calculations
frontend/src/
  api/client.ts        fetch wrapper; CalculationError vs NetworkError
  hooks/               keypad state (a pure reducer), key mapping, useCalculator
  components/          Calculator, Display, Keypad; they only render
```

**Why the math is separate from HTTP.** `calc` takes numbers and returns a number
or an error. It doesn't know about JSON, status codes or requests. That lets it be
tested directly (100% coverage), keeps the handler down to translating between
HTTP and `calc`, and means the transport could change without touching the math.
The frontend follows the same idea: the keypad logic is a plain reducer, and the
components only draw it.

## Requirements

- **Go 1.27+**
- **Node 22.22+** (or 24.15+) and npm. That is jsdom's minimum, for the tests.
- Docker, optional

## Running it

Backend, which listens on `:8080`:

```sh
cd backend
go run ./cmd/server
```

Frontend, in a second terminal:

```sh
cd frontend
npm install
npm run dev
```

Open **<http://localhost:5173>**. Use `localhost`, not `127.0.0.1`: the backend
only accepts cross-origin requests from the origin in `ALLOWED_ORIGIN`.

| Variable | Where | Default |
| --- | --- | --- |
| `PORT` | backend | `8080` |
| `ALLOWED_ORIGIN` | backend: the one origin allowed through CORS | `http://localhost:5173` |
| `VITE_API_BASE_URL` | frontend: where the API is | `http://localhost:8080` |

**Or with Docker**, both together behind nginx:

```sh
docker compose up --build        # http://localhost:8080
HOST_PORT=8090 docker compose up --build   # if 8080 is taken
```

## API

### `POST /api/v1/calculate`

```sh
curl -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation": "divide", "operands": [10, 4]}'
```
```json
{"result": 2.5}
```

`operation` is one of `add`, `subtract`, `multiply`, `divide`, `power`,
`percentage` (two operands) or `sqrt` (one operand).

Errors return a code for programs and a message for people:

```sh
curl -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation": "divide", "operands": [1, 0]}'
```
```json
{"error": {"code": "DIVISION_BY_ZERO", "message": "Cannot divide by zero."}}
```

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Not a single JSON object, unknown fields, or over 8 KiB |
| 400 | `UNKNOWN_OPERATION` | Operation missing or not in the list above |
| 400 | `INVALID_OPERANDS` | Wrong number of operands, or operands that aren't numbers |
| 400 | `DIVISION_BY_ZERO` | Dividing by zero |
| 400 | `NEGATIVE_SQRT` | Square root of a negative number |
| 400 | `RESULT_OUT_OF_RANGE` | The result overflows or is undefined |
| 405 | `METHOD_NOT_ALLOWED` | Wrong method; the `Allow` header says which one works |

### Others

- `GET /healthz` returns `{"status": "ok"}`.
- `GET /api/v1/history` returns the last 20 successful calculations. The frontend
  doesn't show them yet.

## Tests

```sh
cd backend
go test ./...
go test -cover ./...     # calc 100%, api 98%, history 97%

cd frontend
npm test                 # Vitest + Testing Library
```

The backend tests cover every operation and every error code. The frontend tests
cover the keypad logic, the API client with `fetch` mocked, and a user entering
8 ÷ 0 = and seeing the error. They find elements by role and label, never by
test ID.

## Decisions and assumptions

**Floats.** Numbers are `float64` end to end. That's fine for a calculator but
not for money: `0.1 + 0.2` is `0.30000000000000004`. The display rounds to 12
significant digits to hide that. For money I'd use `math/big.Rat` or fixed-point
decimals. Results that overflow or are undefined (±Inf, NaN) are rejected, not
returned.

**Percentage means "b percent of a".** `percentage [200, 10]` is `20`. It is not
"a as a percentage of b", the other common meaning.

**One endpoint, not one per operation.** The operation is a field in the request
body, not part of the URL. That gives one request shape and one error format, and
adding an operation is one line in `calc` with no new route. Operand count and
unknown operations are then just validation, with their own error codes.

**Keypad behaviour.** Only `=` calls the API. Square root takes its number on
either side: `√ 9 =` or `9 √ =`. Choosing a second operation before the second
number replaces the first one. The next key after an error clears the message.

## Left out for time

- **History in the UI.** The backend records it; the keypad doesn't show it.
- **Persistent history.** It lives in memory and is lost on restart.
- **Chained operations without `=`**, and a ± key. To get a negative number, you
  have to subtract (`0 − 5`).
- **A keyboard shortcut for √.** It's reachable with Tab.
- **Frontend coverage reports**, end-to-end browser tests, and CI.
