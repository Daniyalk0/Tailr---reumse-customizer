type DownloadButtonsProps = {
  busy: "pdf" | "docx" | null;
  disabled: boolean;
  onDownload: (format: "pdf" | "docx") => void;
};

export function DownloadButtons({
  busy,
  disabled,
  onDownload,
}: DownloadButtonsProps) {
  return (
    <div className="grid grid-cols-1 gap-[9px] min-[390px]:grid-cols-2" aria-label="Download your resume">
      <button
        className="flex min-h-[42px] items-center justify-center gap-2 rounded-[9px] border border-[#28583e] bg-[#28583e] px-2 py-2.5 text-[10px] font-semibold text-white shadow-[0_2px_4px_rgba(34,78,48,0.12)] transition hover:border-[#204a33] hover:bg-[#204a33] hover:shadow-[0_4px_10px_rgba(34,78,48,0.16)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/35 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-[11px]"
        type="button"
        disabled={disabled}
        onClick={() => onDownload("pdf")}
      >
        {busy === "pdf" ? (
          <span className="size-[15px] animate-spin rounded-full border-2 border-white/45 border-t-current motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <svg className="size-[15px] shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 3.5v9m0 0 3.5-3.5M10 12.5 6.5 9M4 14v2.25c0 .41.34.75.75.75h10.5a.75.75 0 0 0 .75-.75V14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {busy === "pdf" ? "Preparing PDF…" : "Download PDF"}
      </button>
      <button
        className="flex min-h-[42px] items-center justify-center gap-2 rounded-[9px] border border-[#dbe4dc] bg-white px-2 py-2.5 text-[10px] font-semibold text-[#36543d] transition hover:border-[#bdd0bf] hover:bg-[#f6faf6] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/35 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:text-[11px]"
        type="button"
        disabled={disabled}
        onClick={() => onDownload("docx")}
      >
        {busy === "docx" ? (
          <span className="size-[15px] animate-spin rounded-full border-2 border-[#305639]/20 border-t-[#3a7047] motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <svg className="size-[15px] shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 3.5v9m0 0 3.5-3.5M10 12.5 6.5 9M4 14v2.25c0 .41.34.75.75.75h10.5a.75.75 0 0 0 .75-.75V14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {busy === "docx" ? "Preparing DOCX…" : "Download DOCX"}
      </button>
    </div>
  );
}
