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
          <a
            href="#features"
            className="transition-colors hover:text-[#254D38]"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-[#254D38]"
          >
            How it works
          </a>
        </div>

        <Link
          href="/customize"
          className="inline-flex items-center gap-2 rounded-full bg-[#254D38] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#193C29]"
        >
          Get started
          <ArrowIcon />
        </Link>
      </nav>
    </header>
  );
}

export default Navbar