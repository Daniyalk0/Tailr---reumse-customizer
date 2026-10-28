from datetime import date
from unittest.mock import Mock
from uuid import uuid4

from fastapi.testclient import TestClient

import backend.main as main
from backend.schemas import ATSAnalysisResponse


def _client() -> TestClient:
    return TestClient(main.app, client=(str(uuid4()), 50000))

VALID_RESUME_TEXT = """
John Doe
john@example.com
+1 555 123 4567

Experience
Software Developer, 2022-2025

Education
Bachelor of Computer Science

Skills
Python, FastAPI, SQL
"""


def test_formatting_analysis_does_not_reserve_ats_quota(monkeypatch):
    guest_id = str(uuid4())
    result = ATSAnalysisResponse(formatting_score=85)
    analyze = Mock(return_value=result)
    reserve = Mock()
    monkeypatch.setattr(main, "analyze_resume", analyze)
    monkeypatch.setattr(main, "reserve_guest_ats_analysis", reserve)

    response = _client().post(
        "/analyze-resume",
        headers={"X-Guest-ID": guest_id},
        data={"resume_text": VALID_RESUME_TEXT},
    )

    assert response.status_code == 200
    assert response.json()["formatting_score"] == 85
    analyze.assert_called_once_with(
        resume_text=VALID_RESUME_TEXT,
        job_description=None,
    )
    reserve.assert_not_called()


def test_job_match_analysis_finalizes_successful_quota(monkeypatch):
    guest_id = str(uuid4())
    usage_date = date(2026, 10, 26)
    result = ATSAnalysisResponse(formatting_score=85, job_match_score=75)
    monkeypatch.setattr(
        main,
        "reserve_guest_ats_analysis",
        Mock(return_value=usage_date),
    )
    finalize = Mock()
    monkeypatch.setattr(main, "finalize_guest_ats_analysis", finalize)
    monkeypatch.setattr(main, "analyze_resume", Mock(return_value=result))

    response = _client().post(
        "/analyze-resume",
        headers={"X-Guest-ID": guest_id},
        data={
            "resume_text": VALID_RESUME_TEXT,
            "job_description": "Job requirements",
        },
    )

    assert response.status_code == 200
    assert response.json()["job_match_score"] == 75
    finalize.assert_called_once_with(guest_id, usage_date, succeeded=True)


def test_job_match_failure_releases_ats_quota(monkeypatch):
    guest_id = str(uuid4())
    usage_date = date(2026, 10, 26)
    monkeypatch.setattr(
        main,
        "reserve_guest_ats_analysis",
        Mock(return_value=usage_date),
    )
    finalize = Mock()
    monkeypatch.setattr(main, "finalize_guest_ats_analysis", finalize)
    monkeypatch.setattr(
        main,
        "analyze_resume",
        Mock(side_effect=RuntimeError("Simulated ATS failure")),
    )

    response = _client().post(
        "/analyze-resume",
        headers={"X-Guest-ID": guest_id},
        data={
            "resume_text": VALID_RESUME_TEXT,
            "job_description": "Job requirements",
        },
    )

    assert response.status_code == 503
    finalize.assert_called_once_with(guest_id, usage_date, succeeded=False)
