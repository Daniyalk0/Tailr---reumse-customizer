from pydantic import BaseModel, Field, field_validator
from typing import Literal


MAX_RESUME_TEXT_LENGTH = 50_000
MAX_JOB_DESCRIPTION_LENGTH = 20_000


class CustomizeResumeRequest(BaseModel):
    resume_text: str = Field(max_length=MAX_RESUME_TEXT_LENGTH)
    job_description: str = Field(max_length=MAX_JOB_DESCRIPTION_LENGTH)

    @field_validator("resume_text", "job_description")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Text cannot be empty or whitespace only")
        return value


class CustomizeResumeResponse(BaseModel):
    customized_resume: str
    suggested_keywords: list[str] = []

    @field_validator("customized_resume")
    @classmethod
    def reject_blank_customized_resume(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Customized resume cannot be empty or whitespace only")
        return value

    @field_validator("suggested_keywords")
    @classmethod
    def validate_suggested_keywords(cls, value: list[str]) -> list[str]:
        keywords = [keyword.strip() for keyword in value]
        if any(not keyword for keyword in keywords):
            raise ValueError("Suggested keywords cannot be empty or whitespace only")
        if len({keyword.casefold() for keyword in keywords}) != len(keywords):
            raise ValueError("Suggested keywords must be unique")
        return keywords


class DownloadResumeRequest(BaseModel):
    resume_text: str = Field(max_length=MAX_RESUME_TEXT_LENGTH)

    @field_validator("resume_text")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Resume text cannot be empty or whitespace only")
        return value


class ResumeClaimIssue(BaseModel):
    claim: str = Field(description="The specific claim in the generated resume.")
    reason: str = Field(
        description="Why the claim is unsupported or changes the source meaning."
    )
    severity: Literal["high", "medium", "low"]


class ResumeValidationResponse(BaseModel):
    issues: list[ResumeClaimIssue] = Field(default_factory=list)



class ATSAnalysisRequest(BaseModel):
    resume_text: str = Field(max_length=MAX_RESUME_TEXT_LENGTH)
    job_description: str | None = Field(
        default=None,
        max_length=MAX_JOB_DESCRIPTION_LENGTH,
    )

    @field_validator("resume_text")
    @classmethod
    def reject_blank_resume(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Resume text cannot be empty")
        return value

    @field_validator("job_description")
    @classmethod
    def reject_blank_job_description(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            return None
        return value


class ATSAnalysisResponse(BaseModel):
    formatting_score: int = Field(ge=0, le=100)
    job_match_score: int | None = Field(default=None, ge=0, le=100)
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    formatting_issues: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
