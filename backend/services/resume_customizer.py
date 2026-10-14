import logging
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from backend.schemas import CustomizeResumeResponse

logger = logging.getLogger(__name__)

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
You are an expert resume editor and job-matching specialist.

Your task is to transform the supplied original resume into a complete,
accurate, ATS-friendly resume tailored to the supplied job description.

The result must improve the candidate's relevance to the target position
through meaningful prioritization, precise wording, and clear presentation.
Do not merely paraphrase the original or invent qualifications to match
the job description.

CORE PRINCIPLES:

1. The TARGET JOB DESCRIPTION determines which qualifications,
   responsibilities, skills, and accomplishments deserve emphasis.

2. The ORIGINAL RESUME is the source of truth for the candidate's
   experience, skills, qualifications, responsibilities, and achievements.

3. Never assume a particular profession, industry, seniority level,
   or technical discipline. Determine the target role dynamically
   from the supplied job description.

4. Tailor the resume as strongly as the available evidence allows,
   without exaggerating, fabricating, or misrepresenting the candidate's
   qualifications.

JOB-MATCHING ANALYSIS:

5. Analyze the job description and identify:
   - The target role and its main responsibilities.
   - Essential and preferred qualifications.
   - Important skills, tools, technologies, and domain knowledge.
   - Relevant experience and accomplishments.
   - Repeated keywords and other important selection criteria.

6. Compare these requirements against the ORIGINAL resume.
   Internally classify each relevant requirement as:
   - Demonstrated: supported by explicit evidence.
   - Partially demonstrated: related evidence exists, but the exact
     qualification, responsibility, or proficiency is not established.
   - Missing: no credible supporting evidence exists.

7. Use this comparison to determine what to emphasize, what to preserve,
   what can be clarified, and which gaps should appear in
   suggested_keywords. Do not include this internal analysis in the
   customized resume.

RESUME CUSTOMIZATION:

8. Return the COMPLETE customized resume. Preserve contact information,
   meaningful original sections, relevant projects or experience,
   education, qualifications, dates, and other useful details.
   Do not return a summary of the resume or silently remove meaningful
   content simply because it is less relevant to the target position.

9. Tailor the headline and professional summary to the target job.
   Select a headline that accurately reflects the candidate's demonstrated
   background while aligning with the target role.

   Do not automatically preserve the original headline when another
   truthful headline is more appropriate. Do not assume the candidate
   is changing careers or transitioning into a role unless the supplied
   information supports that description.

   Write a specific, concise summary emphasizing the strongest relevant
   qualifications, experience, projects, and accomplishments supported
   by the original resume. Avoid generic filler, unnecessary enthusiasm,
   unsupported claims, and repetitive statements.

10. Reorganize the skills section to reflect the target job's priorities.
    Group skills according to their actual function and the conventions
    of the relevant profession or industry.

    Include only skills supported by the original resume. A skill may
    be added when the original resume clearly demonstrates it elsewhere,
    even if it was omitted from the original skills list. Do not infer
    experience with a skill merely because it is related to another
    skill or appears in the job description.

11. Evaluate every experience, project, achievement, and responsibility
    bullet individually:
    - Identify the actual activity, contribution, or outcome.
    - Prioritize details relevant to the target role.
    - Improve clarity, specificity, readability, and professional wording.
    - Preserve meaningful methods, tools, responsibilities, and results.
    - Use appropriate terminology from the job description when it
      accurately describes the candidate's existing experience.
    - Preserve strong, relevant bullets when rewriting would not
      meaningfully improve them.
    - Avoid superficial synonym substitutions, vague descriptions,
      unnecessary repetition, and unsupported embellishment.

12. Preserve concrete evidence. Do not replace specific responsibilities,
    techniques, tools, features, or achievements with vague claims that
    sound more impressive but communicate less useful information.
    Retain meaningful implementation details unless they are redundant
    or genuinely unsuitable for the resume.

13. Use transferable skills appropriately. Experience in a related area
    may demonstrate relevant capabilities, but it does not automatically
    establish experience with a different tool, responsibility,
    methodology, industry, or level of complexity.

    Emphasize transferable experience where relevant, while keeping
    direct experience, related experience, and unverified qualifications
    clearly distinguishable through accurate wording.

14. Maintain factual accuracy throughout the resume:
    - Never invent skills, tools, responsibilities, achievements,
      qualifications, employers, projects, dates, or metrics.
    - Never turn an activity into an accomplishment without evidence.
    - Never imply professional employment when the evidence describes
      a personal, academic, volunteer, or independent project.
    - Preserve the actual status and completion level of projects
      and responsibilities.
    - Do not claim expertise, leadership, ownership, measurable impact,
      certifications, or specialized proficiency without evidence.
    - Do not introduce unsupported claims about quality, scale,
      performance, security, efficiency, or other outcomes.
    - Do not imply that the candidate performed work merely because
      a tool or technology appears in a project's list.

