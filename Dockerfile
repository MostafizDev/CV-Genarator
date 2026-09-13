# Stage 1: build the React frontend
FROM node:20-slim AS frontend-build
WORKDIR /frontend

# Firebase Web App config gets baked into the built JS bundle at build time (Vite env
# vars are compile-time, not runtime) -- pass these as --build-arg (or fly.toml
# [build.args], see README) when building this image. Safe to bake in: Firebase's
# security model is rule/Admin-SDK-based, not key-secrecy-based.
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend runtime, serving the built frontend as static files
FROM python:3.12-slim

# System libraries WeasyPrint needs to render PDFs (Pango/Cairo/GDK-Pixbuf stack),
# plus a metric-compatible Arial substitute since Linux has no Arial by default.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi8 \
    shared-mime-info \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /frontend/dist ./static

# Persistent volume mount point for the SQLite DB -- set DATABASE_URL to point here,
# e.g. sqlite:////data/app.db, on hosts with an attachable persistent volume.
RUN mkdir -p /data

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
