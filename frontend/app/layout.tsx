import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tailr — Resume Customizer",
  description: "Tailr your resume to a role while keeping your experience true.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} min-h-full scroll-smooth antialiased motion-reduce:scroll-auto`}
    >
      <body className="m-0 min-h-full bg-[#f6f7f4] font-sans text-[#1f2b24]">
        {children}
      </body>
    </html>
  );
}
