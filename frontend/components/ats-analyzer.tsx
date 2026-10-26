"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ErrorToast } from "@/components/ErrorToast";
import { FeedbackMessage } from "@/components/feedback-message";
import { getErrorMessage } from "@/lib/error-message";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_RESUME_TEXT_LENGTH = 50_000;
const MAX_JOB_DESCRIPTION_LENGTH = 20_000;

function getGuestId(): string {
  const storageKey = "resume_customizer_guest_id";
  let guestId = localStorage.getItem(storageKey);

  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(storageKey, guestId);
  }

  return guestId;
}

type ATSAnalysisResponse = {
  formatting_score: number;
  job_match_score: number | null;
  matched_keywords: string[];
  missing_keywords: string[];
  formatting_issues: string[];
  recommendations: string[];
};

type ATSQuota = {
  usage_date: string;
  ats_daily_limit: number;
  ats_used: number;
  ats_remaining: number;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAnalysisResponse(value: unknown): value is ATSAnalysisResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;
  return (
    typeof result.formatting_score === "number" &&
    result.formatting_score >= 0 &&
    result.formatting_score <= 100 &&
    (result.job_match_score === null ||
      (typeof result.job_match_score === "number" &&
        result.job_match_score >= 0 &&
        result.job_match_score <= 100)) &&
    isStringArray(result.matched_keywords) &&
    isStringArray(result.missing_keywords) &&
    isStringArray(result.formatting_issues) &&
    isStringArray(result.recommendations)
  );
}

