import re

from pydantic import ValidationError
import json
from backend.schemas import ATSAnalysisResponse
from backend.services.llm_client import client
from backend.services.prompts import build_ats_analysis_prompt
from groq import APIError

def analyze_resume(
    resume_text: str,
    job_description: str | None = None,
) -> ATSAnalysisResponse:
    text = resume_text.strip()
    normalized = text.casefold()

    formatting_issues = []
    recommendations = []
    score = 100

    # Check for common resume sections.
    sections = {
        "Experience": r"\b(experience|employment history|work history)\b",
        "Education": r"\b(education|academic background)\b",
        "Skills": r"\b(skills|technical skills|core competencies)\b",
    }

    missing_sections = [
        name for name, pattern in sections.items() if not re.search(pattern, normalized)
    ]

    if missing_sections:
        formatting_issues.append(
            f"Missing or unrecognized sections: {', '.join(missing_sections)}"
        )
        recommendations.append(
            f"Add clearly labeled sections for: {', '.join(missing_sections)}."
        )
        score -= min(30, len(missing_sections) * 10)

    # Check for contact information.
    if not re.search(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b", text):
        formatting_issues.append("No recognizable email address found.")
        recommendations.append("Include a professional email address.")
        score -= 10

    if not re.search(r"(?:\+?\d[\d\s().-]{7,}\d)", text):
        formatting_issues.append("No recognizable phone number found.")
        recommendations.append("Include a contact phone number.")
        score -= 5

        # Check for dates that may indicate work or education history.
    if not re.search(
        r"\b(?:19|20)\d{2}\b",
        text,
    ):
        formatting_issues.append("No recognizable years found in the resume.")
        recommendations.append(
            "Check whether relevant employment and education dates are included."
        )
        score -= 10

    # Flag possible extraction problems.
    if len(text) < 200:
        formatting_issues.append("The extracted resume text is unusually short.")
        recommendations.append("Check that the complete resume text was extracted.")
        score -= 15

    # Check for unusually long lines that may indicate extraction issues.
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    long_lines = [line for line in lines if len(line) > 500]

    if long_lines:
        formatting_issues.append(
            f"{len(long_lines)} line(s) exceed 500 characters and may indicate text-extraction issues."
        )
        recommendations.append(
            "Review the extracted resume text for merged sections or incorrectly joined lines."
        )
        score -= 5

    job_match = {}

    if job_description:
        try:
            job_match = analyze_job_match(
                resume_text=resume_text,
                job_description=job_description,
            )
        except Exception as exc:
            raise RuntimeError("ATS job matching failed") from exc

    if job_description and job_match.get("missing_keywords"):
        recommendations.extend(
            f"If you have relevant experience, consider adding evidence of: {keyword}."
            for keyword in job_match["missing_keywords"]
        )

    if not recommendations:
        recommendations.append(
            "No major issues were detected by these basic checks. Review the resume's layout and readability manually."
        )

    recommendations = list(dict.fromkeys(recommendations))
    formatting_issues = list(dict.fromkeys(formatting_issues))
    try:
        return ATSAnalysisResponse(
            formatting_score=max(0, min(100, score)),
            job_match_score=job_match.get("job_match_score"),
            matched_keywords=job_match.get("matched_keywords", []),
            missing_keywords=job_match.get("missing_keywords", []),
            formatting_issues=formatting_issues,
            recommendations=recommendations,
        )
    except ValidationError as exc:
        raise RuntimeError("Invalid ATS analysis response") from exc


def analyze_job_match(
    resume_text: str,
    job_description: str,
) -> dict:
    prompt = build_ats_analysis_prompt(
        resume_text=resume_text,
        job_description=job_description,
    )

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0,
            max_completion_tokens=2048,
        )
    except APIError as exc:
        raise RuntimeError("ATS analysis service is temporarily unavailable") from exc

    generated_text = response.choices[0].message.content

    if not generated_text or not generated_text.strip():
        raise RuntimeError("The AI returned an empty ATS analysis response")

    try:
        result = json.loads(generated_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError("The AI returned invalid JSON") from exc

    if not isinstance(result, dict):
        raise RuntimeError("The AI returned an invalid response format")

    required_fields = {
        "job_match_score",
        "matched_keywords",
        "missing_keywords",
    }

    if not required_fields.issubset(result):
        raise RuntimeError("The AI response is missing required fields")

    if not isinstance(result["matched_keywords"], list):
        raise RuntimeError("Invalid matched_keywords format")

    if not isinstance(result["missing_keywords"], list):
        raise RuntimeError("Invalid missing_keywords format")

    score = result["job_match_score"]

    if not isinstance(score, int) or isinstance(score, bool) or not 0 <= score <= 100:
        raise RuntimeError("Invalid job_match_score")

    if not all(isinstance(keyword, str) for keyword in result["matched_keywords"]):
        raise RuntimeError("Invalid matched_keywords entries")

    if not all(isinstance(keyword, str) for keyword in result["missing_keywords"]):
        raise RuntimeError("Invalid missing_keywords entries")
    return result
