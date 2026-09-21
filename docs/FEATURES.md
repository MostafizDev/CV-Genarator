# Backedstory: Feature Overview

Backedstory keeps a candidate's master profile and uses AI to write a tailored CV and cover
letter for each job, then tracks every application. Stack: React + Vite + Tailwind (frontend),
FastAPI + SQLAlchemy (backend), Postgres or SQLite, Firebase for Google sign-in.

## 1. Accounts and sign-in
- **Email + password** (`/register`, `/login`): first name, last name, email, password, with a
  "Generate password" option. No email verification. Passwords are stored only as salted scrypt
  hashes; a signed 30-day token keeps you signed in.
- **Google sign-in** via Firebase.
- **One account per email.** A Google sign-in with a verified email links to the existing account
  instead of creating a duplicate. Linking removes any password set on that (unverified) email, so
  a stranger who pre-registered the address can't keep access. Registering with an email that
  already exists is rejected.

## 2. Candidate profile (`/profile`)
- Personal details, summary, skills, experience, projects, certifications, education.
- **Résumé import:** upload PDF/DOCX to extract text, or have AI parse it into profile fields.
  Uploaded files are processed in memory and never saved.

## 3. AI generation (`/new-application`)
- Paste company, position and job description; get a tailored CV (structured) and cover letter.
- Contact details are copied verbatim from the profile and projects are ranked by keyword
  relevance, so nothing is invented. Provider can be overridden per generation.
- Review and edit the output, then export to PDF.

## 4. Application tracker (`/tracker`)
- Every generation is saved. Statuses: Generated, Applied, Interview, Offer, Rejected.
- Open, edit, change status, or delete an application.

## 5. PDF export
- CV and cover letter to PDF (WeasyPrint) using the built-in templates.

## 6. AI provider settings (`/settings`)
- Providers: **Groq, OpenAI, Anthropic, Gemini, DeepSeek**. One default; test the connection.
- **API keys are write-only.** The server keeps them encrypted and only ever returns "key saved"
  plus the last four characters. Leaving the field blank keeps the saved key.
- **Usage and limits panel** per provider, checked with your saved key:

  | Provider | Shown |
  |---|---|
  | Groq | requests per day, tokens per minute (bars) |
  | OpenAI, Anthropic | requests and tokens per minute (bars) |
  | DeepSeek | account balance |
  | Gemini | key health only (Google exposes no quota API) |

  Status: Healthy / Running low (under 15% left) / Limit reached / Invalid key / Unavailable.
  Groq, OpenAI and Anthropic spend one 1-token request per check (cached 20 s).
- **Live model list:** the model chips are the models the provider offers your key, filtered to
  text models (cached 10 min, reload button). Falls back to built-in suggestions if unavailable.

## 7. Public site
- **Homepage** (`/`, signed-out visitors): hero, how it works, features, testimonials, support
  card, final call to action. "Sign In" / "Get Started" go to `/login`.
- **Privacy Policy** (`/privacy`), **Buy Me a Coffee** card, footer **Cookie Settings**.
- **Cookie consent:** first-visit banner (Accept All / Reject Non-Essential / Customize) and a
  preferences dialog. Only essential storage is in use today; preferences and analytics stay off
  unless allowed, and any future non-essential code must go through `runWhenConsented()`.
  The choice is a first-party `bs_consent` cookie (SameSite=Lax, 180 days).
- **Design system:** colors in `src/styles/colors.ts`, Nunito in `typography.ts` (self-hosted),
  assets/links in `src/config/`.

## 8. Security
| Area | What's done |
|---|---|
| Encryption at rest | AES-256-GCM on profile data, work history, projects, certifications, education, applications (company, position, job description, generated CV/cover letter) and API keys. Keys live in `DATA_ENCRYPTION_KEYS`; rotation via `scripts/rotate_encryption_key.py`. |
| Not encrypted | Account identifiers (email, names, password hash), timestamps, provider/model names, statuses. |
| Row Level Security | Postgres policies on every user table. The API connects as a restricted role and sets the acting user per transaction. Not available on SQLite. |
| In transit | HTTPS enforced on Fly; HSTS header; use `?sslmode=require` on hosted Postgres. |
| Hardening | Security headers, `no-store` on API responses, validation errors don't echo values, tokens never logged, static-file path traversal blocked. |
| Secrets | Only in environment / secret store (`backend/.env` locally, gitignored). |

## 9. Configuration
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Runtime DB connection (restricted role on Postgres). Default: SQLite `app.db`. |
| `MIGRATION_DATABASE_URL` | Owner connection for schema changes and migrations. |
| `DATA_ENCRYPTION_KEYS` | `id:base64key[,id:base64key]`, first entry encrypts. **Required**; the app won't start without it. |
| `JWT_SECRET` | Signs email/password login tokens. Set it in production. |
| `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` | Google sign-in verification. |
| `CORS_ORIGINS` | Allowed origins if the frontend is hosted separately. |
| Frontend `VITE_FIREBASE_*`, `VITE_API_BASE` | Firebase web config; API URL for separate hosting. |

## 10. Commands
```bash
# from backend/ with the venv active
scripts/dev_db.sh                                 # local Postgres with owner + restricted roles, writes backend/.env
python -m scripts.migrate_sqlite_to_postgres      # one-time copy from app.db, encrypting and verifying
python -m scripts.rotate_encryption_key           # re-encrypt with the newest key
pytest                                            # backend tests (Postgres RLS tests run when RLS_TEST_* URLs are set)

# from frontend/
npm test                                          # consent-cookie unit tests
```

## 11. Known gaps
- **Templates are switched off** (page, routes and API are commented out; exports use the
  built-in templates). The code is kept.
- Footer links Terms, Cookie Policy and Disclaimer have no pages yet.
- Placeholders to replace: Buy Me a Coffee URL (`config/assets.ts`), support email, testimonials,
  and the privacy policy text (have it reviewed against real behavior).
- Production (Fly) still runs SQLite: encryption applies, Row Level Security does not until it
  moves to Postgres. Set `DATA_ENCRYPTION_KEYS` and `JWT_SECRET` as secrets before deploying.
