import type { Metadata } from "next";
import "@brilhio/design-system/web.css";
import "./globals.css";
import { ThemeProvider } from "./ui/theme-provider";

export const metadata: Metadata = {
  title: "Brilhio Product",
  description: "AI social media manager web workspace",
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('brilhio-theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
