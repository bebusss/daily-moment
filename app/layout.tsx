import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PhoneFrame from "@/components/PhoneFrame";

// Geist is just a neutral default. Swap the fonts if your design calls for it.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Moment — take-home",
  description: "Build the main daily moment of an app that helps someone stick with one daily goal.",
};

// Mobile-first: this take-home is judged on a phone viewport.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <PhoneFrame>{children}</PhoneFrame>
      </body>
    </html>
  );
}
