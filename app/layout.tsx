import type { Metadata } from "next";
import { Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif",
});

export const metadata: Metadata = {
  title: "奇门遁甲 · 在线排盘",
  description: "专业的在线奇门遁甲排盘平台，提供精准的九宫格排盘结果",
  keywords: "奇门遁甲,在线排盘,九宫格,占卜",
  openGraph: {
    title: "奇门遁甲 · 在线排盘",
    description: "专业的在线奇门遁甲排盘平台",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={notoSerif.className}>{children}</body>
    </html>
  );
}

