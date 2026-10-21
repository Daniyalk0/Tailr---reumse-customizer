from datetime import date
from unittest.mock import Mock
from uuid import uuid4

from fastapi.testclient import TestClient

import backend.main as main


def test_failed_generation_releases_reservation(monkeypatch):
    guest_id = str(uuid4())
    usage_date = date(2026, 10, 21)

    monkeypatch.setattr(main, "reserve_guest_generation", Mock(return_value=usage_date))
    finalize = Mock()
    monkeypatch.setattr(main, "finalize_guest_generation", finalize)
    ai = Mock(side_effect=RuntimeError("Simulated AI failure"))
    monkeypatch.setattr(main, "customize_resume", ai)

    response = TestClient(main.app).post(
        "/customize-resume",
        headers={"X-Guest-ID": guest_id},
        json={
            "resume_text": "Test resume content",
            "job_description": "Test job description",
        },
    )

    assert response.status_code == 502
    finalize.assert_called_once_with(guest_id, usage_date, succeeded=False)


def test_finalization_failure_does_not_mask_ai_failure(monkeypatch):
    guest_id = str(uuid4())
    usage_date = date(2026, 10, 21)

    monkeypatch.setattr(main, "reserve_guest_generation", Mock(return_value=usage_date))
    monkeypatch.setattr(
        main,
        "finalize_guest_generation",
        Mock(side_effect=RuntimeError("Simulated database failure")),
    )
    monkeypatch.setattr(
        main,
        "customize_resume",
        Mock(side_effect=RuntimeError("Simulated AI failure")),
    )

    response = TestClient(main.app).post(
        "/customize-resume",
        headers={"X-Guest-ID": guest_id},
        json={
            "resume_text": "Test resume content",
            "job_description": "Test job description",
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "AI customization failed. Please try again later."
    )