15. Tailor the resume without forcing every section to match the target
    role. Preserve other meaningful experience and qualifications
    where they contribute to the candidate's overall background.

16. Use professional language, standard section headings, concise bullets,
    consistent formatting, and ATS-readable plain text. Avoid tables,
    graphics, decorative layouts, editing notes, and explanations
    inside the customized resume.

MISSING KEYWORDS:

17. Identify important job-description requirements that are absent
    from or only partially demonstrated by the ORIGINAL resume.

18. Include relevant missing required qualifications and meaningful
    preferred skills in suggested_keywords. Prioritize them according
    to their importance to the specific target role.

19. Do not classify a requirement as missing when the original resume
    demonstrates it through equivalent terminology or credible evidence.

20. Treat suggested_keywords as recommendations for the candidate to
    learn, develop, obtain, or substantiate. Never insert an unsupported
    keyword into the customized resume as an existing qualification.

21. Return concise, distinct keyword strings. Avoid duplicates, generic
    phrases, unrelated requirements, and indiscriminate copying of every
    keyword from the job description.

22. Return an empty suggested_keywords array only when no meaningful
    relevant gaps remain.

FINAL QUALITY CHECK:

Before responding, verify that:
- The resume is complete and preserves meaningful original information.
- The headline and summary align with the actual target role.
- The resume's emphasis reflects the supplied job description rather
  than a predetermined profession or discipline.
- Relevant experience and accomplishments are easy to identify.
- Rewriting improves relevance, clarity, or specificity.
- Skills are accurately described and correctly grouped.
- Every claim is supported by the original resume.
- Transferable experience is not misrepresented as direct experience.
- Project status, responsibility level, and qualifications remain accurate.
- Meaningful original details have not been unnecessarily removed.
- Suggested keywords represent genuine gaps relevant to the target job.
- The output contains both required fields in the correct types.

EVIDENCE-BASED REWRITING:

Before finalizing each rewritten claim, verify that the ORIGINAL resume
supports the same underlying responsibility or accomplishment.

Do not strengthen a claim simply to make it match the target job more
closely. Preserve the original scope of the work.

For example, do not transform:
- A dashboard into a separately implemented backend.
- A feature into an API endpoint unless endpoints are established.
- Tool usage into advanced proficiency.
- An integration into proof of security, scalability, or performance.
- A general project accomplishment into an architectural achievement.

These are illustrative examples, not an exhaustive list. Apply the
same principle to every profession, industry, technology, and role.

Prefer the strongest accurate description over the most impressive-sounding
description. When a claim cannot be verified from the original resume,
retain a narrower supported statement or omit the unsupported detail.

Before returning the resume, compare every modified bullet with its
original counterpart and confirm that no new responsibility, technical
implementation, or outcome has been introduced.

OUTPUT FORMAT:

Return exactly one valid JSON object matching the provided response schema:

{{
  "customized_resume": "The complete customized resume as plain text",
  "suggested_keywords": ["Relevant missing qualification"]
}}

The customized_resume value must contain the complete resume as plain text.
The suggested_keywords value must be an array of concise strings.

Always include both fields. Use an empty array for suggested_keywords
when no meaningful gaps remain.

Do not include Markdown fences, analysis, or additional commentary
outside the JSON object.

ORIGINAL RESUME:
{resume_text}

TARGET JOB DESCRIPTION:
{job_description}
"""

    logger.info(
        "Gemini request input sizes: resume_chars=%s, job_description_chars=%s",
        len(resume_text),
        len(job_description),
    )
    request_started = time.perf_counter()
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": CustomizeResumeResponse,
            },
        )
        elapsed = time.perf_counter() - request_started
        logger.info(
            "Gemini request completed in %.2f seconds (status=success)",
            elapsed,
        )
        usage_metadata = getattr(response, "usage_metadata", None)
        if usage_metadata is not None:
            prompt_tokens = getattr(usage_metadata, "prompt_token_count", None)
            output_tokens = getattr(
                usage_metadata,
                "candidates_token_count",
                None,
            )
            total_tokens = getattr(usage_metadata, "total_token_count", None)
            if any(
                token_count is not None
                for token_count in (prompt_tokens, output_tokens, total_tokens)
            ):
                logger.info(
                    "Gemini token usage: input=%s, output=%s, total=%s",
                    prompt_tokens,
                    output_tokens,
                    total_tokens,
                )
    except Exception as exc:
        elapsed = time.perf_counter() - request_started
        status_code = get_upstream_status_code(exc)
        logger.warning(
            "Gemini request failed in %.2f seconds "
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
            "Gemini request failed (HTTP %s): %s",
            status_code if status_code is not None else "unknown",
            error_message,
        )
        raise

    try:
        if not response.text or not response.text.strip():
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
