# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=
ENV CORS_ORIGIN=*
ENV STORAGE_BACKEND=local
ENV MINIO_ENDPOINT=
ENV MINIO_REGION=us-east-1
ENV MINIO_ACCESS_KEY=
ENV MINIO_SECRET_KEY=
ENV MINIO_USE_SSL=false
ENV MINIO_FORCE_PATH_STYLE=true
ENV UPLOADS_DIR=/app/uploads
ENV AUTH_ENABLED=true
ENV AUTH0_ISSUER_BASE_URL=
ENV AUTH0_AUDIENCE=
ENV ADMIN_EMAILS=

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
