# syntax=docker/dockerfile:1

FROM golang:1.27-alpine AS build

WORKDIR /src

# Copied first so the dependency layer caches separately from the source.
COPY go.mod ./
RUN go mod download

COPY . .

# Static binary, since scratch has no libc.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM scratch AS run

COPY --from=build /out/server /server

# Numeric because scratch has no /etc/passwd.
USER 65534:65534

EXPOSE 8080
ENTRYPOINT ["/server"]
