"use client";

type ErrorToastProps = {
  message: string;
  onDismiss: () => void;
};

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-xl border border-[#f0d1ca] bg-[#fff7f5] p-4 text-[#923e30] shadow-lg"
    >
      <svg
        className="mt-0.5 size-5 shrink-0"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
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

      <p className="min-w-0 flex-1 text-[13px] leading-[1.5]">{message}</p>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error message"
        className="shrink-0 rounded-md p-1 hover:bg-[#f0d1ca]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#923e30]"
      >
        <svg
          className="size-4"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m5 5 10 10M15 5 5 15"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
