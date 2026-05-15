import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "@/app/globals.css";

const themeBootScript = `
  (() => {
    const cookieMatch = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    const storedTheme = window.localStorage.getItem("fb-ads-ops-theme");
    const nextTheme = storedTheme || (cookieMatch ? cookieMatch[1] : "dark");
    const theme = nextTheme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
  })();
`;

export const metadata: Metadata = {
  title: "FB Ads Ops",
  description: "Internal operating system for in-house Facebook Ads media buying."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider defaultTheme="dark">
          <div className="app-root">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
