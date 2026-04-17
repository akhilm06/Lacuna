import type { Metadata } from "next";
import { Geist_Mono, Lora } from "next/font/google";
import "./globals.css";

import { Providers } from "@/app/providers";
import { lacunaFaviconHref } from "@/lib/favicon";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lacuna",
  description: "Lost work profiles and an interactive knowledge graph for classical literature.",
  icons: {
    icon: [
      {
        url: lacunaFaviconHref(),
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${geistMono.variable} min-h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-full flex flex-col bg-lacuna-page font-sans text-lacuna-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
