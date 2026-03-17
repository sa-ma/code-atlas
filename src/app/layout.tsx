import type { Metadata } from "next";
import { IBM_Plex_Sans, Patrick_Hand } from "next/font/google";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const handFont = Patrick_Hand({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Code Atlas",
  description: "Analyze public GitHub repositories and generate architecture diagrams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${handFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
