# AI prompts used

The assignment allows AI tools and asks for the prompts, so here they are in the order I sent them.
I used Claude Code for all of them.

## 0. Session context

```
I'm working on a take-home for Sezzle, a calculator with a Go backend and a React + TypeScript
frontend on Vite. I have 2-4 hours. Go side is standard library only, and no UI libraries on
the frontend.
Please don't add things I didn't ask for, and ask me first if you want to pull in a dependency.
```

## 1. Arithmetic package (backend/internal/calc)

```
First the math. I want a calc package in backend/internal/calc with add, subtract, multiply,
divide, power, sqrt and percentage, and nothing HTTP related in it.
sqrt takes one number and the others take two. It should return errors for divide by zero,
sqrt of a negative, the wrong number of operands, an unknown operation, and any result that
comes out NaN or Inf. Make the errors exported vars so I can check them with errors.Is later.
Percentage means "b percent of a". Put a comment on it so nobody has to guess.
```

## 2. Table-driven tests for calc

```
Can you write table-driven tests for calc? Cover the normal cases and the edge ones too:
negatives, decimals, x^0, divide by zero, sqrt(-1), wrong operand count, unknown op, and an
overflow like 1e308 * 10. Give each case a name so I know which one failed, and compare floats
with an epsilon.
```

## 3. HTTP layer (backend/internal/api)

```
Now the HTTP layer, in backend/internal/api. There's one endpoint, POST /api/v1/calculate. The
body looks like {"operation":"divide","operands":[10,4]} and a good request gets a 200 with the
result. Errors are a 400 with {"error":{"code":"DIVISION_BY_ZERO","message":"..."}}.
The codes I want are INVALID_REQUEST, UNKNOWN_OPERATION, INVALID_OPERANDS, DIVISION_BY_ZERO,
NEGATIVE_SQRT and RESULT_OUT_OF_RANGE, plus a 405 when the method is wrong. Add GET /healthz too.
The handler shouldn't do math. It just maps calc's errors to codes. It should reject unknown
JSON fields, cap the body size and never send a raw Go error back to the client. CORS should
only allow the frontend origin, which comes from an env var.
```

## 4. Server setup (main.go)

```
main.go next. Read PORT and ALLOWED_ORIGIN from env with defaults, set timeouts on the server
and shut down gracefully on Ctrl+C. Keep it short. Also, what does each of those timeouts
protect against?
```

## 5. API tests (httptest)

```
I need handler tests with httptest for: a valid request, bad JSON, an unknown operation,
missing operands, divide by zero (400 with the right code), GET on calculate (405), a body
that's too big, and healthz. Decode the JSON and check the fields, don't compare raw strings.
```

## 6. Frontend API client

```
On to the frontend. In src/api/client.ts I want a calculate(operation, operands) function that
uses fetch. When the API returns an error it should throw a CalculationError with the code and
message, and I need to be able to tell a network failure apart from an API error. The base URL
comes from import.meta.env and falls back to localhost.
```

## 7. Calculator state hook

```
Now a useCalculator hook for the keypad. It handles digits, one decimal point per number,
picking an operation, = calling the API, clear and backspace. If the API errors, show the
message and clear it on the next key press. = should be disabled while a request is in flight.
Use useState or useReducer, whichever fits better, and tell me why you picked it.
```

## 8. UI components

```
Build the Calculator, Display and Keypad components on top of the hook, with plain CSS and a
grid for the keys. It has to work on a narrow phone screen, show focus, and be usable from the
keyboard (digits, operators, Enter, Escape). Put aria-live on the display so screen readers
announce the result. The logic stays in the hook, not in the components.
```

## 9. Frontend tests

```
Tests with Vitest and Testing Library. For the hook: digits, a second decimal point, switching
operations, clear, and the error case. For the client, mock fetch and check the request body
and that a 400 becomes a CalculationError. Then one test where the user types 8 / 0 = and sees
the error. Query by role or label, I don't want test ids.
```

## 10. Calculation history

```
I'd like a history of recent calculations visible in the UI, so the user can look back at what
they already computed. Keep it in frontend state only, nothing on the backend, and add a button
to clear it.
```

## 11. README

```
Help me write the README. It needs an overview, how the project is laid out and why the math is
separate from HTTP, the versions you need, how to run the backend and the frontend, the API with
curl examples for success and for errors, how to run the tests and get coverage, the design
decisions and assumptions (floats, how percentage works, one endpoint instead of one per
operation), and what I left out for time. Keep it short. Someone should be able to clone it and
get it running without having to ask me anything.
```

## 12. Final review pass

```
Review the repo the way you'd review a 2-4 hour take-home. What would break if someone followed
the README on a fresh machine? Anything in the Go code that isn't idiomatic? Edge cases that are
handled but not tested, or tested but not handled? Anything that's overkill for the time? And
leftovers like dead code or TODOs. Just give me a list, don't change any code.
```

---

## Notes on how I used AI

I went one prompt per component, in the order I'd build it by hand: the math package and its tests first, then the HTTP layer, then the frontend. That kept each chunk of output small enough to read in full before moving on. The design calls went into the prompts before any code existed (percentage as "b percent of a", a single endpoint, calc errors as exported vars that the handler maps with `errors.Is`), and when I wasn't sure about something I asked for the reasoning instead of just taking the code, like what each server timeout protects against or useState vs useReducer. The last prompt only asked for a list of problems, so what got fixed after that was my call. I can explain the Go side line by line; on the frontend I'm solid on the hook and the API client, and the CSS is the part I leaned on the model for most.
