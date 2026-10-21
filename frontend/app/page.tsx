import Navbar from "@/components/Navbar";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Tailored to the role",
    description:
      "Adapt your resume to a specific job description while keeping your real experience and skills intact.",
  },
  {
    number: "02",
    title: "Find missing keywords",
    description:
      "Discover relevant skills and keywords from the job description that you may want to address.",
  },
  {
    number: "03",
    title: "Ready to download",
    description:
      "Download your customized resume as a PDF or DOCX and prepare it for your next application.",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload your resume",
    description: "Start with the experience and skills you already have.",
  },
  {
    number: "02",
    title: "Add the job description",
    description: "Give Tailr the role you're applying for.",
  },
  {
    number: "03",
    title: "Review your tailored resume",
    description: "Review the result, explore suggested keywords, and download.",
  },
];

export function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
      {diagonal ? (
        <path
          d="M5 15 15 5M6 5h9v9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4 10h12m-5-5 5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function LeafMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="size-8">
      <rect width="32" height="32" rx="10" fill="#254D38" />
      <path
        d="M23.5 8.5C14 8.5 8 12.2 8 19a5 5 0 0 0 5 5c6.8 0 10.5-6 10.5-15.5Z"
        fill="#C9E7B8"
      />
      <path
        d="M10.5 22 20 12.5"
        stroke="#254D38"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="size-4 shrink-0"
    >
      <path
        d="m5 10 3.2 3.2L15 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FAFAF6] text-[#20372B]">
      {/* Navigation */}

      {/* Hero */}
      <section className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-36 size-[440px] rounded-full bg-[#DDEBD6]/50 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-[1260px] items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-0 lg:pb-28 lg:pt-20">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#D6E3D0] bg-[#F0F5EB] px-3.5 py-2 text-xs font-medium text-[#41654A]">
              <span className="size-1.5 rounded-full bg-[#638D63]" />
              Your next opportunity starts here
            </div>

            <h1 className="text-[clamp(3.2rem,7vw,5.7rem)] font-medium leading-[0.99] tracking-[-0.075em] text-[#20372B]">
              Your experience.
              <br />
              <span className="font-serif italic font-normal text-[#648567]">
                Better aligned.
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-7 text-[#69776D] sm:text-lg sm:leading-8">
              A resume should speak the language of the role you want. Tailr
              helps you tailor your existing experience to each opportunity,
              without losing what makes it yours.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/customize"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#254D38] px-7 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#193C29]"
              >
                Tailor my resume
                <ArrowIcon />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium text-[#47614E] transition hover:bg-[#EDF1E9]"
              >
                See how it works
                <ArrowIcon diagonal />
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-[#738075]">
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon />
                Keep your experience authentic
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon />
                PDF & DOCX exports
              </span>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto w-full max-w-[510px] lg:ml-auto">
            <div className="absolute -inset-5 rounded-[36px] bg-[#E8EEE1]/60 blur-xl" />

            <div className="relative rotate-[1deg] rounded-[25px] border border-[#E1E5DC] bg-white p-5 shadow-[0_25px_80px_-35px_rgba(36,67,43,0.28)] sm:p-7">
              <div className="flex items-center justify-between border-b border-[#EDF0E9] pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#EAF1E4] text-[#41684A]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-5"
                    >
                      <path
                        d="M7 3.75h7l4 4V20.25H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 4v4h4M8.5 12h6M8.5 15.5h6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#293F30]">
                      Your tailored resume
                    </p>
                    <p className="mt-0.5 text-xs text-[#879188]">
                      A closer match for your next role
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#EDF5E9] px-3 py-1.5 text-[11px] font-medium text-[#49714E]">
                  Preview
                </span>
              </div>

              <div className="py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="h-3 w-32 rounded-full bg-[#2E4B38]" />
                    <div className="mt-2.5 h-2 w-24 rounded-full bg-[#B6C5B4]" />
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#EFF3EA] text-[#68816A]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-5"
                    >
                      <circle
                        cx="12"
                        cy="8"
                        r="3.25"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M5.5 20a6.5 6.5 0 0 1 13 0"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="mt-7">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#79907A]">
                    Professional summary
                  </p>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-[#E8ECE5]" />
                    <div className="h-2 w-[94%] rounded-full bg-[#E8ECE5]" />
                    <div className="h-2 w-[77%] rounded-full bg-[#E8ECE5]" />
                  </div>
                </div>

                <div className="mt-7">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#79907A]">
                    Relevant skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["React", "TypeScript", "APIs", "Problem solving"].map(
                      (skill) => (
                        <span
                          key={skill}
                          className="rounded-lg border border-[#DCE8D7] bg-[#F3F7F0] px-3 py-2 text-xs text-[#47664A]"
                        >
                          {skill}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="mt-7 rounded-xl border border-[#DCE8D7] bg-[#F5F8F1] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#3D6544]">
                    <CheckIcon />
                    Suggested keywords
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#728174]">
                    Discover relevant terms from the job description to consider
                    incorporating where they accurately reflect your experience.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#EDF0E9] pt-4">
                <span className="text-xs text-[#7D897D]">
                  Your experience, thoughtfully tailored.
                </span>
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#45664A]">
                  <span className="size-1.5 rounded-full bg-[#719A70]" />
                  Ready to review
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 rounded-2xl border border-[#E0E7DB] bg-white px-4 py-3 shadow-lg sm:-left-8">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#EAF1E4] text-[#42694A]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-5"
                  >
                    <path
                      d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 4v4h4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8.5 14h6M8.5 17h4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#314735]">
                    Ready for export
                  </p>
                  <p className="mt-1 text-[11px] text-[#839084]">PDF or DOCX</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-y border-[#E6E9E0] bg-[#F3F5EF]">
        <div className="mx-auto grid max-w-[1260px] grid-cols-1 gap-7 px-5 py-8 sm:grid-cols-3 sm:gap-5 sm:px-8 lg:px-0">
          {[
            "Built around your real experience",
            "Matched to the role you're targeting",
            "Exportable, editable resume files",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center justify-center gap-2.5 text-center text-sm text-[#536957]"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E1EBDD] text-[#416B48]">
                <CheckIcon />
              </span>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-[1260px] scroll-mt-10 px-5 py-20 sm:px-8 sm:py-24 lg:px-0 lg:py-28"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#648567]">
            Less guesswork. More focus.
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-0.055em] sm:text-5xl">
            Every application deserves
            <br className="hidden sm:block" /> a little more intention.
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-[#718074]">
            Tailr helps you focus your existing experience on the opportunity in
            front of you, so you can spend less time rewriting and more time
            applying.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.number}
              className="group rounded-2xl border border-[#E5E9E0] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#C7D8C1] hover:shadow-[0_15px_45px_-30px_rgba(36,67,43,0.3)] sm:p-7"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#EDF3E8] text-sm font-medium text-[#557A57]">
                {feature.number}
              </span>
              <h3 className="mt-8 text-lg font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#758176]">
                {feature.description}
              </p>
              <div className="mt-6 h-px w-full bg-[#EDF0E9] transition-colors group-hover:bg-[#D2E1CB]" />
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#58765A]">
                Made for your next step
                <ArrowIcon />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-10 bg-[#EDF2E8] py-20 sm:py-24 lg:py-28"
      >
        <div className="mx-auto max-w-[1260px] px-5 sm:px-8 lg:px-0">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#648567]">
                A simpler workflow
              </p>
              <h2 className="mt-4 max-w-md text-3xl font-medium leading-tight tracking-[-0.055em] sm:text-5xl lg:max-w-none">
                Three steps.
                <br />
                One stronger application.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-[#718074]">
                No need to start from scratch every time. Bring your resume,
                choose your target role, and let Tailr help you refine the
                match.
              </p>

              <Link
                href="/customize"
                className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-[#254D38] px-6 text-sm font-medium text-white transition hover:bg-[#193C29]"
              >
                Get started with Tailr
                <ArrowIcon />
              </Link>
            </div>

            <div className="divide-y divide-[#D9E3D4]">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="grid grid-cols-[44px_1fr] gap-4 py-6 first:pt-0 last:pb-0 sm:grid-cols-[56px_1fr] sm:gap-5 sm:py-8"
                >
                  <span className="pt-1 text-sm font-medium text-[#719273]">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[#718074]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="relative mx-auto max-w-[1260px] overflow-hidden rounded-[28px] bg-[#254D38] px-6 py-14 text-center text-white sm:px-12 lg:px-0 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-36 size-80 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-52 -left-20 size-96 rounded-full border border-white/10"
          />

          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10">
              <LeafMark />
            </div>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.055em] sm:text-5xl">
              Your next role won't
              <br className="hidden sm:block" /> find itself.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#D1E0D1] sm:text-base">
              Start with the experience you have. Tailor it to the opportunity
              you want.
            </p>
            <Link
              href="/customize"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#F6F7EF] px-7 text-sm font-semibold text-[#254D38] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Customize your resume
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E9E0]">
        <div className="mx-auto flex max-w-[1260px] flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-0">
          <Link href="/" className="flex items-center gap-2">
            <LeafMark />
            <span className="font-semibold tracking-tight">
              tailr<span className="text-[#719274]">.</span>
            </span>
          </Link>
          <div className="flex flex-col gap-1 sm:items-end">
            <p className="text-xs text-[#829084]">
              Make every application more intentional.
            </p>
            <p className="text-xs text-[#829084]">
              Crafted by{" "}
              <a
                href="https://daniyal-devv.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#254D38] transition hover:underline"
              >
                Daniyal{" "}
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
