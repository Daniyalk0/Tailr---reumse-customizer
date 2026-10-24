from io import BytesIO

from docx import Document
from fastapi import HTTPException
from pypdf import PdfReader

from backend.schemas import MAX_RESUME_TEXT_LENGTH


def extract_docx_text(content: bytes) -> str:
    document = Document(BytesIO(content))
    parts = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            parts.append(paragraph.text)

    for table in document.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                parts.append(" | ".join(cells))

    return "\n".join(parts)


def extract_resume_text(filename: str, content: bytes) -> str:
    filename = filename.lower()

    if not filename.endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported",
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded resume is empty",
        )

    if filename.endswith(".pdf"):
        if b"%PDF-" not in content[:1024]:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid PDF",
            )
    elif not content.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid DOCX document",
        )

    try:
        if filename.endswith(".pdf"):
            reader = PdfReader(BytesIO(content))
            if reader.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported",
                )
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            text = extract_docx_text(content)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not read the resume file. Check that it is a valid, unprotected PDF or DOCX.",
        ) from exc

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text found in the resume",
        )

    if len(text) > MAX_RESUME_TEXT_LENGTH:
        raise HTTPException(
            status_code=413,
            detail=(
                "The extracted resume exceeds the "
                f"{MAX_RESUME_TEXT_LENGTH:,}-character limit"
            ),
        )

    return text
