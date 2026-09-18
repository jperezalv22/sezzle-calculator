# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty means same origin: nginx proxies /api to the backend. Otherwise the app
# would call http://localhost:8080, which only works by coincidence.
ENV VITE_API_BASE_URL=""
RUN npm run build

# nginx serves the static build and proxies /api, like the Vite dev proxy.
FROM nginx:1.27-alpine AS run

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
