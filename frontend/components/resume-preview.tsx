import { useState } from "react";
import type { ChangeEvent } from "react";
import { DownloadButtons } from "./download-buttons";
import {
  getSkillsCategories,
  recommendSkillsCategory,
} from "../lib/resume-text";

type ResumePreviewProps = {
  resume: string;
  suggestedKeywords: string[];
  busy: "upload" | "customize" | "pdf" | "docx" | null;
  onResumeChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onAddKeyword: (keyword: string, section: string) => void;
  onDownload: (format: "pdf" | "docx") => void;
};

function EmptyPreview() {
  return (
    <div className="flex min-h-[388px] flex-col items-center justify-center px-7 py-9 text-center sm:min-h-[473px]">
      <span className="mb-2.5 block size-[104px]" aria-hidden="true">
        <svg className="size-full" viewBox="0 0 104 104" fill="none">
          <rect
            x="19"
            y="13"
            width="56"
            height="72"
            rx="7"
            fill="#fff"
            stroke="#dce5dd"
            strokeWidth="1.5"
          />
          <path
            d="M31 31h31M31 41h31M31 51h19M31 65h25M31 72h31"
            stroke="#9aab9e"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="73" cy="72" r="17" fill="#e5eee7" />
          <path
            d="m73 63 1.9 6.1L81 71l-6.1 1.9L73 79l-1.9-6.1L65 71l6.1-1.9L73 63Z"
            fill="#3b684e"
          />
        </svg>
      </span>
      <h3 className="mt-2 max-w-[250px] text-[15px] font-semibold tracking-[-0.025em] text-[#35463a]">Your tailored draft will appear here</h3>
      <p className="mt-[9px] max-w-[290px] text-[11px] leading-[1.75] text-[#78857b]">
        Upload your resume and add the job description. You’ll be able to review
        and edit the result before downloading.
      </p>
      <div className="mt-[18px] flex flex-wrap justify-center gap-x-[15px] gap-y-2 text-[10px] text-[#637568]">
        <span className="inline-flex items-center gap-[5px]">
          <span className="text-xs font-bold text-[#548060]" aria-hidden="true">✓</span> Your experience stays yours
        </span>
        <span className="inline-flex items-center gap-[5px]">
          <span className="text-xs font-bold text-[#548060]" aria-hidden="true">✓</span> Review before exporting
        </span>
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex min-h-[388px] flex-col gap-[11px] p-[30px_25px] sm:min-h-[473px]" role="status" aria-label="Creating your resume preview">
      <span className="h-[15px] w-[43%] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
      <span className="h-[9px] w-[51%] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
      <span className="h-2" />
      <span className="mt-px h-[11px] w-[36%] animate-pulse rounded-full bg-[#e7eee7] motion-reduce:animate-none" />
      <span className="h-[9px] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
      <span className="h-[9px] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
      <span className="h-[9px] w-[77%] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
      <span className="h-2" />
      <span className="mt-px h-[11px] w-[36%] animate-pulse rounded-full bg-[#e7eee7] motion-reduce:animate-none" />
      <span className="h-[9px] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
      <span className="h-[9px] w-[77%] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
      <span className="h-[9px] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
      <span className="h-[9px] w-[51%] animate-pulse rounded-full bg-[#edf1ed] motion-reduce:animate-none" />
    </div>
  );
}

