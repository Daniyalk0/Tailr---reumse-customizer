from datetime import date
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

import backend.main as main
from backend.schemas import ATSAnalysisResponse

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


@pytest.mark.parametrize(
    ("method", "path", "limit"),
    [
        ("POST", "/upload-resume", 10),
        ("POST", "/customize-resume", 5),
        ("POST", "/analyze-resume", 5),
        ("POST", "/download-resume/docx", 10),
        ("POST", "/download-resume/pdf", 10),
        ("GET", "/quota-status", 30),
    ],
)
def test_endpoint_rate_limits(method, path, limit, monkeypatch):
    guest_id = str(uuid4())
    monkeypatch.setattr(
        main,
        "extract_resume_text",
        lambda **kwargs: VALID_RESUME_TEXT,
    )
    monkeypatch.setattr(
        main,
        "reserve_guest_generation",
        lambda *args: date.today(),
    )
    monkeypatch.setattr(main, "finalize_guest_generation", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        main,
        "customize_resume",
        lambda **kwargs: {
            "customized_resume": "Customized resume",
            "suggested_keywords": [],
        },
    )
    monkeypatch.setattr(
        main,
        "analyze_resume",
        lambda **kwargs: ATSAnalysisResponse(formatting_score=80),
    )
    monkeypatch.setattr(main, "generate_docx", lambda *args: b"docx")
    monkeypatch.setattr(main, "generate_pdf", lambda *args: b"pdf")
    monkeypatch.setattr(
        main,
        "get_guest_quota_status",
        lambda *args: {
            "usage_date": date.today().isoformat(),
            "daily_limit": 1,
            "used": 0,
            "remaining": 1,
        },
    )

    client = TestClient(main.app, client=(str(uuid4()), 50000))

    def send_request():
        headers = {"X-Guest-ID": guest_id}
        if path == "/upload-resume":
            return client.request(
                method,
                path,
                files={"file": ("resume.pdf", b"resume", "application/pdf")},
            )
        if path == "/customize-resume":
            return client.request(
                method,
                path,
                headers=headers,
                json={
                    "resume_text": "Resume content",
                    "job_description": "Job description",
                },
            )
        if path == "/analyze-resume":
            return client.request(
                method,
                path,
                headers=headers,
                data={"resume_text": VALID_RESUME_TEXT},
            )
        if path.startswith("/download-resume/"):
            return client.request(
                method,
                path,
                json={"resume_text": "Resume content"},
            )
        return client.request(method, path, headers=headers)

    for _ in range(limit):
        response = send_request()
        assert response.status_code == 200

    response = send_request()
    assert response.status_code == 429
