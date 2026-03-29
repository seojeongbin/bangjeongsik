import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "f(방)정식 — 에어비앤비 창업 분석 서비스",
  description: "에어비앤비 창업 분석 서비스",
  openGraph: {
    title: "f(방)정식 — 에어비앤비 창업 분석 서비스",
    description: "에어비앤비 창업 분석 서비스",
  },
  twitter: {
    card: "summary_large_image",
    title: "f(방)정식 — 에어비앤비 창업 분석 서비스",
    description: "에어비앤비 창업 분석 서비스",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F0F5FF]">{children}</body>
    </html>
  )
}
