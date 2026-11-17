import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.schemas import ResumeClaimIssue, ResumeValidationResponse
from backend.services import resume_customizer


def _completion(content: str):
    return SimpleNamespace(
        usage=None,
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
    )


def test_supported_duration_wording_is_not_rejected_by_deterministic_checks(
    monkeypatch,
):
    monkeypatch.setattr(
        resume_customizer.client.chat.completions,
        "create",
        lambda **_: _completion(
            json.dumps(
                {
                    "customized_resume": "Developer with 6 years of experience.",
                    "suggested_keywords": [],
                }
            )
        ),
    )
    monkeypatch.setattr(
        resume_customizer,
        "validate_resume_claims",
        lambda **_: ResumeValidationResponse(issues=[]),
    )

    result = resume_customizer.customize_resume(
        resume_text="Over 5 years of professional experience.",
        job_description="Software engineer",
    )

    assert result.customized_resume == "Developer with 6 years of experience."


def test_unresolved_non_high_validation_issue_returns_422(monkeypatch):
    completions = iter(
        [
            json.dumps(
                {
                    "customized_resume": "Email: original@example.com",
                    "suggested_keywords": [],
                }
            ),
            json.dumps(
                {
                    "customized_resume": "Email: original@example.com",
                    "suggested_keywords": [],
                }
            ),
        ]
    )
    monkeypatch.setattr(
        resume_customizer.client.chat.completions,
        "create",
        lambda **_: _completion(next(completions)),
    )
    issue = ResumeClaimIssue(
        claim="An original fact is missing",
        reason="A fact from the original resume was omitted.",
        severity="medium",
    )
    monkeypatch.setattr(
        resume_customizer,
        "validate_resume_claims",
        lambda **_: ResumeValidationResponse(issues=[issue]),
    )

    with pytest.raises(HTTPException) as exc:
        resume_customizer.customize_resume(
            resume_text="Email: original@example.com",
            job_description="Software engineer",
        )

    assert exc.value.status_code == 422
