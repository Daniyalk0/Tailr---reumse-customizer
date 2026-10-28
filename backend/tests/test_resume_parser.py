from io import BytesIO

import pytest
from docx import Document
from fastapi import HTTPException
from pypdf import PdfWriter

from backend.schemas import MAX_RESUME_TEXT_LENGTH
from backend.services.resume_parser import extract_resume_text


def create_docx(text: str = "Resume content") -> bytes:
    document = Document()
    document.add_paragraph(text)
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def create_pdf(text: str = "Resume content") -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.add_metadata({"/Title": text})
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_rejects_unsupported_extension():
    with pytest.raises(HTTPException) as exc:
        extract_resume_text("resume.txt", b"some content")

    assert exc.value.status_code == 400


def test_rejects_empty_file():
    with pytest.raises(HTTPException) as exc:
        extract_resume_text("resume.pdf", b"")

    assert exc.value.status_code == 400
    assert "empty" in exc.value.detail.lower()


def test_rejects_invalid_pdf_signature():
    with pytest.raises(HTTPException) as exc:
        extract_resume_text("resume.pdf", b"This is not a PDF")

    assert exc.value.status_code == 400
    assert "valid PDF" in exc.value.detail


def test_rejects_invalid_docx_signature():
    with pytest.raises(HTTPException) as exc:
        extract_resume_text("resume.docx", b"This is not a DOCX")

    assert exc.value.status_code == 400
    assert "valid DOCX" in exc.value.detail


def test_rejects_password_protected_pdf():
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.encrypt("secret")

    buffer = BytesIO()
    writer.write(buffer)

    with pytest.raises(HTTPException) as exc:
        extract_resume_text("resume.pdf", buffer.getvalue())

    assert exc.value.status_code == 400
    assert "Password-protected" in exc.value.detail


def test_rejects_pdf_with_no_extractable_text():
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)

    buffer = BytesIO()
    writer.write(buffer)

    with pytest.raises(HTTPException) as exc:
        extract_resume_text("resume.pdf", buffer.getvalue())

    assert exc.value.status_code == 400
    assert "No readable text" in exc.value.detail


def test_rejects_extracted_text_over_limit(monkeypatch):
    monkeypatch.setattr("backend.services.resume_parser.MAX_RESUME_TEXT_LENGTH", 5)

    content = create_docx(
        "Daniyal Khan\n"
        "Education: Diploma in Computer Science\n"
        "Skills: Python, React and SQL"
    )

    with pytest.raises(HTTPException) as exc:
        extract_resume_text("resume.docx", content)

    assert exc.value.status_code == 413


def test_extracts_valid_docx():
    content = create_docx(
        "Daniyal Khan - Software Developer\n"
        "Education: Diploma in Computer Science\n"
        "Skills: Python, React, SQL and web development"
    )

    result = extract_resume_text("resume.docx", content)

    assert "Daniyal Khan" in result
    assert "Software Developer" in result


def test_extracts_valid_pdf():
    from reportlab.pdfgen import canvas

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(
        50,
        750,
        "Daniyal Khan - Software Developer - Education and Skills in Python React SQL",
    )
    pdf.save()

    result = extract_resume_text("resume.pdf", buffer.getvalue())

    assert "Daniyal Khan" in result
    assert "Software Developer" in result


def test_rejects_unrelated_document():
    content = create_docx(
        "This document describes the history of ancient civilizations "
        "and explains several historical events in detail."
    )

    with pytest.raises(HTTPException) as exc:
        extract_resume_text("document.docx", content)

    assert exc.value.status_code == 400
    assert "doesn't appear to be a resume" in exc.value.detail


def test_accepts_fresher_resume_without_professional_experience():
    content = create_docx(
        "Daniyal Khan\n"
        "Education: Diploma in Computer Science\n"
        "Skills: Python, React, SQL\n"
        "Projects: Resume Customizer and Ecommerce Application"
    )

    result = extract_resume_text("resume.docx", content)

    assert "Education" in result
    assert "Projects" in result


def test_accepts_resume_with_contact_information():
    content = create_docx(
        "Daniyal Khan\n"
        "daniyal@example.com\n"
        "Built applications and learned modern software development tools."
    )

    result = extract_resume_text("resume.docx", content)

    assert "daniyal@example.com" in result


from zipfile import ZIP_DEFLATED, ZipFile

from backend.services.resume_parser import (
    MAX_PDF_PAGES,
    MAX_DOCX_UNCOMPRESSED_SIZE,
    MAX_DOCX_COMPRESSION_RATIO,
    DOCX_RATIO_CHECK_MIN_SIZE,
    validate_docx_archive,
)


def test_rejects_pdf_over_page_limit():
    from pypdf import PdfWriter

    writer = PdfWriter()
    for _ in range(MAX_PDF_PAGES + 1):
        writer.add_blank_page(width=72, height=72)

    buffer = BytesIO()
    writer.write(buffer)

    with pytest.raises(HTTPException) as exc:
        extract_resume_text("resume.pdf", buffer.getvalue())

    assert exc.value.status_code == 413
    assert "pages" in exc.value.detail.lower()


def test_rejects_docx_over_uncompressed_size_limit():
    content = b"x" * (MAX_DOCX_UNCOMPRESSED_SIZE + 1)

    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", content)

    with pytest.raises(HTTPException) as exc:
        validate_docx_archive(buffer.getvalue())

    assert exc.value.status_code == 413


def test_rejects_docx_with_high_compression_ratio():
    content = b"x" * (DOCX_RATIO_CHECK_MIN_SIZE + 1)

    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", content)

    with pytest.raises(HTTPException) as exc:
        validate_docx_archive(buffer.getvalue())

    assert exc.value.status_code == 413
    assert "compression ratio" in exc.value.detail.lower()
