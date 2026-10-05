import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Pegas — Multi-Agent Request Desk", description: "Watch a self-hosted open model route real requests between specialized AI agents." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
