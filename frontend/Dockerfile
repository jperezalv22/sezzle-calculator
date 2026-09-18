# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

# npm ci installs exactly what the lockfile pins, and fails rather than
# silently updating it — which is what you want in a build.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty base URL: the built app calls /api on its own origin, and nginx below
# proxies that to the backend. Without this it would fall back to
# http://localhost:8080, which only works by coincidence of the host port.
ENV VITE_API_BASE_URL=""
RUN npm run build

# The built app is static files, so the runtime only needs a web server. nginx
# also proxies /api, which keeps the browser on one origin exactly as the Vite
# dev proxy does.
FROM nginx:1.27-alpine AS run

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
