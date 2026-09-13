# CV Generator

A full-stack, multi-user application that manages a candidate's master profile and uses AI to generate tailored, ATS-optimized CVs and cover letters for specific job descriptions — with a built-in application tracker, custom PDF templates, and self-serve Google sign-in.

---

## Features

- **Self-serve Google sign-in** — authentication via Firebase (Google provider only). Anyone who signs in gets their own account and empty profile automatically; there's no admin approval step.
- **Master profile** — personal details, summary, skills, experience, projects, certifications, and education.
- **Resume import** — upload an existing PDF/DOCX resume to either extract raw text or have AI parse it directly into a structured profile.
- **Multi-provider AI support** — OpenAI, Anthropic (Claude), Gemini, Groq, and DeepSeek, configured per-user with a connection test before saving.
- **Tailored generation** — paste a job description and get a tailored CV (structured JSON) and cover letter, matched to the role. Contact info is always the verbatim profile data, and projects are ranked by keyword relevance rather than AI-rewritten, so nothing is fabricated.
- **Application tracker** — every generation is saved; review, edit, update status, or delete past applications.
- **Custom PDF templates** — export using the built-in CV/cover-letter templates, or create your own HTML/CSS (Jinja2) template and select it as your default.

---

## Project Structure

```
cv-generator/
├── Dockerfile                   # Multi-stage build: frontend -> static, backend serves both
├── fly.toml                     # Fly.io deployment config
├── backend/
│   ├── main.py                  # FastAPI entry point, CORS, static frontend serving
│   ├── database.py              # SQLite + SQLAlchemy session setup
│   ├── models.py                # User, Profile, Experience, Project, Certification,
│   │                             # Education, ProviderSetting, Application, Template
│   ├── schemas.py                # Pydantic validation models
│   ├── core/
│   │   └── firebase_auth.py      # Verifies Firebase ID tokens (Firebase Admin SDK)
│   ├── migrations.py            # Idempotent startup setup (seeds built-in templates)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py               # /api/auth (self-service account sync, current user)
│   │   ├── profile.py            # /api/profile (CRUD) & upload-cv / parse-cv
│   │   ├── settings.py           # /api/settings (AI provider config, model list, test)
│   │   ├── generate.py           # /api/generate (tailored CV & cover letter)
│   │   ├── export.py             # /api/export-pdf (renders via a template_id)
│   │   ├── applications.py       # /api/applications (tracker CRUD)
│   │   └── templates.py          # /api/templates (list/create/delete custom templates)
│   ├── services/
│   │   ├── ai/
│   │   │   ├── base.py             # AiProvider protocol
│   │   │   ├── openai_provider.py
│   │   │   ├── claude_provider.py
│   │   │   ├── gemini_provider.py
│   │   │   ├── groq_provider.py
│   │   │   ├── deepseek_provider.py
│   │   │   └── router.py           # Resolves a user's active provider
│   │   ├── prompts/
│   │   │   ├── cv.py               # Tailored CV prompt builder
│   │   │   ├── cover_letter.py     # Cover letter prompt builder
│   │   │   └── parse_cv.py         # AI resume-parsing prompt builder
│   │   ├── pdf/
│   │   │   ├── templates.py        # Built-in CV/cover-letter HTML + Jinja2 env for custom ones
│   │   │   └── render.py           # Resolves a template_id -> HTML -> PDF (WeasyPrint)
│   │   └── project_matching.py     # Keyword-based project ranking/highlighting
│   └── tests/
│       └── test_api.py
│
└── frontend/
    ├── vite.config.ts            # Dev server + /api proxy to http://localhost:8000
    ├── .env.example              # Firebase Web App config template
    └── src/
        ├── firebase.ts            # Firebase client SDK init (auth + Google provider)
        ├── api/client.ts          # Single fetch wrapper for all backend calls
        ├── types/index.ts         # Shared TypeScript interfaces
        ├── components/
        │   ├── LoginGate.tsx        # Wraps the app; Google sign-in before any route renders
        │   ├── Navbar.tsx
        │   ├── CvPreviewPanel.tsx
        │   └── CoverLetterPreviewPanel.tsx
        ├── pages/
        │   ├── ProfilePage.tsx       # Profile editor + resume upload
        │   ├── SettingsPage.tsx      # AI provider credentials & default template picker
        │   ├── NewApplicationPage.tsx # Tailor a new application, preview CV/cover letter
        │   ├── TrackerPage.tsx       # List of past applications
        │   ├── ApplicationDetailPage.tsx
        │   └── TemplatesPage.tsx     # View built-ins, create/delete custom templates
        ├── utils/
        │   ├── pdfExport.ts
        │   └── templatePrefs.ts     # Client-side default-template selection
        └── App.tsx                  # Route definitions
```

