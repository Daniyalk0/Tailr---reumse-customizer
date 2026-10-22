import logging
import time
from collections import Counter
from unittest import result

from fastapi import HTTPException

from backend.schemas import CustomizeResumeResponse
from backend.services.llm_client import client
from backend.services.prompts import (
    build_customization_prompt,
    build_correction_prompt,
)
from backend.services.resume_validation import (
    filter_existing_keywords,
    validate_resume_claims,
    validate_resume_facts,
)
from backend.services.error_handling import (
    get_upstream_status_code,
    get_sanitized_error_message,
)

logger = logging.getLogger(__name__)


def customize_resume(
    resume_text: str,
    job_description: str,
) -> CustomizeResumeResponse:

    prompt = prompt = build_customization_prompt(
        resume_text=resume_text,
        job_description=job_description,
    )

    logger.info(
        "Groq request input sizes: resume_chars=%s, job_description_chars=%s",
        len(resume_text),
        len(job_description),
    )
    request_started = time.perf_counter()
    try:

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            response_format={"type": "json_object"},
            temperature=1,
            max_completion_tokens=4096,
        )

        elapsed = time.perf_counter() - request_started
        logger.info(
            "Groq request completed in %.2f seconds (status=success)",
            elapsed,
        )

        usage = response.usage
        if usage is not None:
            logger.info(
                "Groq token usage: input=%s, output=%s, total=%s",
                usage.prompt_tokens,
                usage.completion_tokens,
                usage.total_tokens,
            )

        generated_text = response.choices[0].message.content

    except Exception as exc:
        elapsed = time.perf_counter() - request_started
        status_code = get_upstream_status_code(exc)
        logger.warning(
            "Groq request failed in %.2f seconds "
            "(HTTP status=%s, exception_type=%s)",
            elapsed,
            status_code if status_code is not None else "unknown",
            type(exc).__name__,
        )
        error_message = get_sanitized_error_message(
            exc,
            sensitive_values=(resume_text, job_description, prompt),
        )
        logger.error(
            "Groq request failed (HTTP %s): %s",
            status_code if status_code is not None else "unknown",
            error_message,
        )
        raise

    try:
        if not generated_text or not generated_text.strip():
            raise RuntimeError("The AI returned an empty response")

        result = CustomizeResumeResponse.model_validate_json(generated_text)

        validate_resume_facts(
            original_resume=resume_text,
            customized_resume=result.customized_resume,
        )

        validation = validate_resume_claims(
            original_resume=resume_text,
            job_description=job_description,
            generated_resume=result.customized_resume,
        )
        logger.info(
            "Resume validation completed: %d issue(s), severities=%s",
            len(validation.issues),
            dict(Counter(issue.severity for issue in validation.issues)),
        )

        serious_issues = [
            issue for issue in validation.issues if issue.severity in {"high", "medium"}
        ]

        if serious_issues:
            logger.warning(
                "Resume validation found %d potentially unsupported claims",
                len(serious_issues),
            )

            correction_prompt = build_correction_prompt(
                original_resume=resume_text,
                job_description=job_description,
                generated_resume_json=result.model_dump_json(),
                validation_issues=[issue.model_dump() for issue in serious_issues],
            )

            correction_response = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": correction_prompt}],
                response_format={"type": "json_object"},
                temperature=1,
                max_completion_tokens=4096,
            )

            corrected_text = correction_response.choices[0].message.content

            if not corrected_text or not corrected_text.strip():
                raise RuntimeError("The AI returned an empty correction response")

            result = CustomizeResumeResponse.model_validate_json(corrected_text)

            validate_resume_facts(
                original_resume=resume_text,
                customized_resume=result.customized_resume,
            )

            final_validation = validate_resume_claims(
                original_resume=resume_text,
                job_description=job_description,
                generated_resume=result.customized_resume,
            )

            unresolved_high_issues = [
                issue for issue in final_validation.issues if issue.severity == "high"
            ]

            if unresolved_high_issues:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "We couldn't safely finalize your resume. "
                        "Please try again or review your original resume."
                    ),
                )

            result.suggested_keywords = filter_existing_keywords(
                customized_resume=result.customized_resume,
                suggested_keywords=result.suggested_keywords,
            )
            return result

    except HTTPException:
        raise

    except Exception as exc:
        logger.error(
            "Groq response processing failed (%s): %s",
            type(exc).__name__,
            get_sanitized_error_message(
                exc,
                sensitive_values=(resume_text, job_description, prompt),
            ),
        )
        raise
