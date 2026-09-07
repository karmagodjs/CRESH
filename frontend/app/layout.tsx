import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRI Research",
  description: "Evidence-first research workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-cri-bg text-cri-textPrimary antialiased">
      <body className="h-full overflow-hidden bg-cri-bg text-cri-textPrimary flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
