import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRI — Cohere Research Intelligence",
  description: "Evidence-first research workspace powered by Cohere and LangGraph",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-cri-ink text-cri-paper antialiased">
      <body className="h-full overflow-hidden bg-cri-ink text-cri-paper flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
