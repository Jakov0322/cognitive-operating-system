import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "cognitive-os",
  description: "Understand any repo in minutes, not days.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">{children}</body>
    </html>
  );
}
