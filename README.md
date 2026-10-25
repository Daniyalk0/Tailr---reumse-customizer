# Tailr — Resume Customizer

Tailr helps job seekers adapt an existing resume to a specific job description. It extracts text from a resume, lets the user review and edit it, and uses Google's Gemini API to produce a complete, role-focused version. The goal is to make tailoring easier while keeping the candidate's claims grounded in their original experience.

## Features

- Upload a PDF or DOCX resume (up to 10 MB) and review or edit its extracted text.
- Analyze resume formatting and optionally compare it with a job description at `/analyze`.
- Paste a job description (up to 20,000 characters).
- Generate an AI-customized resume with suggested keywords for relevant qualifications that are missing or only partly supported.
- Review and edit the generated resume and download it as PDF or DOCX.
- Receive in-app feedback for upload, customization, and download errors.
- One resume generation per guest per UTC day, with a visible "generations remaining" indicator on the customize page.
- Guest identity is a UUID stored in the browser's `localStorage`; no account is required.
- Generate button is rate-limited to 5 requests per minute per IP address.

## Technology

- **Frontend:** Next.js 16, React 19, TypeScript, and Tailwind CSS 4.
- **Backend:** Python, FastAPI, Uvicorn, and Pydantic.
- **AI:** Groq API using the openai/gpt-oss-120b model.
- **Documents:** `pypdf` extracts PDF text; `python-docx` reads DOCX and creates DOCX files; ReportLab generates PDFs.
- **Database:** Neon PostgreSQL, accessed via SQLAlchemy with Alembic migrations.  
- **Quota & rate limiting:** Per-guest daily quota enforced atomically in PostgreSQL; SlowAPI for request rate limiting.  

## How it works

1. The browser sends the selected resume to FastAPI, which validates the file and extracts its text.
2. The user reviews or edits that text, enters a job description, and submits both to the backend along with a guest identifier.
3. The backend checks the guest's daily quota for the current UTC day and reserves a generation slot before contacting the AI provider. If the quota is exhausted, the request is rejected before any AI call is made.
4. The backend sends the resume text and job description to the AI provider and validates the response, which contains a customized resume and suggested keywords.
5. On success, the reservation is converted into a successful generation. On failure, it is released, so a failed attempt does not count against the daily limit.
6. The browser presents the result for review and editing. The backend can generate a PDF or DOCX download from the resulting text.

The application does not store resumes, job descriptions, or user accounts. The only persisted data is a per-guest daily usage counter used to enforce the daily generation limit. Resume text and the job description are sent to the AI provider when customization is requested.

The customize page shows the guest's remaining generations for the current UTC day and refreshes after a successful generation. When the quota is exhausted, the page indicates when the next generation becomes available. This indicator is informational only; the backend enforces the limit independently.

The application does not store resumes in a database or provide accounts or resume history. Resume text and the job description are sent to Gemini when customization is requested.

## Project structure

```text
├── backend/
│   ├── main.py                    # FastAPI app and API routes
│   ├── schemas.py                 # Request and response validation
│   ├── database.py                # SQLAlchemy engine and session factory
│   ├── models.py                  # GuestUsage ORM model
│   ├── requirements.txt           # Python dependencies
│   └── services/
│       ├── resume_customizer.py   # Groq integration and customization prompt
│       ├── resume_parser.py       # PDF/DOCX text extraction
│       ├── resume_exporter.py     # PDF/DOCX generation
│       └── quota_service.py       # Per-guest daily quota enforcement
├── frontend/
│   ├── app/                       # Next.js app and routes
│   ├── components/                # Upload, input, preview, feedback, downloads, ErrorToast, dashboard
│   ├── lib/                       # Resume text and keyword helpers
│   ├── package.json               # Frontend scripts and dependencies
│   └── package-lock.json
├── .env.example                   # Backend environment template
└── README.md
```

## Local setup

Prerequisites: Python 3.10 or later, Node.js and npm compatible with the version of Next.js in `frontend/package.json`, an AI provider API key, and a PostgreSQL database (Neon's free tier is sufficient).

Run these commands in PowerShell from the repository root.

### 1. Configure and start the backend

Copy the provided environment template and add your key:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and provide the backend's required values: the AI provider's API key and the database connection string. Do not commit secrets.

Then create a virtual environment, install the pinned dependencies, apply database migrations, and start the API:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
alembic upgrade head
python -m uvicorn backend.main:app --reload
```

The API runs at `http://127.0.0.1:8000`; its interactive docs are at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

In a second terminal, from the repository root:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. The frontend uses `http://127.0.0.1:8000` as its default backend URL, so no frontend environment file is needed for this local setup. To use a different API base URL, set `NEXT_PUBLIC_API_URL` in the frontend environment before starting/building the app.

## Environment variables

| Variable | Required | Used by | Purpose |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | Yes | Backend | Groq API key. The backend loads it from the repository-root `.env` file or the process environment. |
| `DATABASE_URL` | Yes | Backend | PostgreSQL connection string (Neon) used by SQLAlchemy. |
| `FRONTEND_ORIGINS` | No | Backend | Comma-separated allowed browser origins for CORS. Defaults to `http://localhost:3000,http://127.0.0.1:3000`. |
| `NEXT_PUBLIC_API_URL` | No | Frontend | Backend API base URL. Defaults to `http://127.0.0.1:8000`. This value is exposed to browser code; never put secrets in it. |

## Deployment

- Configure the backend with its required environment values: the AI provider's API key, the database connection string, and the deployed frontend origin(s) allowed by CORS.
- Apply database migrations against the production database before serving traffic for the first time.
- Configure the frontend's API base URL to point at the backend's public URL.

## Limitations

- Only PDF and DOCX resumes are accepted; uploads are limited to 10 MB.
- Password-protected PDFs are not supported. Scanned/image-only PDFs may not work because extraction does not perform OCR.
- DOCX text extraction reads document paragraphs and may omit content stored in tables or other structures.
- Extracted and customized resume text is limited to 50,000 characters; job descriptions are limited to 20,000 characters.
- AI-generated content and suggested keywords can be inaccurate. Review the customized resume and confirm every claim before using it; suggested keywords are not proof of a qualification.
