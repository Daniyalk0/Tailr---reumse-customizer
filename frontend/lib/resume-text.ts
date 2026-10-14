const SECTION_HEADINGS = new Set([
  "SUMMARY",
  "PROFESSIONAL SUMMARY",
  "PROFILE",
  "SKILLS",
  "TECHNICAL SKILLS",
  "CORE SKILLS",
  "EXPERIENCE",
  "WORK EXPERIENCE",
  "PROFESSIONAL EXPERIENCE",
  "EMPLOYMENT HISTORY",
  "PROJECTS",
  "PERSONAL PROJECTS",
  "EDUCATION",
  "CERTIFICATIONS",
  "CERTIFICATES",
  "ACHIEVEMENTS",
  "AWARDS",
  "PUBLICATIONS",
  "LANGUAGES",
  "VOLUNTEER EXPERIENCE",
  "INTERESTS",
]);

type SkillCategoryLine = {
  index: number;
  name: string;
  skills: string;
};

export type KeywordInsertionResult =
  | { status: "added"; resume: string }
  | { status: "duplicate"; resume: string }
  | { status: "category-not-found"; resume: string }
  | { status: "invalid-keyword"; resume: string };

function normalizeHeading(line: string): string {
  return line.trim().replace(/:$/, "").trim().toLocaleUpperCase();
}

function getSkillCategoryLines(resume: string): SkillCategoryLine[] {
  const lines = resume.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) =>
    ["SKILLS", "TECHNICAL SKILLS", "CORE SKILLS"].includes(
      normalizeHeading(line),
    ),
  );

  if (sectionIndex === -1) {
    return [];
  }

  const sectionEnd = lines.findIndex(
    (line, index) =>
      index > sectionIndex && SECTION_HEADINGS.has(normalizeHeading(line)),
  );
  const endIndex = sectionEnd === -1 ? lines.length : sectionEnd;
  const categoryLines: SkillCategoryLine[] = [];

  for (let index = sectionIndex + 1; index < endIndex; index += 1) {
    const match = lines[index].match(
      /^\s*(?:[•*‣▪–-]\s*)?([^:]+):\s*(.*)$/,
    );
    if (match?.[1].trim()) {
      categoryLines.push({
        index,
        name: match[1].trim(),
        skills: match[2],
      });
    }
  }

  return categoryLines;
}

export function getSkillsCategories(resume: string): string[] {
  return getSkillCategoryLines(resume).map(({ name }) => name);
}

export function recommendSkillsCategory(
  keyword: string,
  categories: string[],
): string | null {
  const normalizedKeyword = keyword
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const category = (...terms: string[]) =>
    categories.find((name) => {
      const normalizedName = name
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, " ");
      return terms.some((term) => normalizedName.includes(term));
    }) ?? null;

  if (
    /\b(node js|typescript|javascript|python|java|react|next js)\b/.test(
      normalizedKeyword,
    )
  ) {
    return category("language", "framework") ?? category("backend");
  }
  if (
    /\b(mongodb|mongo|postgresql|postgres|mysql|sqlite|prisma|supabase|firebase|redis|database|sql|authentication|auth|nextauth)\b/.test(
      normalizedKeyword,
    )
  ) {
    return category("backend", "database");
  }
  if (/\b(vitest|jest|testing|test|integration|qa)\b/.test(normalizedKeyword)) {
    return category("testing", "integration");
  }
  if (/\b(redux|zustand|tanstack|context api|state management)\b/.test(normalizedKeyword)) {
    return category("state", "tool");
  }
  if (/\b(git|github|vercel|tailwind|docker|kubernetes)\b/.test(normalizedKeyword)) {
    return category("tool", "state");
  }

  return null;
}

export function insertKeywordInSkillsCategory(
  resume: string,
  keyword: string,
  category: string,
): KeywordInsertionResult {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    return { status: "invalid-keyword", resume };
  }

  const categories = getSkillCategoryLines(resume);
  const target = categories.find(
    ({ name }) =>
      name.toLocaleLowerCase() === category.trim().toLocaleLowerCase(),
  );
  if (!target) {
    return { status: "category-not-found", resume };
  }

  const alreadyExists = categories.some(({ skills }) =>
    skills
      .split(",")
      .some(
        (skill) =>
          skill.trim().toLocaleLowerCase() ===
          normalizedKeyword.toLocaleLowerCase(),
      ),
  );
  if (alreadyExists) {
    return { status: "duplicate", resume };
  }

  const linesWithBreaks = resume.split(/(\r?\n)/);
  const lineIndex = target.index * 2;
  const currentLine = linesWithBreaks[lineIndex];
  const trailingWhitespace = currentLine.match(/\s*$/)?.[0] ?? "";
  const currentSkills = currentLine.slice(
    0,
    currentLine.length - trailingWhitespace.length,
  );
  linesWithBreaks[lineIndex] =
    `${currentSkills}${target.skills.trim() ? ", " : ""}${normalizedKeyword}${trailingWhitespace}`;

  return {
    status: "added",
    resume: linesWithBreaks.join(""),
  };
}
