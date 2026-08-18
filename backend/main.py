import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import models
import database
from routers import profile, settings, generate, export, applications, auth

# Create SQLite tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="CV Generator API",
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

# Register API Routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(settings.router)
app.include_router(generate.router)
app.include_router(export.router)
app.include_router(applications.router)


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

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        candidate = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

else:

    @app.get("/")
    def root():
        return {
            "status": "healthy",
            "message": "CV Generator API is active and running.",
            "endpoints": [
                "/api/profile",
                "/api/settings",
                "/api/generate",
                "/api/export-pdf",
                "/api/applications",
                "/docs",
            ],
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
