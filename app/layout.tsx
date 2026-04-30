import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DreamPlay Email 3",
  description: "API-first DreamPlay email service with a thin review editor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
