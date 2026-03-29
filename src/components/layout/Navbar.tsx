import { APP_CONFIG } from "@/config/app"

export default function Navbar() {
  return (
    <header
      className="sticky top-0 z-50 w-full bg-white border-b border-[#E2EAF8]"
      style={{ height: "66px", boxShadow: "0 1px 6px rgba(26,86,219,0.06)" }}
    >
      <div className="mx-auto flex h-full max-w-5xl items-center px-4 sm:px-6">
        {/* 로고 */}
        <div className="flex flex-col leading-none">
          <span
            className="font-black tracking-[-0.05em] bg-gradient-to-br from-[#1a56db] to-[#0ea5e9] bg-clip-text text-transparent"
            style={{ fontSize: "23px" }}
          >
            {APP_CONFIG.name}
          </span>
          <span
            className="font-medium text-[#94A3B8]"
            style={{ fontSize: "9.5px", letterSpacing: "0" }}
          >
            {APP_CONFIG.tagline}
          </span>
        </div>
      </div>
    </header>
  )
}
