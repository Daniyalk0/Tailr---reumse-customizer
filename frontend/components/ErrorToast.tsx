"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 3_500;
const TRANSITION_DURATION_MS = 200;

type ErrorToastProps = {
  message: string;
  onDismiss: () => void;
};

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const onDismissRef = useRef(onDismiss);
  const dismissTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const dismissToast = useCallback(() => {
    setIsVisible(false);
    if (dismissTimeoutRef.current !== null) {
      return;
    }
    dismissTimeoutRef.current = window.setTimeout(() => {
      dismissTimeoutRef.current = null;
      onDismissRef.current();
    }, TRANSITION_DURATION_MS);
  }, []);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    const toastTimeout = window.setTimeout(dismissToast, TOAST_DURATION_MS);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(toastTimeout);
      if (dismissTimeoutRef.current !== null) {
        window.clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, [dismissToast, message]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-xl border border-[#f0d1ca] bg-[#fff7f5] p-4 text-[#923e30] shadow-lg transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
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
        onClick={dismissToast}
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
