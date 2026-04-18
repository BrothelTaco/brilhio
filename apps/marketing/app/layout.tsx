import type { Metadata } from "next";
import "@ritmio/design-system/web.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ritmio",
  description: "AI social media manager for teams that need scheduling, approvals, AI suggestions, and multi-platform delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

