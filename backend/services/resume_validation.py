import re
from collections import Counter
from uuid import UUID
from fastapi import HTTPException

from backend.schemas import ResumeValidationResponse
from backend.services.llm_client import client
from backend.services.prompts import build_validation_prompt


def extract_experience_duration_claims(text: str) -> set[str]:
    """Find explicit claims about years of professional experience."""
    pattern = (
        r"\b(?:(?P<qualifier>over|more than|at least)\s+)?"
        r"(?P<duration>\d+\+?)\s+years?"
        r"(?:\s+of)?\s+(?:professional\s+)?experience\b"
    )

    claims = set()
    for match in re.finditer(pattern, text, re.IGNORECASE):
        qualifier = (match.group("qualifier") or "").lower()
        duration = match.group("duration").lower()
        if qualifier in {"over", "more than"}:
            qualifier = "more than"
        elif duration.endswith("+") and not qualifier:
            qualifier = "at least"
        duration = duration.removesuffix("+")
        claims.add(" ".join(part for part in (qualifier, duration) if part))
    return claims


def validate_resume_facts(
    original_resume: str,
    customized_resume: str,
) -> None:
    """Reject changed email addresses and unsupported numeric claims."""

    email_pattern = r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"

    original_emails = {
        email.lower()
        for email in re.findall(email_pattern, original_resume, re.IGNORECASE)
    }
    customized_emails = {
        email.lower()
        for email in re.findall(email_pattern, customized_resume, re.IGNORECASE)
    }

    if original_emails != customized_emails:
        raise ValueError(
            "Resume validation failed: email addresses changed or were added."
        )

    original_duration_claims = extract_experience_duration_claims(original_resume)
    customized_duration_claims = extract_experience_duration_claims(customized_resume)
    if customized_duration_claims - original_duration_claims:
        raise ValueError(
            "Resume validation failed: unsupported experience duration claims detected."
        )

    percentage_pattern = r"\b\d+(?:\.\d+)?\s*%"

    def extract_percentages(text: str) -> Counter:
        return Counter(
            re.sub(r"\s+", "", value) for value in re.findall(percentage_pattern, text)
        )

    original_percentages = extract_percentages(original_resume)
    customized_percentages = extract_percentages(customized_resume)

    if customized_percentages - original_percentages:
        raise ValueError(
            "Resume validation failed: unsupported percentage claims detected."
        )


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
