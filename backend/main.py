from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
import database
from routers import profile, settings, generate, export, applications

# Create SQLite tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="CV Generator API",
    description="Backend API for managing candidate profiles, AI provider settings, and CV/cover letter generation.",
    version="1.0.0",
)

# Configure CORS for local development and Vite frontend
origins = [
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
app.include_router(profile.router)
app.include_router(settings.router)
app.include_router(generate.router)
app.include_router(export.router)
app.include_router(applications.router)


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
