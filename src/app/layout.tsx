import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEE IT FIX IT — Dashboard",
  description: "Live Qualtrics responses, filtered to rows with a location.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
