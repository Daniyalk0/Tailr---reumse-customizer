import re
from collections import Counter

from backend.schemas import ResumeValidationResponse
from backend.services.llm_client import client
from backend.services.prompts import build_validation_prompt


def extract_experience_duration_claims(text: str) -> set[str]:
    """Find explicit claims about years of professional experience."""
    pattern = (
        r"\b(?:over\s+|more than\s+|at least\s+)?"
        r"\d+\+?\s+years?"
        r"(?:\s+of)?\s+(?:professional\s+)?experience\b"
    )

    return {
        re.sub(r"\s+", " ", claim.lower()).strip()
        for claim in re.findall(pattern, text, re.IGNORECASE)
    }


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
            "Resume validation failed: unsupported experience duration detected."
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