export function ResumePreview({
  resume,
  suggestedKeywords,
  busy,
  onResumeChange,
  onAddKeyword,
  onDownload,
}: ResumePreviewProps) {
  const isCustomizing = busy === "customize";
  const skillCategories = getSkillsCategories(resume);
  const [selectedCategories, setSelectedCategories] = useState<
    Record<string, string>
  >({});

  return (
    <section
      className="min-w-0 rounded-[13px] border border-[#e2e8e2] bg-white p-[19px] shadow-[0_2px_5px_rgba(34,55,39,0.025),0_16px_42px_rgba(34,55,39,0.045)] sm:rounded-[15px] sm:p-6 lg:sticky lg:top-[18px]"
      aria-labelledby="preview-title"
      aria-busy={isCustomizing}
    >
      <div className="flex items-center justify-between gap-[15px] border-b border-[#edf0ed] pb-5">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#52775c]">Step 02</p>
          <h2 id="preview-title" className="mt-1.5 text-lg font-semibold tracking-[-0.035em] text-[#26342a]">Customized Resume</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#6b786f]">
            Review the result, make it yours, then choose a format.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#e5ebe5] px-[9px] py-[7px] text-[10px] text-[#748078]">
          <span className="inline-block size-1.5 rounded-full bg-[#5d956d] shadow-[0_0_0_3px_rgba(93,149,109,0.12)]" aria-hidden="true" />
          {resume ? "Ready to review" : "Preview"}
        </span>
      </div>

      <div className={`relative mt-[19px] min-h-[390px] overflow-hidden rounded-[11px] border border-[#e9ede9] bg-white shadow-[inset_0_1px_3px_rgba(34,55,39,0.025)] sm:min-h-[475px] ${resume ? "bg-[#fbfcfa]" : ""}`}>
        {isCustomizing ? (
          <PreviewSkeleton />
        ) : resume ? (
          <>
            <label className="sr-only" htmlFor="customized-resume">
              Customized resume preview. Edit text before downloading.
            </label>
            <textarea
              id="customized-resume"
              className="block min-h-[388px] w-full resize-y border-0 bg-transparent p-[23px] font-sans text-xs leading-[1.8] text-[#303b32] focus:outline-[3px] focus:outline-offset-[-3px] focus:outline-[#34704b]/30 sm:min-h-[473px]"
              maxLength={50_000}
              value={resume}
              onChange={onResumeChange}
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 rounded-[5px] bg-[#fbfcfa]/95 px-1.5 py-1 text-[9px] text-[#89948b]">
              {resume.length.toLocaleString()} characters
            </span>
          </>
        ) : (
          <EmptyPreview />
        )}
      </div>

      {!isCustomizing && resume && (
        <section
          className="mt-5 border-t border-[#edf0ed] pt-5"
          aria-labelledby="suggested-keywords-title"
        >
          <h3
            id="suggested-keywords-title"
            className="text-sm font-semibold text-[#34463a]"
          >
            Suggested Missing Keywords
          </h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#6b786f]">
            Add a suggestion only if you genuinely have the skill or experience.
            Suggestions stay separate unless you choose to add one.
          </p>
          {suggestedKeywords.length > 0 ? (
            <>
              {skillCategories.length === 0 && (
                <p className="mt-3 rounded-[9px] bg-[#f6f8f5] px-3 py-2.5 text-[11px] leading-relaxed text-[#78857b]">
                  No categorized Skills entries were found. Add a category in
                  the resume preview before adding a suggestion.
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {suggestedKeywords.map((keyword, index) => {
                  const recommendedCategory = recommendSkillsCategory(
                    keyword,
                    skillCategories,
                  );
                  const selectedCategory = skillCategories.includes(
                    selectedCategories[keyword],
                  )
                    ? selectedCategories[keyword]
                    : recommendedCategory ?? "";

                  return (
                    <li
                      className="flex flex-col gap-2 rounded-[9px] border border-[#e5ebe5] bg-[#fbfcfa] p-3 sm:flex-row sm:items-center"
                      key={keyword}
                    >
                      <span className="min-w-0 flex-1 break-words text-xs font-medium text-[#34463a]">
                        {keyword}
                      </span>
                      <label
                        className="sr-only"
                        htmlFor={`keyword-category-${index}`}
                      >
                        Skills category for {keyword}
                      </label>
                      <select
                        id={`keyword-category-${index}`}
                        className="min-h-[36px] rounded-[7px] border border-[#dfe6df] bg-white px-2 text-[11px] text-[#34463a] focus:border-[#72967a] focus:outline-none focus:ring-2 focus:ring-[#3f6f49]/[0.11]"
                        value={selectedCategory}
                        onChange={(event) =>
                          setSelectedCategories((current) => ({
                            ...current,
                            [keyword]: event.target.value,
                          }))
                        }
                        disabled={busy !== null || skillCategories.length === 0}
                      >
                        <option value="">Choose a Skills category</option>
                        {skillCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <button
                        className="min-h-[36px] shrink-0 rounded-[7px] border border-[#28583e] bg-[#28583e] px-3 text-[11px] font-semibold text-white transition hover:bg-[#204a33] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#34704b]/35 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        disabled={
                          busy !== null ||
                          skillCategories.length === 0 ||
                          !selectedCategory
                        }
                        onClick={() => onAddKeyword(keyword, selectedCategory)}
                      >
                        Add to Skills
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="mt-3 rounded-[9px] bg-[#f6f8f5] px-3 py-2.5 text-[11px] leading-relaxed text-[#78857b]">
              No suggestions to review. No keywords have been added.
            </p>
          )}
        </section>
      )}

      <div className="pt-[17px]">
        <div className="mb-[11px] flex flex-col items-start gap-1 min-[390px]:flex-row min-[390px]:items-baseline min-[390px]:justify-between">
          <span className="text-xs font-semibold text-[#34463a]">Ready to take it with you?</span>
          <span className="text-[10px] text-[#87928a]">Choose your preferred format</span>
        </div>
        <DownloadButtons
          busy={busy === "pdf" || busy === "docx" ? busy : null}
          disabled={!resume || busy !== null}
          onDownload={onDownload}
        />
      </div>
    </section>
  );
}
