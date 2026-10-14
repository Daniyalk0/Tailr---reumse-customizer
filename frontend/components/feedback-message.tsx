type FeedbackMessageProps = {
  kind: "error" | "loading";
  message: string;
};

export function FeedbackMessage({ kind, message }: FeedbackMessageProps) {
  const isError = kind === "error";

  return (
    <div
      className={`flex items-center gap-2.5 rounded-[10px] border px-[15px] py-3 text-[13px] leading-[1.5] ${isError ? "border-[#f0d1ca] bg-[#fff7f5] text-[#923e30]" : "border-[#dbe8dc] bg-[#f5faf5] text-[#315d3c]"}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {isError ? (
        <svg className="size-[19px] shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r="7.25"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M10 6.5v4M10 13.5v.01"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <span className="size-[19px] shrink-0 animate-spin rounded-full border-2 border-[#305639]/20 border-t-[#3a7047] motion-reduce:animate-none" aria-hidden="true" />
      )}
      <span>{message}</span>
    </div>
  );
}
