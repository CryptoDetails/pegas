import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pegas | Self-host an open LLM on your cloud GPU",
  description:
    "A portfolio proof showing how one person can deploy an open-source LLM on rented cloud GPU infrastructure, connect it to a web app, measure it, and reproduce the setup without a hosted LLM API.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
