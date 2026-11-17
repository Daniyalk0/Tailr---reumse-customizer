from backend.services.prompts import (
    build_customization_prompt,
    build_validation_prompt,
)


def test_customization_prompt_preserves_facts_and_durations():
    prompt = build_customization_prompt(
        resume_text="Education: University, degree in progress, 2026 – Present",
        job_description="Software engineer",
    )

    assert "Preserve all original facts" in prompt
    assert (
        "Never invent, assume, modify, or remove factual information"
        in prompt
    )
    assert "without changing the meaning of the original resume" in prompt
    assert '"2026 – Present" must not become "Expected 2026"' in prompt
    assert (
        "Only include experience durations explicitly stated or directly supported"
        in prompt
    )
    assert (
        "never infer or calculate a duration from employment dates"
        in prompt
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
    assert (
        "Do not infer or calculate experience durations from employment dates"
        in prompt
    )