function ScoreSummary({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  const scoreTone =
    score === null
      ? "bg-[#dce4dc]"
      : score < 50
        ? "bg-[#c8845c]"
        : score < 75
          ? "bg-[#c3a15b]"
          : "bg-[#6f956f]";

  return (
    <div className="min-w-0 rounded-[10px] border border-[#e2e8e2] bg-white px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="m-0 truncate text-[11px] font-semibold text-[#637267]">
          {label}
        </p>
        <p className="m-0 shrink-0 text-[22px] font-semibold leading-none tracking-[-0.05em] text-[#28583e]">
        {score === null ? (
          <span className="text-sm font-medium tracking-normal text-[#738075]">
            N/A
          </span>
        ) : (
          <>
            {score}
            <span className="ml-0.5 text-[11px] font-medium tracking-normal text-[#829084]">
              /100
            </span>
          </>
        )}
        </p>
      </div>
      {score !== null && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf1eb]"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
        >
          <div
            className={`h-full rounded-full transition-[width] ${scoreTone}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
      {score === null && (
        <p className="mb-0 mt-2 text-[10px] leading-snug text-[#78847b]">
          Add a job description to see a match score.
        </p>
      )}
    </div>
  );
}

function KeywordBadges({
  items,
  emptyMessage,
  showAllLabel,
  tone = "neutral",
}: {
  items: string[];
  emptyMessage: string;
  showAllLabel?: string;
  tone?: "positive" | "caution" | "neutral";
}) {
  const badgeColor =
    tone === "positive"
      ? "border-[#dce8d9] bg-[#f3f7f0] text-[#47664a]"
      : tone === "caution"
        ? "border-[#eadfce] bg-[#fbf7f0] text-[#795d3e]"
        : "border-[#e2e8e2] bg-[#f7f9f6] text-[#56665a]";
  const visibleItems = items.slice(0, 5);
  const hiddenItems = items.slice(5);

  return (
    <div>
      {items.length === 0 ? (
        <p className="m-0 text-xs leading-relaxed text-[#78847b]">
          {emptyMessage}
        </p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {visibleItems.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className={`max-w-full break-words rounded-md border px-2.5 py-1.5 text-[11px] leading-snug ${badgeColor}`}
              >
                {item}
              </li>
            ))}
          </ul>
          {hiddenItems.length > 0 && (
            <details className="group mt-2.5">
              <summary className="w-fit cursor-pointer list-none text-[11px] font-semibold text-[#52775c] underline decoration-[#c8d7c8] underline-offset-2 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/50 [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">
                  Show all {showAllLabel ?? "items"} ({items.length})
                </span>
                <span className="hidden group-open:inline">
                  Show fewer {showAllLabel ?? "items"}
                </span>
              </summary>
              <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
                {hiddenItems.map((item, index) => (
                  <li
                    key={`${item}-${index + 5}`}
                    className={`max-w-full break-words rounded-md border px-2.5 py-1.5 text-[11px] leading-snug ${badgeColor}`}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function TextList({
  items,
  emptyMessage,
}: {
  items: string[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="m-0 text-xs leading-relaxed text-[#78847b]">{emptyMessage}</p>;
  }

  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex items-start gap-2 text-xs leading-relaxed text-[#56665a]"
        >
          <span
            className="mt-[6px] size-1.5 shrink-0 rounded-full bg-[#94a195]"
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function ATSAnalyzer() {
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<ATSAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [atsQuota, setAtsQuota] = useState<ATSQuota | null>(null);
  const [quotaState, setQuotaState] = useState<
    "loading" | "loaded" | "error"
  >("loading");
  const requestInFlight = useRef(false);

  const refreshATSQuota = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quota-status`, {
        headers: { "X-Guest-ID": getGuestId() },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: unknown = await response.json();
      if (
        typeof data !== "object" ||
        data === null ||
        !("usage_date" in data) ||
        typeof data.usage_date !== "string" ||
        !("ats_daily_limit" in data) ||
        typeof data.ats_daily_limit !== "number" ||
        !("ats_used" in data) ||
        typeof data.ats_used !== "number" ||
        !("ats_remaining" in data) ||
        typeof data.ats_remaining !== "number"
      ) {
        throw new Error("The backend returned an invalid ATS quota status.");
      }

      setAtsQuota({
        usage_date: data.usage_date,
        ats_daily_limit: data.ats_daily_limit,
        ats_used: data.ats_used,
        ats_remaining: data.ats_remaining,
      });
      setQuotaState("loaded");
    } catch (cause) {
      console.warn("Failed to load ATS quota status:", cause);
      setQuotaState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshATSQuota();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshATSQuota]);
   useEffect(() => {
     console.log("ATS quota updated:", atsQuota);
   }, [atsQuota]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }
    if (!/\.(pdf|docx)$/i.test(selectedFile.name)) {
      setFile(null);
      setError("Choose a file with a .pdf or .docx extension.");
      return;
    }
    if (selectedFile.size === 0) {
      setFile(null);
      setError("The selected file is empty.");
      return;
    }
    if (selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      setFile(null);
      setError("The selected file exceeds the 10 MB limit.");
      return;
    }

    setFile(selectedFile);
  }

  function handleResumeTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setResumeText(event.target.value);
    setError("");
    setResult(null);
  }

  function handleJobDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setJobDescription(event.target.value);
    setError("");
    setResult(null);
  }

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
   event.preventDefault();

   if (requestInFlight.current) return;

   if (inputMode === "upload" && !file) {
     setError("Choose a PDF or DOCX resume to analyze.");
     return;
   }

   if (inputMode === "paste" && !resumeText.trim()) {
     setError("Paste your resume text before analyzing.");
     return;
   }

   if (inputMode === "paste" && resumeText.length > MAX_RESUME_TEXT_LENGTH) {
     setError("Resume text must be 50,000 characters or fewer.");
     return;
   }

   if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
     setError("The job description must be 20,000 characters or fewer.");
     return;
   }

   const requestBody = new FormData();

   if (inputMode === "upload" && file) {
     requestBody.append("file", file);
   } else {
     requestBody.append("resume_text", resumeText.trim());
   }

   if (jobDescription.trim()) {
     requestBody.append("job_description", jobDescription.trim());
   }

   requestInFlight.current = true;
   setIsAnalyzing(true);
   setError("");
   setResult(null);

   try {
     const response = await fetch(`${API_BASE_URL}/analyze-resume`, {
       method: "POST",
       headers: { "X-Guest-ID": getGuestId() },
       body: requestBody,
     });

     if (!response.ok) {
       const responseBody: unknown = await response
         .clone()
         .json()
         .catch(() => null);
       if (
         typeof responseBody === "object" &&
         responseBody !== null &&
         "detail" in responseBody &&
         typeof responseBody.detail === "object" &&
         responseBody.detail !== null &&
         "code" in responseBody.detail &&
         responseBody.detail.code === "ATS_DAILY_QUOTA_EXCEEDED"
       ) {
         void refreshATSQuota();
       }
       throw new Error(await getErrorMessage(response));
     }

     const responseData: unknown = await response.json();

     if (!isAnalysisResponse(responseData)) {
       throw new Error(
         "The backend returned an invalid ATS analysis response.",
       );
     }

     setResult(responseData);
     if (jobDescription.trim()) {
       await refreshATSQuota();
     }
   } catch (cause) {
     setError(
       cause instanceof TypeError
         ? "Could not reach the analysis service. Check your connection and try again."
         : cause instanceof Error && cause.message
           ? cause.message
           : "Could not analyze the resume. Please try again.",
     );
   } finally {
     requestInFlight.current = false;
     setIsAnalyzing(false);
   }
 }

  function switchInputMode(mode: "upload" | "paste") {
    setInputMode(mode);
    setError("");
    setResult(null);
    if (mode === "upload") {
      setResumeText("");
    } else {
      setFile(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[radial-gradient(ellipse_at_82%_0%,rgba(222,235,222,0.6),transparent_34rem),#f6f7f4] px-4 pb-12 text-[#1f2b24] sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1080px]">
        <header className="py-9 sm:py-12">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#52775c]">
            A clearer picture of your resume
          </p>
          <h1 className="mt-3 text-[clamp(34px,7vw,48px)] font-semibold leading-tight tracking-[-0.06em] text-[#26382c]">
            ATS Resume Analyzer
          </h1>
          <p className="mb-0 mt-3 max-w-2xl text-sm leading-7 text-[#66736a] sm:text-base">
            Review formatting and, if you add a job description, see how your
            resume aligns with the role.
          </p>
          {quotaState === "loaded" && atsQuota && (
            <div
              className={`mt-4 flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-[12.5px] leading-[1.5] sm:justify-start ${
                atsQuota.ats_remaining > 0
                  ? "border-[#e1e9e1] bg-white/70 text-[#66736a]"
                  : "border-[#f2d9c8] bg-[#fdf3ec] text-[#8a4a22]"
              }`}
              role="status"
            >
              <span className="mt-[2px] font-semibold">
                {atsQuota.ats_remaining > 0 ? "●" : "!"}
              </span>
              <span>
                {atsQuota.ats_remaining > 0 ? (
                  <>
                    <strong className="text-[#1f2b24]">
                      {atsQuota.ats_remaining} of {atsQuota.ats_daily_limit}
                    </strong>{" "}
                    job-match analysis
                    {atsQuota.ats_daily_limit === 1 ? "" : "es"}{" "}
                    remaining today.
                  </>
                ) : (
                  <>
                    <strong className="text-[#8a4a22]">
                      You&apos;ve used today&apos;s job-match analysis.
                    </strong>{" "}
                    Formatting-only analysis remains available; job matching
                    resets at midnight UTC.
                  </>
                )}
              </span>
            </div>
          )}
          {quotaState === "error" && (
            <p className="mb-0 mt-3 text-[12px] text-[#8a8f8a]">
              Couldn&apos;t load the ATS quota status — you can still analyze
              your resume.
            </p>
          )}
        </header>

        {error && (
          <ErrorToast message={error} onDismiss={() => setError("")} />
        )}
        {isAnalyzing && (
          <div className="mb-4">
            <FeedbackMessage
              kind="loading"
              message="Analyzing your resume…"
            />
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section
            className="min-w-0 rounded-[15px] border border-[#e2e8e2] bg-white p-5 shadow-[0_2px_5px_rgba(34,55,39,0.025),0_16px_42px_rgba(34,55,39,0.045)] sm:p-7"
            aria-labelledby="analyzer-input-title"
          >
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#52775c]">
              Your materials
            </p>
            <h2
              id="analyzer-input-title"
              className="mb-0 mt-1.5 text-lg font-semibold tracking-[-0.035em] text-[#26342a]"
            >
              Add a resume to get started
            </h2>

            <div
              className="mt-5 grid grid-cols-2 rounded-[10px] bg-[#f2f5f0] p-1"
              role="tablist"
              aria-label="Resume input method"
            >
              <button
                id="upload-tab"
                type="button"
                role="tab"
                aria-selected={inputMode === "upload"}
                aria-controls="resume-input-panel"
                onClick={() => switchInputMode("upload")}
                className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#34704b]/35 ${
                  inputMode === "upload"
                    ? "bg-white text-[#28583e] shadow-sm"
                    : "text-[#718074] hover:text-[#28583e]"
                }`}
              >
                Upload a file
              </button>
              <button
                id="paste-tab"
                type="button"
                role="tab"
                aria-selected={inputMode === "paste"}
                aria-controls="resume-input-panel"
                onClick={() => switchInputMode("paste")}
                className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#34704b]/35 ${
                  inputMode === "paste"
                    ? "bg-white text-[#28583e] shadow-sm"
                    : "text-[#718074] hover:text-[#28583e]"
                }`}
              >
                Paste text
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                id="resume-input-panel"
                role="tabpanel"
                aria-labelledby={inputMode === "upload" ? "upload-tab" : "paste-tab"}
                className="mt-4"
              >
                {inputMode === "upload" ? (
                  <label
                    htmlFor="ats-resume-file"
                    className={`flex min-h-[112px] cursor-pointer items-center gap-3 rounded-[11px] border border-dashed p-4 transition focus-within:outline-[3px] focus-within:outline-offset-[3px] focus-within:outline-[#34704b]/35 ${
                      file
                        ? "border-[#79a083] bg-[#f5faf5]"
                        : "border-[#c9d7cb] bg-[#fafcf9] hover:border-[#79a083] hover:bg-[#f5faf5]"
                    }`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[#e8eee8] bg-white text-[#4c8059]" aria-hidden="true">
                      <svg className="size-5" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3.75c0 .41.34.75.75.75h12.5a.75.75 0 0 0 .75-.75V15.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-[#34463a]">
                        {file ? file.name : "Choose a PDF or DOCX resume"}
                      </strong>
                      <span className="mt-1 block text-[11px] text-[#78877b]">
                        {file
                          ? `${(file.size / 1024).toFixed(0)} KB · Ready to analyze`
                          : "Maximum file size 10 MB"}
                      </span>
                    </span>
                    <span className="rounded-[7px] border border-[#dfe8df] bg-white px-3 py-2 text-[10px] font-semibold text-[#3f6e4a]">
                      Browse
                    </span>
                    <input
                      id="ats-resume-file"
                      className="sr-only"
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                      disabled={isAnalyzing}
                    />
                  </label>
                ) : (
                  <>
                    <label
                      htmlFor="ats-resume-text"
                      className="mb-2 block text-xs font-semibold text-[#35473a]"
                    >
                      Resume text
                    </label>
                    <textarea
                      id="ats-resume-text"
                      className="block min-h-[180px] w-full resize-y rounded-[9px] border border-[#dfe6df] bg-[#fcfdfb] px-3 py-3 text-xs leading-[1.65] text-[#29362d] transition placeholder:text-[#9aa59c] hover:border-[#c7d5c9] focus:border-[#72967a] focus:outline-none focus:ring-[3px] focus:ring-[#3f6f49]/[0.11]"
                      maxLength={MAX_RESUME_TEXT_LENGTH}
                      placeholder="Paste your resume text here…"
                      value={resumeText}
                      onChange={handleResumeTextChange}
                      disabled={isAnalyzing}
                    />
                    <p className="mb-0 mt-1.5 text-right text-[10px] text-[#89948b]">
                      {resumeText.length.toLocaleString()} /{" "}
                      {MAX_RESUME_TEXT_LENGTH.toLocaleString()}
                    </p>
                  </>
                )}
              </div>

              <div className="my-5 h-px bg-[#edf0ed]" />

              <label
                htmlFor="ats-job-description"
                className="block text-xs font-semibold text-[#35473a]"
              >
                Job description{" "}
                <span className="font-normal text-[#89948b]">(optional)</span>
              </label>
              <textarea
                id="ats-job-description"
                className="mt-2 block min-h-[120px] w-full resize-y rounded-[9px] border border-[#dfe6df] bg-white p-3 text-xs leading-[1.65] text-[#29362d] transition placeholder:text-[#9aa59c] hover:border-[#c7d5c9] focus:border-[#72967a] focus:outline-none focus:ring-[3px] focus:ring-[#3f6f49]/[0.11]"
                maxLength={MAX_JOB_DESCRIPTION_LENGTH}
                placeholder="Paste a job description to see matched and missing keywords…"
                value={jobDescription}
                onChange={handleJobDescriptionChange}
                disabled={isAnalyzing}
              />
              <p className="mb-0 mt-1.5 text-right text-[10px] text-[#89948b]">
                {jobDescription.length.toLocaleString()} /{" "}
                {MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()}
              </p>

              <button
                className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[9px] border border-[#28583e] bg-[#28583e] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_2px_4px_rgba(34,78,48,0.12)] transition hover:border-[#204a33] hover:bg-[#204a33] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/35 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isAnalyzing}
              >
                {jobDescription.trim()
                  ? "Check job match"
                  : "Analyze my resume"}
                <svg className="size-[17px]" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 10h12m-5-5 5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <p className="mb-0 mt-2.5 text-center text-[10px] leading-normal text-[#89948b]">
                Formatting-only analysis is free. Adding a job description uses
                one daily ATS analysis for keyword matching and a match score.
              </p>
            </form>
          </section>

          <section aria-labelledby="analysis-results-title" aria-live="polite">
            <div className="mb-4">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#52775c]">
                Your analysis
              </p>
              <h2
                id="analysis-results-title"
                className="mb-0 mt-1.5 text-lg font-semibold tracking-[-0.035em] text-[#26342a]"
              >
                Results
              </h2>
            </div>

            {result ? (
              <div className="overflow-hidden rounded-[13px] border border-[#e2e8e2] bg-white shadow-[0_2px_5px_rgba(34,55,39,0.025)]">
                <div className="border-b border-[#edf0ed] bg-[#f8faf7] p-4 sm:p-5">
                  <h3 className="mb-0 text-xs font-semibold uppercase tracking-[0.1em] text-[#718074]">
                    Score summary
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <ScoreSummary
                      label="Formatting"
                      score={result.formatting_score}
                    />
                    <ScoreSummary
                      label="Job match"
                      score={result.job_match_score}
                    />
                  </div>
                </div>

                <div className="divide-y divide-[#edf0ed]">
                  <section className="p-4 sm:p-5" aria-labelledby="formatting-title">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3
                        id="formatting-title"
                        className="m-0 text-sm font-semibold text-[#2d4134]"
                      >
                        Formatting
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          result.formatting_issues.length > 0
                            ? "bg-[#fbf3e9] text-[#875d2e]"
                            : "bg-[#edf5e9] text-[#49714e]"
                        }`}
                      >
                        {result.formatting_issues.length > 0
                          ? `${result.formatting_issues.length} issue${result.formatting_issues.length === 1 ? "" : "s"}`
                          : "No issues found"}
                      </span>
                    </div>
                    {result.formatting_issues.length > 0 ? (
                      <details className="mt-2.5">
                        <summary className="w-fit cursor-pointer list-none text-[11px] font-semibold text-[#52775c] underline decoration-[#c8d7c8] underline-offset-2 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/50 [&::-webkit-details-marker]:hidden">
                          Review formatting issues
                        </summary>
                        <div className="mt-3">
                          <TextList
                            items={result.formatting_issues}
                            emptyMessage="No formatting issues were detected."
                          />
                        </div>
                      </details>
                    ) : (
                      <p className="mb-0 mt-1.5 text-xs text-[#78847b]">
                        No formatting issues were detected.
                      </p>
                    )}
                  </section>

                  <section className="p-4 sm:p-5" aria-labelledby="missing-keywords-title">
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <h3
                        id="missing-keywords-title"
                        className="m-0 text-sm font-semibold text-[#2d4134]"
                      >
                        Missing keywords
                      </h3>
                      {result.missing_keywords.length > 0 && (
                        <span className="rounded-full bg-[#fbf3e9] px-2.5 py-1 text-[10px] font-semibold text-[#875d2e]">
                          {result.missing_keywords.length} to review
                        </span>
                      )}
                    </div>
                    {result.job_match_score !== null &&
                      result.job_match_score < 50 && (
                        <p className="mb-3 mt-0 rounded-md border-l-2 border-[#c38a55] bg-[#fbf7f0] px-3 py-2 text-[11px] leading-relaxed text-[#72583e]">
                          Low job match. Start by reviewing these missing
                          keywords and add them only where they reflect your
                          experience.
                        </p>
                      )}
                    <KeywordBadges
                      items={result.missing_keywords}
                      emptyMessage={
                        result.job_match_score === null
                          ? "Add a job description to see missing keywords."
                          : "No missing keywords were reported."
                      }
                      showAllLabel="keywords"
                      tone="caution"
                    />
                  </section>

                  <section className="p-4 sm:p-5" aria-labelledby="recommendations-title">
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <h3
                        id="recommendations-title"
                        className="m-0 text-sm font-semibold text-[#2d4134]"
                      >
                        Recommendations
                      </h3>
                      {result.recommendations.length > 0 && (
                        <span className="text-[10px] text-[#89948b]">
                          {result.recommendations.length}
                        </span>
                      )}
                    </div>
                    {result.recommendations.length > 0 ? (
                      <>
                        <TextList
                          items={result.recommendations.slice(0, 2)}
                          emptyMessage="No recommendations were provided."
                        />
                        {result.recommendations.length > 2 && (
                          <details className="group mt-2.5">
                            <summary className="w-fit cursor-pointer list-none text-[11px] font-semibold text-[#52775c] underline decoration-[#c8d7c8] underline-offset-2 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/50 [&::-webkit-details-marker]:hidden">
                              <span className="group-open:hidden">
                                Show all recommendations (
                                {result.recommendations.length})
                              </span>
                              <span className="hidden group-open:inline">
                                Show fewer recommendations
                              </span>
                            </summary>
                            <div className="mt-3">
                              <TextList
                                items={result.recommendations.slice(2)}
                                emptyMessage="No additional recommendations."
                              />
                            </div>
                          </details>
                        )}
                      </>
                    ) : (
                      <p className="m-0 text-xs text-[#78847b]">
                        No recommendations were provided.
                      </p>
                    )}
                  </section>

                  <details className="group p-4 sm:p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#2d4134] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/50 [&::-webkit-details-marker]:hidden">
                      Matched keywords
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-[#89948b]">
                          {result.matched_keywords.length}
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-xs text-[#6f806f] transition-transform group-open:rotate-180"
                        >
                          ▾
                        </span>
                      </span>
                    </summary>
                    <div className="mt-3">
                      <KeywordBadges
                        items={result.matched_keywords}
                        emptyMessage={
                          result.job_match_score === null
                            ? "Add a job description to see matched keywords."
                            : "No matched keywords were reported."
                        }
                        showAllLabel="matched keywords"
                        tone="positive"
                      />
                    </div>
                  </details>
                </div>
              </div>
            ) : (
              <div className="rounded-[15px] border border-dashed border-[#d6e0d6] bg-white/70 px-6 py-12 text-center sm:py-16">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf4ee] text-[#477051]" aria-hidden="true">
                  <svg className="size-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 19V5m0 14h14M8 15l3-4 3 2 4-6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h3 className="mb-0 mt-4 text-sm font-semibold text-[#34463a]">
                  Your results will appear here
                </h3>
                <p className="mx-auto mb-0 mt-2 max-w-sm text-xs leading-relaxed text-[#78847b]">
                  Add a resume and select Analyze to review its formatting,
                  recommendations, and optional job match.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
