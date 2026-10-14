"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { FeedbackMessage } from "../components/feedback-message";
import { JobDescriptionInput } from "../components/job-description-input";
import { ResumePreview } from "../components/resume-preview";
import { ResumeUpload } from "../components/resume-upload";
import { insertKeywordInSkillsCategory } from "../lib/resume-text";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_RESUME_TEXT_LENGTH = 50_000;
const MAX_JOB_DESCRIPTION_LENGTH = 20_000;

type BusyAction = "upload" | "customize" | "pdf" | "docx" | null;

function getClientError(cause: unknown, fallback: string): string {
  if (cause instanceof TypeError) {
    return "We can’t reach our servers. Check your connection and try again.";
  }

  return cause instanceof Error ? cause.message : fallback;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = body.detail;

      if (typeof detail === "string") {
        return detail;
      }

      if (Array.isArray(detail)) {
        return detail
          .map((item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            "msg" in item &&
            typeof item.msg === "string"
              ? item.msg
              : "",
          )
          .filter(Boolean)
          .join(" ");
      }
    }
  } catch {
    return `Request failed (${response.status}).`;
  }

  return `Request failed (${response.status}).`;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [customizedResume, setCustomizedResume] = useState("");
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState("");
  const [uploadFailed, setUploadFailed] = useState(false);
  const requestInFlight = useRef(false);

  function handleFileChange(selectedFile: File | null) {
    if (!selectedFile) {
      return;
    }
    if (selectedFile && !/\.(pdf|docx)$/i.test(selectedFile.name)) {
      setError("Choose a file with a .pdf or .docx extension.");
      return;
    }
    if (selectedFile && selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      setError("The selected file exceeds the 10 MB limit.");
      return;
    }

    setFile(selectedFile);
    setResumeText("");
    setCustomizedResume("");
    setSuggestedKeywords([]);
    setUploadFailed(false);
    setError("");

    if (selectedFile.size === 0) {
      setError("The selected file is empty.");
      return;
    }

    void handleUpload(selectedFile);
  }

  async function handleUpload(uploadFile: File) {
    if (requestInFlight.current) {
      return;
    }
    if (!/\.(pdf|docx)$/i.test(uploadFile.name)) {
      setError("Choose a file with a .pdf or .docx extension.");
      setUploadFailed(false);
      return;
    }
    if (uploadFile.size === 0) {
      setError("The selected file is empty.");
      setUploadFailed(false);
      return;
    }
    if (uploadFile.size > MAX_UPLOAD_SIZE_BYTES) {
      setError("The selected file exceeds the 10 MB limit.");
      setUploadFailed(false);
      return;
    }

    requestInFlight.current = true;
    setBusy("upload");
    setError("");
    setUploadFailed(false);
    setCustomizedResume("");
    setSuggestedKeywords([]);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch(`${API_BASE_URL}/upload-resume`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("extracted_text" in result) ||
        typeof result.extracted_text !== "string"
      ) {
        throw new Error("The backend returned an invalid upload response.");
      }
      if (result.extracted_text.length > MAX_RESUME_TEXT_LENGTH) {
        throw new Error("The extracted resume exceeds the 50,000-character limit.");
      }
      if (!result.extracted_text.trim()) {
        throw new Error("No readable text was found in the uploaded resume.");
      }

      setResumeText(result.extracted_text);
      setUploadFailed(false);
    } catch (cause) {
      setError(
        getClientError(cause, "Could not upload the resume. Please try again."),
      );
      setUploadFailed(true);
    } finally {
      requestInFlight.current = false;
      setBusy(null);
    }
  }

  function handleRetryUpload() {
    if (file) {
      void handleUpload(file);
    }
  }

  async function handleCustomize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (requestInFlight.current) {
      return;
    }
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError("Upload a resume and add a job description before continuing.");
      return;
    }
    if (resumeText.length > MAX_RESUME_TEXT_LENGTH) {
      setError("Resume text must be 50,000 characters or fewer.");
      return;
    }
    if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      setError("The job description must be 20,000 characters or fewer.");
      return;
    }

    requestInFlight.current = true;
    setBusy("customize");
    setError("");
    setCustomizedResume("");
    setSuggestedKeywords([]);

    try {
      const response = await fetch(`${API_BASE_URL}/customize-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("customized_resume" in result) ||
        typeof result.customized_resume !== "string" ||
        !("suggested_keywords" in result) ||
        !Array.isArray(result.suggested_keywords) ||
        !result.suggested_keywords.every(
          (keyword: unknown) =>
            typeof keyword === "string" && Boolean(keyword.trim()),
        )
      ) {
        throw new Error("The backend returned an invalid customization response.");
      }
      if (!result.customized_resume.trim()) {
        throw new Error("The backend returned an empty customized resume.");
      }
      if (result.customized_resume.length > MAX_RESUME_TEXT_LENGTH) {
        throw new Error("The customized resume exceeds the 50,000-character limit.");
      }

      setCustomizedResume(result.customized_resume);
      setSuggestedKeywords(
        Array.from(
          new Map(
            result.suggested_keywords.map((keyword: string) => [
              keyword.trim().toLocaleLowerCase(),
              keyword.trim(),
            ]),
          ).values(),
        ),
      );
    } catch (cause) {
      setError(
        getClientError(
          cause,
          "Could not customize the resume. Please try again.",
        ),
      );
    } finally {
      requestInFlight.current = false;
      setBusy(null);
    }
  }

  async function handleDownload(format: "pdf" | "docx") {
    if (requestInFlight.current) {
      return;
    }
    if (!customizedResume.trim()) {
      setError("Customize your resume before downloading it.");
      return;
    }
    if (customizedResume.length > MAX_RESUME_TEXT_LENGTH) {
      setError("Resume text must be 50,000 characters or fewer to download.");
      return;
    }

    requestInFlight.current = true;
    setBusy(format);
    setError("");

    try {
      const body =
        format === "pdf"
          ? { resume_text: customizedResume }
          : {
              resume_text: customizedResume,
              job_description: jobDescription,
            };
      const response = await fetch(
        `${API_BASE_URL}/download-resume/${format}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const downloadUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `customized_resume.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (cause) {
      setError(
        getClientError(
          cause,
          `Could not download the ${format.toUpperCase()} resume.`,
        ),
      );
    } finally {
      requestInFlight.current = false;
      setBusy(null);
    }
  }

  function handleResumeTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setResumeText(event.target.value);
    setCustomizedResume("");
    setSuggestedKeywords([]);
  }

  function handleJobDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setJobDescription(event.target.value);
    setCustomizedResume("");
    setSuggestedKeywords([]);
  }

  function handleCustomizedResumeChange(
    event: ChangeEvent<HTMLTextAreaElement>,
  ) {
    setCustomizedResume(event.target.value);
  }

  function handleAddKeyword(keyword: string, category: string) {
    if (requestInFlight.current || !customizedResume.trim()) {
      return;
    }

    const result = insertKeywordInSkillsCategory(
      customizedResume,
      keyword,
      category,
    );
    if (result.status === "duplicate") {
      setError(`“${keyword}” is already listed in Skills.`);
      return;
    }
    if (result.status === "category-not-found") {
      setError("Choose an existing category in the Skills section.");
      return;
    }
    if (result.status === "invalid-keyword") {
      setError("Choose a valid suggested keyword before adding it.");
      return;
    }
    if (result.resume.length > MAX_RESUME_TEXT_LENGTH) {
      setError("The customized resume cannot exceed 50,000 characters.");
      return;
    }

    setCustomizedResume(result.resume);
    setSuggestedKeywords((current) =>
      current.filter(
        (suggestion) =>
          suggestion.toLocaleLowerCase() !== keyword.toLocaleLowerCase(),
      ),
    );
    setError("");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_82%_0%,rgba(222,235,222,0.6),transparent_34rem),#f6f7f4] px-4 pb-9 text-[#1f2b24] sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1260px]">
        <header className="flex min-h-[66px] items-center justify-between border-b border-[#dae2da]/80 sm:min-h-[78px]">
          <a className="inline-flex items-center gap-2.5 text-[#1f2b24] no-underline" href="/" aria-label="Tailr home">
            <span className="grid size-[34px] place-items-center rounded-[11px] bg-[#28583e] text-white" aria-hidden="true">
              <svg className="size-[21px]" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 19 17.5 6.5M8 5l1.2 3.8L13 10l-3.8 1.2L8 15l-1.2-3.8L3 10l3.8-1.2L8 5ZM17 13l1.1 3.1L21 17l-2.9.9L17 21l-.9-3.1L13 17l3.1-.9L17 13Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-xl font-semibold tracking-[-0.055em]">Tailr</span>
          </a>
          <span className="inline-flex max-w-[155px] items-center gap-2 text-right text-[10px] text-[#66746a] sm:max-w-none sm:text-left sm:text-[13px]">
            <span className="inline-block size-[7px] shrink-0 rounded-full bg-[#5d956d] shadow-[0_0_0_3px_rgba(93,149,109,0.12)]" aria-hidden="true" />
            Your experience, thoughtfully tailored
          </span>
        </header>

        <section className="flex min-h-0 flex-col items-start justify-between gap-5 py-8 sm:min-h-[235px] sm:flex-row sm:items-center sm:gap-8 sm:py-10">
          <div className="max-w-[650px]">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#52775c]">A better fit starts here</p>
            <h1 className="mt-[13px] text-[clamp(34px,9vw,43px)] font-semibold leading-[1.08] tracking-[-0.057em] sm:text-[clamp(34px,4.1vw,49px)]">
              Your next role.
              <br />
              <span className="text-[#28583e]">A resume that speaks to it.</span>
            </h1>
            <p className="mt-3 max-w-[590px] text-[13px] leading-[1.7] text-[#66736a] sm:mt-4 sm:text-[15px] sm:leading-[1.75]">
              Bring your experience and the opportunity. We’ll help you put the
              most relevant parts forward—without losing what makes it yours.
            </p>
          </div>
          <div className="flex w-full items-center gap-[13px] rounded-[13px] border border-[#e1e9e1] bg-white/70 p-3 shadow-[0_10px_30px_rgba(40,69,48,0.035)] sm:w-[270px] sm:shrink-0 sm:items-start sm:p-[17px] md:w-[236px]" aria-label="Your information stays yours">
            <span className="grid size-[35px] shrink-0 place-items-center rounded-[10px] bg-[#edf4ee] text-[#28583e]" aria-hidden="true">
              <svg className="size-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3 19 6v5c0 4.5-2.9 8-7 10-4.1-2-7-5.5-7-10V6l7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>
              <strong className="block pt-px text-xs font-semibold leading-[1.5] text-[#2d4134]">Grounded in your experience</strong>
              <small className="mt-1 block text-[11px] leading-[1.5] text-[#728076]">No invented skills or achievements</small>
            </span>
          </div>
        </section>

        <nav className="mb-[17px] flex items-center gap-1.5 rounded-xl border border-[#e3e9e3] bg-white/60 px-[7px] py-2.5 sm:gap-[13px] sm:px-[17px] sm:py-3" aria-label="Resume customization steps">
          <span className="inline-flex shrink items-center gap-1 whitespace-nowrap text-[8px] font-medium text-[#315a3e] sm:gap-2 sm:text-xs">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[#d5e5d7] bg-[#eaf3eb] text-[8px] font-bold text-[#28583e] sm:size-[23px] sm:text-[9px]">01</span>
            <span>Share your materials</span>
          </span>
          <span className="h-px min-w-1 flex-1 bg-[#e5eae5]" aria-hidden="true" />
          <span className={`inline-flex shrink items-center gap-1 whitespace-nowrap text-[8px] font-medium sm:gap-2 sm:text-xs ${customizedResume ? "text-[#315a3e]" : "text-[#8a958d]"}`}>
            <span className={`grid size-5 shrink-0 place-items-center rounded-full border text-[8px] font-bold sm:size-[23px] sm:text-[9px] ${customizedResume ? "border-[#d5e5d7] bg-[#eaf3eb] text-[#28583e]" : "border-[#e2e8e2] bg-white text-[#76847a]"}`}>02</span>
            <span>Make it yours</span>
          </span>
          <span className="h-px min-w-1 flex-1 bg-[#e5eae5]" aria-hidden="true" />
          <span className={`inline-flex shrink items-center gap-1 whitespace-nowrap text-[8px] font-medium sm:gap-2 sm:text-xs ${customizedResume ? "text-[#315a3e]" : "text-[#8a958d]"}`}>
            <span className={`grid size-5 shrink-0 place-items-center rounded-full border text-[8px] font-bold sm:size-[23px] sm:text-[9px] ${customizedResume ? "border-[#d5e5d7] bg-[#eaf3eb] text-[#28583e]" : "border-[#e2e8e2] bg-white text-[#76847a]"}`}>03</span>
            <span>Take it with you</span>
          </span>
        </nav>

        {error && (
          <div className="mb-3.5">
            <FeedbackMessage kind="error" message={error} />
          </div>
        )}
        {busy && (
          <div className="mb-3.5">
            <FeedbackMessage
              kind="loading"
              message={
                busy === "upload"
                  ? "Reading your resume…"
                  : busy === "customize"
                    ? "Finding the strongest match for this role…"
                    : `Preparing your ${busy.toUpperCase()} download…`
              }
            />
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-[13px] lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-[17px]">
          <section className="min-w-0 rounded-[13px] border border-[#e2e8e2] bg-white p-[19px] shadow-[0_2px_5px_rgba(34,55,39,0.025),0_16px_42px_rgba(34,55,39,0.045)] sm:rounded-[15px] sm:p-6" aria-labelledby="input-title">
            <div className="flex items-start justify-between gap-[15px] border-b border-[#edf0ed] pb-5">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#52775c]">Step 01</p>
                <h2 id="input-title" className="mt-1.5 text-lg font-semibold tracking-[-0.035em] text-[#26342a]">Start with the essentials</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#6b786f]">
                  Add your current resume and the role you’re aiming for.
                </p>
              </div>
              <span className="grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-[#f0f5f0] text-[#477051]" aria-hidden="true">
                <svg className="size-[21px]" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 3.75h6.5L19 9.25V20a.75.75 0 0 1-.75.75h-10.5A.75.75 0 0 1 7 20V3.75Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 4v5.5h5.5M10 13h6M10 16h6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>

            <div className="pt-[21px]">
              <ResumeUpload
                file={file}
                resumeText={resumeText}
                isUploading={busy === "upload"}
                isBusy={busy !== null}
                canRetry={uploadFailed}
                onFileChange={handleFileChange}
                onRetry={handleRetryUpload}
                onResumeTextChange={handleResumeTextChange}
              />
              <div className="my-5 h-px bg-[#edf0ed]" />
              <JobDescriptionInput
                value={jobDescription}
                isCustomizing={busy === "customize"}
                isBusy={busy !== null}
                canSubmit={Boolean(resumeText.trim() && jobDescription.trim())}
                onChange={handleJobDescriptionChange}
                onSubmit={handleCustomize}
              />
            </div>
          </section>

          <ResumePreview
            originalResume={resumeText}
            resume={customizedResume}
            suggestedKeywords={suggestedKeywords}
            busy={busy}
            onResumeChange={handleCustomizedResumeChange}
            onAddKeyword={handleAddKeyword}
            onDownload={handleDownload}
          />
        </div>

        <footer className="flex items-center justify-center gap-[7px] px-[5px] pt-[22px] text-center text-[10px] text-[#78847b]">
          <span className="inline-flex text-[#6c8972]" aria-hidden="true">
            <svg className="size-[13px]" viewBox="0 0 24 24" fill="none">
              <rect
                x="5"
                y="10"
                width="14"
                height="11"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 10V7a4 4 0 1 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          Your resume is yours. Review every change before you download.
        </footer>
      </div>
    </main>
  );
}
