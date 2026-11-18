import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

// Fraunces for the few display lines, DM Sans for everything else.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

// Leadlight: a window of small pieces of glass held in lead. Here each alcohol-free evening sets a
// piece of it.
const name = "Leadlight";
const description = "Alcohol-free evenings, one night at a time. Each alcohol-free night sets a piece of a stained-glass window.";

export const metadata: Metadata = {
  title: name,
  description,
  applicationName: name,
  appleWebApp: { title: name },
  openGraph: { title: name, description, type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#120d0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
