# syntax=docker/dockerfile:1

# Build stage: the Go toolchain is only needed to produce the binary.
FROM golang:1.27-alpine AS build

WORKDIR /src

# go.mod is copied first so the dependency layer is cached independently of the
# source. There are no third-party dependencies today, which is exactly what
# `go mod download` proving empty confirms.
COPY go.mod ./
RUN go mod download

COPY . .

# CGO_ENABLED=0 produces a static binary, which is what lets the final stage be
# `scratch`: there is no libc in the runtime image to link against.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Runtime stage: nothing but the binary. No shell, no package manager, no OS
# packages to patch.
FROM scratch AS run

COPY --from=build /out/server /server

# Numeric because scratch has no /etc/passwd to resolve a user name against.
USER 65534:65534

EXPOSE 8080
ENTRYPOINT ["/server"]
