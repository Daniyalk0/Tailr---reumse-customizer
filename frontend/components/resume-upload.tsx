import type { ChangeEvent } from "react";

const MAX_RESUME_TEXT_LENGTH = 50_000;

type ResumeUploadProps = {
  file: File | null;
  resumeText: string;
  isUploading: boolean;
  isBusy: boolean;
  canRetry: boolean;
  onFileChange: (file: File | null) => void;
  onRetry: () => void;
  onResumeTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
};

function formatFileSize(size: number): string {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResumeUpload({
  file,
  resumeText,
  isUploading,
  isBusy,
  canRetry,
  onFileChange,
  onRetry,
  onResumeTextChange,
}: ResumeUploadProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  return (
    <section aria-labelledby="resume-upload-title">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#eff5ef] text-[11px] font-bold text-[#3c6948]" aria-hidden="true">
          1
        </span>
        <div>
          <h3 id="resume-upload-title" className="m-0 text-[13px] font-semibold text-[#2a392e]">
            Your current resume
          </h3>
          <p className="mt-[3px] text-[11px] text-[#7b887e]">Upload a PDF or Word document</p>
        </div>
      </div>

      <label
          htmlFor="resume-file"
          className={`flex min-h-[83px] ${isBusy ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-[#79a083] hover:bg-[#f5faf5]"} items-center gap-3 rounded-[11px] border border-dashed p-[13px] transition focus-within:outline-[3px] focus-within:outline-offset-[3px] focus-within:outline-[#34704b]/35 ${file ? "border-[#79a083] bg-[#f5faf5]" : "border-[#c9d7cb] bg-[#fafcf9]"}`}
        >
          <span className="grid size-[38px] shrink-0 place-items-center rounded-[10px] border border-[#e8eee8] bg-white text-[#4c8059]" aria-hidden="true">
            {file ? (
              <svg className="size-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.5 3.75h7l4 4V20a.75.75 0 0 1-.75.75h-10.5A.75.75 0 0 1 5.5 20V4.5a.75.75 0 0 1 .75-.75Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 4v4h4M8.5 14l2.25 2.25L15.5 11.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg className="size-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3.75c0 .41.34.75.75.75h12.5a.75.75 0 0 0 .75-.75V15.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-[#34463a]">{file ? file.name : "Choose a file or browse"}</strong>
            <span className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#78877b]">
              {file
                ? `${file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"} · ${formatFileSize(file.size)}`
                : "PDF or DOCX · Maximum 10 MB"}
            </span>
          </span>
          <span className="rounded-[7px] border border-[#dfe8df] bg-white px-2.5 py-[7px] text-[10px] font-semibold text-[#3f6e4a]">{file ? "Replace" : "Browse"}</span>
          <input
            id="resume-file"
            className="sr-only"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleChange}
            disabled={isBusy}
            aria-describedby="resume-file-help"
          />
        </label>
        <span id="resume-file-help" className="sr-only">
          Accepted formats are PDF and DOCX. Maximum size is 10 megabytes.
        </span>

      {isUploading && (
        <p className="mt-2.5 flex items-center gap-2 text-[11px] text-[#36543d]" role="status">
          <span className="size-3.5 animate-spin rounded-full border-2 border-[#305639]/20 border-t-[#3a7047] motion-reduce:animate-none" aria-hidden="true" />
          Extracting text from your resume…
        </p>
      )}
      {canRetry && !isUploading && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[11px] text-[#923e30]">
            Your file is still selected. Retry extraction or choose another file.
          </p>
          <button
            className="rounded-lg border border-[#dbe4dc] bg-white px-3 py-2 text-[11px] font-semibold text-[#36543d] hover:border-[#bdd0bf] hover:bg-[#f6faf6] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/35 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={onRetry}
            disabled={isBusy}
          >
            Retry extraction
          </button>
        </div>
      )}

      {resumeText && (
        <div className="mt-[17px]">
          <label className="mb-[7px] block text-[11px] font-semibold text-[#35473a]" htmlFor="resume-text">
            Extracted text
          </label>
          <textarea
            id="resume-text"
            className="block min-h-[120px] w-full resize-y rounded-[9px] border border-[#dfe6df] bg-[#fcfdfb] px-3 py-[11px] text-xs leading-[1.65] text-[#29362d] transition placeholder:text-[#9aa59c] hover:border-[#c7d5c9] focus:border-[#72967a] focus:outline-none focus:ring-[3px] focus:ring-[#3f6f49]/[0.11]"
            maxLength={MAX_RESUME_TEXT_LENGTH}
            value={resumeText}
            onChange={onResumeTextChange}
          />
          <p className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[#89948b]">
            Review and edit if needed
            <span>
              {resumeText.length.toLocaleString()} /{" "}
              {MAX_RESUME_TEXT_LENGTH.toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
