'use client';
import { ArrowIcon, LeafMark } from "@/app/page";
import Link from "next/link";

const Navbar = () => {


  return (
    <header className="border-b border-[#20372B]/10">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-[76px] max-w-[1260px] items-center justify-between px-5 sm:px-8 lg:px-0"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <LeafMark />
          <span className="text-xl font-semibold tracking-[-0.8px]">
            tailr<span className="text-[#719274]">.</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-[#607166] sm:flex">
          <Link
            href="/"
            className="transition-colors hover:text-[#254D38]"
          >
            Home
          </Link>
          <Link
            href="/#features"
            className="transition-colors hover:text-[#254D38]"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="transition-colors hover:text-[#254D38]"
          >
            How it works
          </Link>
          <Link
            href="/analyze"
            className="transition-colors hover:text-[#254D38]"
          >
            ATS analyzer
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/analyze"
            className="inline-flex items-center rounded-full px-2 py-2.5 text-[11px] font-medium text-[#41654A] transition hover:bg-[#EDF1E9] sm:hidden"
          >
            ATS analyzer
          </Link>
          <Link
            href="/customize"
            className="inline-flex items-center gap-2 rounded-full bg-[#254D38] px-3.5 py-2.5 text-xs font-medium text-white transition hover:bg-[#193C29] sm:px-5 sm:text-sm"
          >
            Get started
            <ArrowIcon />
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar