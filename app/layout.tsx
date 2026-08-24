import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://scopegrade.com"),
  title: "ScopeGrade AI — Qualify the project. Protect your price.",
  description:
    "Turn client requests into protected scopes, accurate package recommendations and professional proposals.",
  openGraph: {
    title: "ScopeGrade AI",
    description: "Qualify the project. Protect your price.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ScopeGrade AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScopeGrade AI",
    description: "Qualify the project. Protect your price.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
