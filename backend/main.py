import logging
import os
import traceback
from io import BytesIO

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

logger = logging.getLogger(__name__)
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

app = FastAPI()

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
def customize_resume_endpoint(request: CustomizeResumeRequest):
    try:
        result = customize_resume(
            resume_text=request.resume_text,
            job_description=request.job_description,
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

        return result

    except Exception as exc:
        status_code = get_upstream_status_code(exc)
        logger.error(
            "Resume customization failed (%s, upstream HTTP %s): %s\n%s",
            type(exc).__name__,
            status_code if status_code is not None else "unknown",
            get_sanitized_error_message(
                exc,
                sensitive_values=(request.resume_text, request.job_description),
            ),
            "".join(traceback.format_tb(exc.__traceback__)),
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
