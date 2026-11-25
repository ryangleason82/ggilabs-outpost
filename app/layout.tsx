import type { Metadata } from "next";
import { Geist_Mono, Inter, Lora } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Outpost",
  description: "Private GGILabs content review, prompt library, and WordPress publishing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="outpost-shell">
          <Sidebar />
          <main className="outpost-main min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
