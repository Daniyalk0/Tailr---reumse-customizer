import re
from typing import Literal
from uuid import UUID
from fastapi import HTTPException

from backend.schemas import ResumeValidationResponse
from backend.services.llm_client import client
from backend.services.prompts import build_validation_prompt


def validate_resume_claims(
    original_resume: str,
    job_description: str,
    generated_resume: str,
) -> ResumeValidationResponse:
    """Check generated resume claims against the original resume."""

    prompt = build_validation_prompt(
        original_resume=original_resume,
        job_description=job_description,
        generated_resume=generated_resume,
    )

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=1,
        max_completion_tokens=2048,
    )

    generated_text = response.choices[0].message.content

    if not generated_text or not generated_text.strip():
        raise RuntimeError("The AI returned an empty validation response")

    return ResumeValidationResponse.model_validate_json(generated_text)


_NON_WORD_CHARS = re.compile(r"[.*+?^${}()|\[\]\\]")


def _keyword_regex(keyword: str) -> re.Pattern[str]:
    escaped = _NON_WORD_CHARS.sub(r"\\\g<0>", keyword.strip())
    # \b works poorly for tokens ending in punctuation (C++, Node.js),
    # so anchor on non-alphanumeric neighbors instead.
    return re.compile(
        rf"(?<![A-Za-z0-9]){escaped}(?![A-Za-z0-9])",
        re.IGNORECASE,
    )


def filter_existing_keywords(
    customized_resume: str,
    suggested_keywords: list[str],
) -> list[str]:
    """Drop suggested keywords that already appear in the customized resume."""
    kept: list[str] = []
    for keyword in suggested_keywords:
        if not keyword.strip():
            continue
        if _keyword_regex(keyword).search(customized_resume):
            continue
        kept.append(keyword)
    return kept


def validate_guest_id(guest_id: str) -> str:
    try:
        return str(UUID(guest_id))
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="A valid guest ID is required.",
        ) from None


def validate_resume_file_type(filename: str) -> Literal["pdf", "docx"]:
    filename = filename.lower()
    if filename.endswith(".pdf"):
        return "pdf"
    if filename.endswith(".docx"):
        return "docx"
    raise HTTPException(
        status_code=400,
        detail="Only PDF and DOCX files are supported",
    )


def validate_resume_content(text: str) -> None:
    """Reject documents that are unlikely to contain resume content."""

    normalized = re.sub(r"\s+", " ", text).strip()

    if len(normalized) < 50:
        raise HTTPException(
            status_code=400,
            detail="The document contains too little text to be a valid resume.",
        )

    resume_indicators = (
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "work history",
        "education",
        "educational background",
        "academic background",
        "skills",
        "technical skills",
        "core competencies",
        "projects",
        "personal projects",
        "professional summary",
        "summary",
        "career objective",
        "objective",
        "internship",
        "internships",
        "certification",
        "certifications",
        "licenses",
        "achievements",
        "responsibilities",
    )

    indicator_count = sum(
        1
        for indicator in resume_indicators
        if re.search(
            rf"(?<![a-z]){re.escape(indicator)}(?![a-z])",
            normalized,
            re.IGNORECASE,
        )
    )

    has_contact = bool(
        re.search(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", normalized, re.I)
        or re.search(r"\b(?:\+?\d[\d\s().-]{8,}\d)\b", normalized)
    )

    if indicator_count == 0 and not has_contact:
        raise HTTPException(
            status_code=400,
            detail="This document doesn't appear to be a resume. Please upload a valid resume.",
        )
