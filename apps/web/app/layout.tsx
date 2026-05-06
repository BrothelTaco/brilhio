import type { Metadata } from "next";
import "@brilhio/design-system/web.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brilhio Product",
  description: "AI social media manager web workspace",
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
