import pytest

from backend.services.resume_customizer import validate_resume_facts
from backend.services.prompts import build_validation_prompt


def test_rejects_changed_email():
    with pytest.raises(ValueError, match="email addresses"):
        validate_resume_facts(
            "Email: original@example.com",
            "Email: changed@example.com",
        )


def test_rejects_unsupported_percentage():
    with pytest.raises(ValueError, match="percentage"):
        validate_resume_facts(
            "Built an e-commerce application.",
            "Improved performance by 40%.",
        )


def test_rejects_unsupported_experience_duration():
    with pytest.raises(ValueError, match="experience duration"):
        validate_resume_facts(
            "Built projects using React and Next.js.",
            "Developer with 2+ years of experience in React.",
        )


def test_accepts_unchanged_experience_duration():
    validate_resume_facts(
        "Developer with 5 years of professional experience.",
        "Developer with 5 years of experience.",
    )


def test_accepts_conservative_experience_duration():
    validate_resume_facts(
        "Developer with 5 years of professional experience.",
        "Developer with 3 years of experience.",
    )


def test_rejects_omitted_percentage():
    with pytest.raises(ValueError, match="percentage claims were omitted"):
        validate_resume_facts(
            "Improved performance by 20%.",
            "Improved performance.",
        )


def test_accepts_unchanged_email_and_supported_facts():
    validate_resume_facts(
        "Email: original@example.com. Improved performance by 20%.",
        "Email: original@example.com. Improved performance by 20%.",
    )


def test_accepts_equivalent_percentage_wording():
    validate_resume_facts(
        "Improved performance by 20%.",
        "Improved performance by 20 percent.",
    )


def test_validation_prompt_checks_factual_omissions_and_status_dates():
    prompt = build_validation_prompt(
        original_resume="Education: University, degree in progress, 2026 – Present",
        job_description="Software engineer",
        generated_resume="Education: University, expected 2026",
    )

    assert "degree status" in prompt
    assert "every original factual detail omitted" in prompt
    assert '"2026 – Present" to "Expected 2026"' in prompt
    assert "missing original fact being reviewed" in prompt
