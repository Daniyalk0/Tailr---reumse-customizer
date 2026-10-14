import logging
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from backend.schemas import CustomizeResumeResponse

logger = logging.getLogger(__name__)
MAX_GEMINI_ATTEMPTS = 3

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from the .env file")

client = genai.Client(api_key=api_key)


def get_upstream_status_code(exc: Exception) -> int | None:
    for attribute in ("status_code", "code"):
        value = getattr(exc, attribute, None)
        if isinstance(value, int) and 100 <= value <= 599:
            return value

    match = re.search(
        r"^\s*(?:HTTP(?: status)?\s+|(?:error )?code:\s*)?(429|503)\b",
        str(exc),
        flags=re.IGNORECASE,
    )
    return int(match.group(1)) if match else None


def get_sanitized_error_message(
    exc: Exception,
    *,
    sensitive_values: tuple[str, ...] = (),
) -> str:
    message = getattr(exc, "message", None)
    if not isinstance(message, str) or not message.strip():
        return "Upstream request failed"

    for sensitive_value in (api_key, *sensitive_values):
        if sensitive_value:
            message = re.sub(
                re.escape(sensitive_value),
                "[REDACTED]",
                message,
                flags=re.IGNORECASE,
            )

    message = re.sub(r"AIza[0-9A-Za-z_-]{20,}", "[REDACTED_API_KEY]", message)
    message = re.sub(
        r"(?i)(api[_-]?key|key|authorization|access[_-]?token|token|"
        r"password|secret)(\s*[:=]\s*)(?:Bearer\s+)?([^,\s;&]+)",
        r"\1\2[REDACTED]",
        message,
    )
    return message[:1000]


def customize_resume(
    resume_text: str,
    job_description: str,
) -> CustomizeResumeResponse:
    prompt = f"""
You are a careful resume editor specializing in ATS-friendly resumes.

Compare the target job description with the original resume. Return both a
truthful, tailored version of the resume and a separate list of relevant
skills or keywords that are missing or insufficiently demonstrated in the
original resume.

RULES:

1. Return the complete resume, not a summary.
2. Preserve the candidate's contact details, education, projects, and
   other meaningful sections.
3. Keep all original projects unless the input is too long to process.
4. You may reorder skills and rewrite bullets to emphasize relevance.
5. Every technical claim must be supported by the original resume.
6. Do not invent technologies, responsibilities, achievements, metrics,
   qualifications, or professional experience.
7. Do not describe frontend or client-side work as backend implementation
   unless the original resume supports that claim.
8. Do not upgrade the candidate's responsibility level.
9. Do not claim proficiency in a skill merely because it appears in the
   job description.
10. Do not add missing job requirements as existing skills.
11. Preserve important project details, tools, and achievements.
12. Prefer clear, concise, professional language.
13. Use standard resume headings and readable plain-text formatting.
14. Keep suggested keywords separate; never insert them into the customized
    resume.
15. Suggest only relevant job-description skills or keywords that are absent
    from or weakly supported by the original resume. Do not imply that the
    candidate possesses them.
16. Return an empty suggested_keywords list if there are no relevant gaps.
17. Return a JSON object with exactly these fields:
    - customized_resume: the complete tailored resume as plain text
    - suggested_keywords: an array of concise keyword strings

Before responding, internally check that:
- Every project and education entry from the original is preserved.
- No unsupported technical claims have been introduced.
- The resume is relevant to the target job description.
- Suggested keywords are based on the comparison with the original resume
  and are not present as claims in the customized resume.

ORIGINAL RESUME:
{resume_text}

TARGET JOB DESCRIPTION:
{job_description}
"""

    response = None
    for attempt in range(MAX_GEMINI_ATTEMPTS):
        try:
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": CustomizeResumeResponse,
                },
            )
            break
        except Exception as exc:
            status_code = get_upstream_status_code(exc)
            error_message = get_sanitized_error_message(
                exc,
                sensitive_values=(resume_text, job_description, prompt),
            )
            if status_code == 503 and attempt < MAX_GEMINI_ATTEMPTS - 1:
                logger.warning(
                    "Gemini unavailable (HTTP %s, attempt %s/%s): %s",
                    status_code,
                    attempt + 1,
                    MAX_GEMINI_ATTEMPTS,
                    error_message,
                )
                time.sleep(2 * (attempt + 1))
                continue

            logger.error(
                "Gemini request failed (HTTP %s): %s",
                status_code if status_code is not None else "unknown",
                error_message,
            )
            raise

    try:
        if response is None or not response.text or not response.text.strip():
            raise RuntimeError("The AI returned an empty response")

        return CustomizeResumeResponse.model_validate_json(response.text)
    except Exception as exc:
        logger.error(
            "Gemini response processing failed (%s): %s",
            type(exc).__name__,
            get_sanitized_error_message(
                exc,
                sensitive_values=(resume_text, job_description, prompt),
            ),
        )
        raise
