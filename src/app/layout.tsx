import type { Metadata } from "next"
import { APP_CONFIG } from "@/config/app"
import "./globals.css"

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — ${APP_CONFIG.tagline}`,
  description: "에어비앤비 창업 분석 서비스",
  openGraph: {
    description: "에어비앤비 창업 분석 서비스",
  },
  twitter: {
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
