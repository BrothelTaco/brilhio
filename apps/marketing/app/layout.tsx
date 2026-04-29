import type { Metadata } from "next";
import "@brilhio/design-system/web.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brilhio",
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

