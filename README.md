# CV Generator (Phase 1)

An AI-powered full-stack application that manages a candidate's master profile, extracts text from existing resumes, and generates tailored, ATS-optimized CVs and high-impact cover letters matching specific job descriptions using OpenAI.

---

## Project Structure

```
cv-generator/
├── backend/
│   ├── database.py              # SQLite + SQLAlchemy session setup
│   ├── models.py                # Profile, Experience, Project, Certification, Education, ProviderSetting
│   ├── schemas.py               # Pydantic validation models
│   ├── main.py                  # FastAPI entry point & CORS
│   ├── requirements.txt         # Python dependencies
│   ├── routers/
│   │   ├── profile.py           # /api/profile (CRUD) & /api/profile/upload-cv (PDF/DOCX text extraction)
│   │   ├── settings.py          # /api/settings (OpenAI config)
│   │   └── generate.py          # /api/generate (Tailored CV & Cover Letter generation)
│   ├── services/
│   │   ├── ai/
│   │   │   ├── base.py          # AiProvider Protocol
│   │   │   ├── openai_provider.py # OpenAI SDK client implementation
│   │   │   └── router.py        # Active provider resolver
│   │   └── prompts/
│   │       ├── cv.py            # Factual CV prompt builder
│   │       └── cover_letter.py  # High-impact Cover Letter prompt builder
│   └── tests/
│       └── test_api.py          # Automated pytest suite
│
└── frontend/
    ├── src/
    │   ├── api/client.ts        # API client fetch wrappers
    │   ├── types/index.ts       # TypeScript interfaces
    │   ├── components/
    │   │   └── Navbar.tsx       # Top navigation header
    │   ├── pages/
    │   │   ├── ProfilePage.tsx  # Master profile editor + file upload text extractor
    │   │   ├── SettingsPage.tsx # AI provider credentials & model configuration
    │   │   └── NewApplicationPage.tsx # Job application tailor with CV & Cover letter previews
    │   ├── App.tsx              # React router configuration
    │   └── main.tsx             # Application bootstrap
    ├── vite.config.ts           # Vite config with /api proxy to http://localhost:8000
    └── package.json
```

---

## Quick Start

### 1. Run the Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will run at **`http://localhost:8000`** (Interactive API docs at **`http://localhost:8000/docs`**).

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at **`http://localhost:5173`** (proxying `/api` calls directly to the backend).

### 3. Run Backend Tests

```bash
cd backend
./venv/bin/pytest -v
```

---

## How to Use

1. **Candidate Profile (`/profile`)**:
   - Fill in your personal details, summary, core skills, and add your experiences (with achievements/bullet points), projects, certifications, and education.
   - Or click **"Load from File"** to upload an existing resume (.pdf or .docx) and copy extracted text directly into fields.
   - Click **"Save Profile"** to persist your profile into SQLite (`app.db`).

2. **AI Provider Settings (`/settings`)**:
   - Select **OpenAI**, paste your API key, specify your model (e.g., `gpt-4o-mini` or `gpt-4o`), and click **"Save Settings"**.

3. **Tailor Application (`/new-application`)**:
   - Paste the target Company Name, Job Title, and full Job Description.
   - Click **"Generate Tailored Application"**.
   - Review your tailored CV in formatted structured view or raw JSON view.
   - Review and copy your tailored cover letter.
