import pytest

from backend.services.resume_customizer import validate_resume_facts


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


def test_accepts_unchanged_email_and_supported_facts():
    validate_resume_facts(
        "Email: original@example.com. Improved performance by 20%.",
        "Email: original@example.com. Improved performance by 20%.",
    )
