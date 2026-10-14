# Tailr — Resume Customizer

Tailr helps job seekers adapt an existing resume to a specific job description. It extracts text from a resume, lets the user review and edit it, and uses Google's Gemini API to produce a complete, role-focused version. The goal is to make tailoring easier while keeping the candidate's claims grounded in their original experience.

## Features

- Upload a PDF or DOCX resume (up to 10 MB) and review or edit its extracted text.
- Paste a job description (up to 20,000 characters).
- Generate an AI-customized resume with suggested keywords for relevant qualifications that are missing or only partly supported.
- Review and edit the generated resume and download it as PDF or DOCX.
- Receive in-app feedback for upload, customization, and download errors.

## Technology

- **Frontend:** Next.js 16, React 19, TypeScript, and Tailwind CSS 4.
- **Backend:** Python, FastAPI, Uvicorn, and Pydantic.
- **AI:** Google's Gemini API through the `google-genai` Python SDK, using the `gemini-3.5-flash-lite` model.
- **Documents:** `pypdf` extracts PDF text; `python-docx` reads DOCX and creates DOCX files; ReportLab generates PDFs.

## How it works

1. The browser sends the selected resume to FastAPI, which validates the file and extracts its text.
2. The user reviews or edits that text, enters a job description, and submits both to the backend.
3. FastAPI sends the resume text and job description to Gemini and validates the response, which contains a customized resume and suggested keywords.
4. The browser presents the result for review and editing. The backend can generate a PDF or DOCX download from the resulting text.

The application does not store resumes in a database or provide accounts or resume history. Resume text and the job description are sent to Gemini when customization is requested.

## Project structure

```text
.
├── backend/
│   ├── main.py                    # FastAPI app and API routes
│   ├── schemas.py                 # Request and response validation
│   ├── requirements.txt           # Python dependencies
│   └── services/
│       ├── resume_customizer.py   # Gemini integration and customization prompt
│       ├── resume_parser.py       # PDF/DOCX text extraction
│       └── resume_exporter.py     # PDF/DOCX generation
├── frontend/
│   ├── app/                       # Next.js app and main page
│   ├── components/                # Upload, input, preview, feedback, downloads
│   ├── lib/                       # Resume text and keyword helpers
│   ├── package.json               # Frontend scripts and dependencies
│   └── package-lock.json
├── .env.example                   # Backend environment template
└── README.md
```

## Local setup

Prerequisites: Python 3.10 or later, Node.js and npm compatible with the version of Next.js in `frontend/package.json`, and a Google Gemini API key.

Run these commands in PowerShell from the repository root.

### 1. Configure and start the backend

Copy the provided environment template and add your key:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace `YOUR_GEMINI_API_KEY_HERE` with your Gemini API key. Do not commit the real key.

Create a virtual environment, install the pinned dependencies, and start the API:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
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
| `GEMINI_API_KEY` | Yes | Backend | Google Gemini API key. The backend loads it from the repository-root `.env` file or the process environment. |
| `FRONTEND_ORIGINS` | No | Backend | Comma-separated allowed browser origins for CORS. Defaults to `http://localhost:3000,http://127.0.0.1:3000`. |
| `NEXT_PUBLIC_API_URL` | No | Frontend | Backend API base URL. Defaults to `http://127.0.0.1:8000`. This value is exposed to browser code; never put secrets in it. |

## Deployment

No live frontend or backend URLs, hosting configuration, or deployment scripts are confirmed in this repository. For a deployment, configure the backend with `GEMINI_API_KEY` and the deployed frontend origin(s) in `FRONTEND_ORIGINS`; configure the frontend's `NEXT_PUBLIC_API_URL` with the backend's public base URL.

## Limitations

- Only PDF and DOCX resumes are accepted; uploads are limited to 10 MB.
- Password-protected PDFs are not supported. Scanned/image-only PDFs may not work because extraction does not perform OCR.
- DOCX text extraction reads document paragraphs and may omit content stored in tables or other structures.
- Extracted and customized resume text is limited to 50,000 characters; job descriptions are limited to 20,000 characters.
- AI-generated content and suggested keywords can be inaccurate. Review the customized resume and confirm every claim before using it; suggested keywords are not proof of a qualification.