---

## Quick Start (local development)

### 0. Set up Firebase (one-time)

1. Create a project at the [Firebase console](https://console.firebase.google.com/).
2. **Authentication** → Sign-in method → enable **Google**.
3. **Project settings** → General → Your apps → add a **Web app** → copy the config values into `frontend/.env` (see `frontend/.env.example`).
4. **Project settings** → Service accounts → Generate new private key → save the downloaded JSON; the backend needs it as `FIREBASE_SERVICE_ACCOUNT_JSON` (see below).

### 1. Run the Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export FIREBASE_PROJECT_ID=your-firebase-project-id
export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend runs at **`http://localhost:8000`** (interactive API docs at **`http://localhost:8000/docs`**).

### 2. Run the Frontend

```bash
cd frontend
cp .env.example .env   # fill in the VITE_FIREBASE_* values from the Firebase console
npm install
npm run dev
```

The frontend runs at **`http://localhost:5173`** (proxying `/api` calls to the backend).

### 3. Run Backend Tests

```bash
cd backend
./venv/bin/pytest -v
```

The test suite fakes Firebase token verification (no real Firebase project needed to run it).

> **Upgrading an existing local database?** This app treats local SQLite data as disposable across breaking schema changes — user identity moved from an auto-increment integer to a Firebase UID (string), which SQLite can't `ALTER` in place. Delete `backend/app.db` (and `backend/test_app.db`) before running for the first time after this change; a fresh one is created automatically.

---

## How to Use

1. **Sign in with Google** — your account and an empty profile are created automatically on first sign-in.
2. **Candidate Profile (`/profile`)**:
   - Fill in personal details, summary, skills, experience, projects, certifications, and education.
   - Or upload an existing resume (.pdf/.docx) — extract raw text, or let AI parse it straight into structured profile fields.
   - Click **Save Profile**.
3. **AI Provider Settings (`/settings`)**:
   - Choose a provider (OpenAI, Anthropic, Gemini, Groq, or DeepSeek), paste an API key, pick a model, and test the connection before saving.
   - Pick your default CV and cover-letter templates (built-in, or one of your own from `/templates`).
4. **Templates (`/templates`)**:
   - View the built-in templates, or create your own by pasting HTML/CSS. A CV template can reference `cv` (all profile fields); a cover letter template can reference `text`.
5. **Tailor an Application (`/new-application`)**:
   - Paste the target Company, Job Title, and full Job Description, then generate.
   - Review the tailored CV (structured or raw JSON) and cover letter, and export either as a PDF using your selected template.
6. **Tracker (`/tracker`)**:
   - Every generation is saved automatically; revisit, update status, or delete past applications.

---

## Deployment

The app ships as a single Docker image: the frontend is built and copied into `backend/static`, and FastAPI serves both the API and the SPA (with fallback routing for client-side routes).

Firebase's Web App config is compiled into the frontend bundle at **image build time** (Vite env vars are compile-time), so pass them as build args:

```bash
docker build -t cv-generator \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=... \
  --build-arg VITE_FIREBASE_PROJECT_ID=... \
  --build-arg VITE_FIREBASE_APP_ID=... \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=... \
  .

docker run -p 8000:8000 \
  -e FIREBASE_PROJECT_ID=... \
  -e FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" \
  cv-generator
```

Configured for [Fly.io](https://fly.io) in `fly.toml` (persistent SQLite volume mounted at `/data`, health check at `/healthz`). Fill in the `[build.args]` values in `fly.toml` with your Firebase Web App config, set the backend secret, then deploy:

```bash
fly secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
fly deploy
```

Set `CORS_ORIGINS` (comma-separated) if the frontend is ever served from a different origin than the backend.
