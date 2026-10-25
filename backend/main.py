import logging
import os
from io import BytesIO
from uuid import UUID
from fastapi import Header
from pydantic import ValidationError
from backend.services.quota_service import (
    get_guest_quota_status,
    reserve_guest_generation,
    finalize_guest_generation,
)
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from backend.schemas import (
    CustomizeResumeRequest,
    CustomizeResumeResponse,
    DownloadResumeRequest,
    MAX_RESUME_TEXT_LENGTH,
)
from backend.services.resume_parser import extract_resume_text
from backend.services.resume_customizer import (
    customize_resume,
    get_sanitized_error_message,
    get_upstream_status_code,
)
from fastapi.responses import StreamingResponse
from backend.services.resume_exporter import generate_docx, generate_pdf
from fastapi import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from backend.schemas import ATSAnalysisRequest, ATSAnalysisResponse
from backend.services.ats_analyzer import analyze_resume
from fastapi import File, Form, UploadFile

logger = logging.getLogger(__name__)
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

app = FastAPI()

limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)

frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins.split(",")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Resume Customizer API is running"}


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported",
        )

    content = await file.read(MAX_UPLOAD_SIZE_BYTES + 1)
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The uploaded file exceeds the 10 MB limit",
        )

    text = extract_resume_text(
        filename=filename,
        content=content,
    )

    return {
        "filename": filename,
        "extracted_text": text,
    }


@app.post("/customize-resume", response_model=CustomizeResumeResponse)
@limiter.limit("5/minute")
def customize_resume_endpoint(
    request: Request,
    body: CustomizeResumeRequest,
    guest_id: str = Header(..., alias="X-Guest-ID"),
):
    # Accept only UUID-form guest identifiers.
    try:
        guest_id = str(UUID(guest_id))
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="A valid guest ID is required.",
        ) from None

    usage_date = reserve_guest_generation(guest_id)
    succeeded = False

    try:
        result = customize_resume(
            resume_text=body.resume_text,
            job_description=body.job_description,
        )
        result = CustomizeResumeResponse.model_validate(result)

        customized_text = result.customized_resume
        if not customized_text.strip():
            raise RuntimeError("The AI returned an empty response")
        if len(customized_text) > MAX_RESUME_TEXT_LENGTH:
            raise RuntimeError(
                "The AI response exceeds the "
                f"{MAX_RESUME_TEXT_LENGTH:,}-character limit"
            )

        succeeded = True
        return result

    except HTTPException:
        raise

    except Exception as exc:
        status_code = get_upstream_status_code(exc)
        import traceback
        traceback.print_exc() 
        logger.error(
            "Resume customization failed (%s, upstream HTTP %s): %s",
            type(exc).__name__,
            status_code if status_code is not None else "unknown",
            get_sanitized_error_message(
                exc,
                sensitive_values=(body.resume_text, body.job_description),
            ),
        )

        if status_code == 503:
            raise HTTPException(
                status_code=503,
                detail="The AI service is temporarily unavailable. Please try again later.",
            ) from None

        if status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="The AI service is rate limited. Please wait before trying again.",
            ) from None

        raise HTTPException(
            status_code=502,
            detail="AI customization failed. Please try again later.",
        ) from None

    finally:
        try:
            finalize_guest_generation(
                guest_id,
                usage_date,
                succeeded=succeeded,
            )
        except Exception:
            logger.exception(
                "Failed to finalize guest quota reservation "
                "(guest_id=%s, usage_date=%s, succeeded=%s)",
                guest_id,
                usage_date,
                succeeded,
            )


@app.post("/analyze-resume", response_model=ATSAnalysisResponse)
async def analyze_resume_endpoint(
    file: UploadFile | None = File(default=None),
    resume_text: str | None = Form(default=None),
    job_description: str | None = Form(default=None),
):
    if file is not None and resume_text is not None:
        raise HTTPException(
            status_code=400,
            detail="Provide a file or resume text, not both.",
        )

    if file is not None:
        filename = file.filename or ""

        if not filename.lower().endswith((".pdf", ".docx")):
            raise HTTPException(
                status_code=400,
                detail="Only PDF and DOCX files are supported.",
            )

        content = await file.read(MAX_UPLOAD_SIZE_BYTES + 1)

        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail="The uploaded file exceeds the 10 MB limit.",
            )

        resume_text = extract_resume_text(filename, content)

    try:
        request_data = ATSAnalysisRequest(
            resume_text=resume_text,
            job_description=job_description,
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors(include_input=False),
        ) from exc

    try:
        return analyze_resume(
            resume_text=request_data.resume_text,
            job_description=request_data.job_description,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail="ATS analysis is temporarily unavailable. Please try again.",
        ) from exc


@app.post("/download-resume/docx")
def download_resume_docx(request: DownloadResumeRequest):
    try:
        docx_bytes = generate_docx(request.resume_text)

        return StreamingResponse(
            BytesIO(docx_bytes),
            media_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
            headers={
                "Content-Disposition": ('attachment; filename="customized_resume.docx"')
            },
        )
    except Exception as exc:
        logger.exception("DOCX export failed")
        raise HTTPException(
            status_code=500,
            detail="Could not generate the DOCX resume. Please try again.",
        ) from exc


@app.post("/download-resume/pdf")
def download_resume_pdf(request: DownloadResumeRequest):
    try:
        pdf_bytes = generate_pdf(request.resume_text)

        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="customized_resume.pdf"'
            },
        )
    except Exception as exc:
        logger.exception("PDF export failed")
        raise HTTPException(
            status_code=500,
            detail="Could not generate the PDF resume. Please try again.",
        ) from exc


@app.get("/quota-status")
def quota_status_endpoint(
    guest_id: str = Header(..., alias="X-Guest-ID"),
):
    try:
        guest_id = str(UUID(guest_id))
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="A valid guest ID is required.",
        ) from None

    return get_guest_quota_status(guest_id)
