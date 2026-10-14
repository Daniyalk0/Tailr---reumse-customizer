import type { ChangeEvent, FormEvent } from "react";

const MAX_JOB_DESCRIPTION_LENGTH = 20_000;

type JobDescriptionInputProps = {
  value: string;
  isCustomizing: boolean;
  isBusy: boolean;
  canSubmit: boolean;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function JobDescriptionInput({
  value,
  isCustomizing,
  isBusy,
  canSubmit,
  onChange,
  onSubmit,
}: JobDescriptionInputProps) {
  return (
    <section aria-labelledby="job-description-title">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#eff5ef] text-[11px] font-bold text-[#3c6948]" aria-hidden="true">
          2
        </span>
        <div>
          <h3 id="job-description-title" className="m-0 text-[13px] font-semibold text-[#2a392e]">
            The role you want
          </h3>
          <p className="mt-[3px] text-[11px] text-[#7b887e]">Paste the job description</p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="job-description">
          Job description
        </label>
        <textarea
          id="job-description"
          className="block min-h-[155px] w-full resize-y rounded-[9px] border border-[#dfe6df] bg-white p-3 text-xs leading-[1.65] text-[#29362d] transition placeholder:text-[#9aa59c] hover:border-[#c7d5c9] focus:border-[#72967a] focus:outline-none focus:ring-[3px] focus:ring-[#3f6f49]/[0.11]"
          maxLength={MAX_JOB_DESCRIPTION_LENGTH}
          placeholder="Paste the responsibilities and qualifications from the job listing…"
          value={value}
          onChange={onChange}
          required
        />
        <p className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[#89948b]">
          Be as detailed as you like
          <span>
            {value.length.toLocaleString()} /{" "}
            {MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()}
          </span>
        </p>
        <button
          className="mt-3.5 flex min-h-[46px] w-full items-center justify-center gap-[9px] rounded-[9px] border border-[#28583e] bg-[#28583e] px-3.5 py-2.5 text-xs font-semibold text-white shadow-[0_2px_4px_rgba(34,78,48,0.12)] transition hover:border-[#204a33] hover:bg-[#204a33] hover:shadow-[0_4px_10px_rgba(34,78,48,0.16)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/35 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          type="submit"
          disabled={!canSubmit || isBusy}
        >
          {isCustomizing ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/45 border-t-current motion-reduce:animate-none" aria-hidden="true" />
              Tailoring your resume…
            </>
          ) : (
            <>
              Customize my resume
              <svg className="size-[17px]" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10h12m-5-5 5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
        <p className="mt-2.5 text-center text-[10px] leading-normal text-[#89948b]">
          Your resume and the job description are sent for customization.
        </p>
      </form>
    </section>
  );
}
