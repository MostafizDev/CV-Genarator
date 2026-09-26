import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import models
import database
import migrations
from core import crypto
from routers import profile, settings, generate, export, applications, auth, preferences
# from routers import templates

# Refuse to start without an encryption key rather than failing on a user's first request.
crypto.assert_configured()

# Create tables, seed built-in templates and apply row level security (all idempotent).
# Schema changes use the owner connection; requests use the restricted runtime one.
models.Base.metadata.create_all(bind=database.migration_engine)
migrations.run_migrations(database.migration_engine, database.engine)

app = FastAPI(
    title="Backedstory API",
    description="Backend API for managing candidate profiles, AI provider settings, and CV/cover letter generation.",
    version="1.0.0",
)

# Configure CORS for local development and Vite frontend. In production, set
# CORS_ORIGINS to your deployed frontend's exact origin(s), comma-separated
# (e.g. "https://username.github.io") to stop allowing every origin.
_extra_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
origins = _extra_origins or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Tell browsers to only ever use HTTPS for this site (the host terminates TLS and
    # forwards X-Forwarded-Proto). Skipped on plain-http localhost development.
    if request.headers.get("x-forwarded-proto") == "https" or request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # API responses carry personal data; keep them out of browser and proxy caches.
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # FastAPI's default 422 body echoes each rejected value back ("input"), which would
    # return passwords and personal data. Keep only where and why it failed.
    errors = [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors})


# Register API Routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(settings.router)
app.include_router(generate.router)
app.include_router(export.router)
app.include_router(applications.router)
app.include_router(preferences.router)
# app.include_router(templates.router)


@app.get("/healthz")
def healthz():
    return {"status": "healthy"}


# In a unified deployment (Docker multi-stage build bundles the frontend into
# backend/static), serve the built React app for "/" and any other non-API path,
# with SPA fallback so client-side routes like /tracker/5 work on a hard refresh.
# Locally, backend/static doesn't exist, so "/" just returns the API health check
# as before -- this keeps local dev and the test suite unchanged.
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(STATIC_DIR):

    _STATIC_ROOT = os.path.realpath(STATIC_DIR)

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        candidate = os.path.realpath(os.path.join(_STATIC_ROOT, full_path))
        # Only serve files that really live inside static/ -- a path like "../app.db"
        # (or its %2e%2e-encoded form) must never reach the database or secrets.
        inside_static = candidate == _STATIC_ROOT or candidate.startswith(_STATIC_ROOT + os.sep)
        if full_path and inside_static and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_STATIC_ROOT, "index.html"))

else:

    @app.get("/")
    def root():
        return {
            "status": "healthy",
            "message": "Backedstory API is active and running.",
            "endpoints": [
                "/api/auth",
                "/api/profile",
                "/api/settings",
                "/api/generate",
                "/api/export-pdf",
                "/api/applications",
                "/api/preferences",
                # "/api/templates",
                "/docs",
            ],
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
