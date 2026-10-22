import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { DownloadButtons } from "./download-buttons";
import {
  getSkillsCategories,
} from "../lib/resume-text";

type ResumePreviewProps = {
  originalResume?: string;
  resume: string;
  suggestedKeywords: string[];
  busy: "upload" | "customize" | "pdf" | "docx" | null;
  onResumeChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onAddKeyword: (keyword: string, section: string) => void;
  onDownload: (format: "pdf" | "docx") => void;
};

type DiffSegment = {
  type: "unchanged" | "added" | "removed";
  text: string;
};

function appendDiffSegment(
  segments: DiffSegment[],
  type: DiffSegment["type"],
  text: string,
) {
  if (!text) {
    return;
  }

  const previous = segments[segments.length - 1];
  if (previous?.type === type) {
    previous.text += text;
  } else {
    segments.push({ type, text });
  }
}

function compareResumeText(
  original: string | undefined,
  customized: string,
): DiffSegment[] {
  const originalTokens = original?.match(/\s+|\S+/g) ?? [];
  const customizedTokens = customized.match(/\s+|\S+/g) ?? [];
  let prefixLength = 0;
  while (
    prefixLength < originalTokens.length &&
    prefixLength < customizedTokens.length &&
    originalTokens[prefixLength] === customizedTokens[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < originalTokens.length - prefixLength &&
    suffixLength < customizedTokens.length - prefixLength &&
    originalTokens[originalTokens.length - suffixLength - 1] ===
      customizedTokens[customizedTokens.length - suffixLength - 1]
  ) {
    suffixLength += 1;
  }

  const oldMiddle = originalTokens.slice(
    prefixLength,
    originalTokens.length - suffixLength,
  );
  const newMiddle = customizedTokens.slice(
    prefixLength,
    customizedTokens.length - suffixLength,
  );
  const maxDistance = Math.min(oldMiddle.length + newMiddle.length, 1024);
  const offset = maxDistance + 1;
  let vector = new Int32Array(2 * maxDistance + 3);
  vector[offset + 1] = 0;
  const trace: Int32Array[] = [];
  let distance = -1;

  for (let edits = 0; edits <= maxDistance; edits += 1) {
    trace.push(vector.slice());
    for (let diagonal = -edits; diagonal <= edits; diagonal += 2) {
      const index = offset + diagonal;
      let oldIndex =
        diagonal === -edits ||
        (diagonal !== edits && vector[index - 1] < vector[index + 1])
          ? vector[index + 1]
          : vector[index - 1] + 1;
      let newIndex = oldIndex - diagonal;

      while (
        oldIndex < oldMiddle.length &&
        newIndex < newMiddle.length &&
        oldMiddle[oldIndex] === newMiddle[newIndex]
      ) {
        oldIndex += 1;
        newIndex += 1;
      }
      vector[index] = oldIndex;

      if (oldIndex >= oldMiddle.length && newIndex >= newMiddle.length) {
        distance = edits;
        break;
      }
    }

    if (distance !== -1) {
      break;
    }
  }

  const segments: DiffSegment[] = [];
  appendDiffSegment(
    segments,
    "unchanged",
    originalTokens.slice(0, prefixLength).join(""),
  );

  if (distance === -1) {
    appendDiffSegment(segments, "removed", oldMiddle.join(""));
    appendDiffSegment(segments, "added", newMiddle.join(""));
  } else {
    const reversedOperations: DiffSegment[] = [];
    let oldIndex = oldMiddle.length;
    let newIndex = newMiddle.length;

    for (let edits = distance; edits > 0; edits -= 1) {
      const previousVector = trace[edits];
      const diagonal = oldIndex - newIndex;
      const previousDiagonal =
        diagonal === -edits ||
        (diagonal !== edits &&
          previousVector[offset + diagonal - 1] <
            previousVector[offset + diagonal + 1])
          ? diagonal + 1
          : diagonal - 1;
      const previousOldIndex = previousVector[offset + previousDiagonal];
      const previousNewIndex = previousOldIndex - previousDiagonal;

      while (
        oldIndex > previousOldIndex &&
        newIndex > previousNewIndex
      ) {
        reversedOperations.push({
          type: "unchanged",
          text: oldMiddle[oldIndex - 1],
        });
        oldIndex -= 1;
        newIndex -= 1;
      }

      if (oldIndex === previousOldIndex) {
        reversedOperations.push({
          type: "added",
          text: newMiddle[newIndex - 1],
        });
        newIndex -= 1;
      } else {
        reversedOperations.push({
          type: "removed",
          text: oldMiddle[oldIndex - 1],
        });
        oldIndex -= 1;
      }
    }

    while (oldIndex > 0 && newIndex > 0) {
      reversedOperations.push({
        type: "unchanged",
        text: oldMiddle[oldIndex - 1],
      });
      oldIndex -= 1;
      newIndex -= 1;
    }
    while (oldIndex > 0) {
      reversedOperations.push({
        type: "removed",
        text: oldMiddle[oldIndex - 1],
      });
      oldIndex -= 1;
    }
    while (newIndex > 0) {
      reversedOperations.push({
        type: "added",
        text: newMiddle[newIndex - 1],
      });
      newIndex -= 1;
    }

    for (const operation of reversedOperations.reverse()) {
      appendDiffSegment(segments, operation.type, operation.text);
    }
  }

  appendDiffSegment(
    segments,
    "unchanged",
    originalTokens.slice(originalTokens.length - suffixLength).join(""),
  );
  return segments;
}

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
  originalResume,
  resume,
  suggestedKeywords,
  busy,
  onResumeChange,
  onAddKeyword,
  onDownload,
}: ResumePreviewProps) {
  const isCustomizing = busy === "customize";
  const skillCategories = getSkillsCategories(resume);
  const [view, setView] = useState<"preview" | "diff">("preview");
  const [selectedCategories, setSelectedCategories] = useState<
    Record<string, string>
  >({});
  const diffSegments = useMemo(
    () =>
      view === "diff" ? compareResumeText(originalResume, resume) : [],
    [originalResume, resume, view],
  );

  return (
    <section
      className="min-w-0 rounded-[13px] border border-[#e2e8e2] bg-white p-[19px] shadow-[0_2px_5px_rgba(34,55,39,0.025),0_16px_42px_rgba(34,55,39,0.045)] sm:rounded-[15px] sm:p-6 lg:sticky lg:top-[18px]"
      aria-labelledby="preview-title"
      aria-busy={isCustomizing}
    >
      <div className="flex items-center justify-between gap-[15px] border-b border-[#edf0ed] pb-5">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#52775c]">
            Step 02
          </p>
          <h2
            id="preview-title"
            className="mt-1.5 text-lg font-semibold tracking-[-0.035em] text-[#26342a]"
          >
            Customized Resume
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#6b786f]">
            Review the result, make it yours, then choose a format.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#e5ebe5] px-[9px] py-[7px] text-[10px] text-[#748078]">
          <span
            className="inline-block size-1.5 rounded-full bg-[#5d956d] shadow-[0_0_0_3px_rgba(93,149,109,0.12)]"
            aria-hidden="true"
          />
          {resume ? "Ready to review" : "Preview"}
        </span>
      </div>

      {!isCustomizing && resume && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div
            className="inline-flex rounded-[8px] border border-[#e5ebe5] bg-[#f7f9f6] p-1"
            aria-label="Resume preview mode"
            role="group"
          >
            <button
              className={`min-h-[32px] rounded-[6px] px-3 text-[11px] font-medium transition focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#34704b]/35 ${
                view === "preview"
                  ? "bg-white text-[#28583e] shadow-sm"
                  : "text-[#6b786f] hover:text-[#34463a]"
              }`}
              type="button"
              aria-pressed={view === "preview"}
              onClick={() => setView("preview")}
            >
              Preview
            </button>
            <button
              className={`min-h-[32px] rounded-[6px] px-3 text-[11px] font-medium transition focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#34704b]/35 ${
                view === "diff"
                  ? "bg-white text-[#28583e] shadow-sm"
                  : "text-[#6b786f] hover:text-[#34463a]"
              }`}
              type="button"
              aria-pressed={view === "diff"}
              onClick={() => setView("diff")}
            >
              Diff View
            </button>
          </div>
          {view === "diff" && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
              <span className="rounded-[4px] bg-[#e8f3e9] px-1.5 py-0.5 text-[#28583e]">
                Added
              </span>
              <span className="rounded-[4px] bg-[#f8e9e7] px-1.5 py-0.5 text-[#9a403b] line-through">
                Removed
              </span>
            </div>
          )}
        </div>
      )}

      <div
        className={`relative mt-[19px] min-h-[390px] rounded-[11px] border border-[#e9ede9] bg-white shadow-[inset_0_1px_3px_rgba(34,55,39,0.025)] ${view === "diff" && resume && !isCustomizing ? "max-h-[70vh] overflow-auto" : "overflow-hidden"} sm:min-h-[475px] ${resume ? "bg-[#fbfcfa]" : ""}`}
      >
        {isCustomizing ? (
          <PreviewSkeleton />
        ) : resume ? (
          view === "diff" ? (
            <pre className="min-h-[388px] whitespace-pre-wrap break-words p-[23px] font-sans text-xs leading-[1.8] text-[#303b32] sm:min-h-[473px]">
              {diffSegments.map((segment, index) => {
                if (segment.type === "unchanged") {
                  return <span key={index}>{segment.text}</span>;
                }
                if (segment.type === "added") {
                  return (
                    <ins
                      className="rounded-[2px] bg-[#e8f3e9] text-[#28583e] no-underline"
                      key={index}
                    >
                      {segment.text}
                    </ins>
                  );
                }
                return (
                  <del
                    className="rounded-[2px] bg-[#f8e9e7] text-[#9a403b] line-through"
                    key={index}
                  >
                    {segment.text}
                  </del>
                );
              })}
            </pre>
          ) : (
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
          )
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
                const selectedCategory = skillCategories.includes(
                  selectedCategories[keyword],
                )
                  ? selectedCategories[keyword]
                  : "";

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
          <span className="text-xs font-semibold text-[#34463a]">
            Ready to take it with you?
          </span>
          <span className="text-[10px] text-[#87928a]">
            Choose your preferred format
          </span>
        </div>
        <DownloadButtons
          busy={busy === "pdf" || busy === "docx" ? busy : null}
          disabled={!resume || busy !== null}
          onDownload={onDownload}
        />
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <span aria-hidden="true">ⓘ</span>
        <p>
          AI may occasionally alter or omit details. Please review your resume
          before downloading.
        </p>
      </div>
    </section>
  );
}
