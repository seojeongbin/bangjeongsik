export default function BookIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke="#1D4ED8">
        <line x1="50" y1="88" x2="50" y2="20" strokeWidth="4" />
        <path d="M 50 88 Q 28 80 12 78 L 12 14 Q 28 16 50 20" strokeWidth="4" />
        <path d="M 50 88 Q 72 80 88 78 L 88 14 Q 72 16 50 20" strokeWidth="4" />
        <path d="M 50 80 Q 32 73 18 71 L 18 18" strokeWidth="3" opacity="0.8" />
        <path d="M 50 72 Q 36 66 24 64 L 24 22" strokeWidth="2" opacity="0.5" />
        <path d="M 50 80 Q 68 73 82 71 L 82 18" strokeWidth="3" opacity="0.8" />
        <path d="M 50 72 Q 64 66 76 64 L 76 22" strokeWidth="2" opacity="0.5" />
      </g>
      <text x="50" y="59" textAnchor="middle" fontFamily="Pretendard,-apple-system,sans-serif">
        <tspan fontSize="9" fontWeight="700" fill="#1D4ED8">f(</tspan>
        <tspan fontSize="18" fontWeight="900" fill="#1D4ED8">방</tspan>
        <tspan fontSize="9" fontWeight="700" fill="#1D4ED8">)</tspan>
        <tspan fontSize="18" fontWeight="900" fill="#0F172A">정식</tspan>
      </text>
    </svg>
  )
}
