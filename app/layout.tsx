import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pegas — Multi-Agent Request Desk & Agentic Finance Prototype",
  description: "A working multi-agent prototype with self-hosted AI, bounded agent authority, x402 payments and independently verified Solana Devnet settlement.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
