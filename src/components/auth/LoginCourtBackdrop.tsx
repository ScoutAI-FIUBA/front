export function LoginCourtBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full text-current opacity-[0.06] md:hidden"
        viewBox="0 0 420 240"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        focusable="false"
      >
        <path d="M178 220 A176 176 0 0 1 420 42" stroke="currentColor" strokeWidth="3" />
        <path d="M420 78 H330 V202 H420" stroke="currentColor" strokeWidth="3" />
        <path d="M330 92 A62 62 0 0 0 330 188" stroke="currentColor" strokeWidth="3" />
        <path d="M382 116 V164" stroke="currentColor" strokeWidth="3" />
        <path d="M382 140 H374" stroke="currentColor" strokeWidth="3" />
        <circle cx="366" cy="140" r="8" stroke="currentColor" strokeWidth="3" />
      </svg>

      <svg
        className="absolute inset-0 hidden h-full w-full text-current opacity-[0.07] md:block"
        viewBox="0 0 420 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        focusable="false"
      >
        <rect x="28" y="24" width="364" height="552" rx="5" stroke="currentColor" strokeWidth="3" />
        <path d="M28 300 H392" stroke="currentColor" strokeWidth="3" />
        <circle cx="210" cy="300" r="48" stroke="currentColor" strokeWidth="3" />

        <path d="M150 24 V142 H270 V24" stroke="currentColor" strokeWidth="3" />
        <circle cx="210" cy="142" r="48" stroke="currentColor" strokeWidth="3" />
        <path d="M186 52 H234" stroke="currentColor" strokeWidth="3" />
        <path d="M210 52 V60" stroke="currentColor" strokeWidth="3" />
        <circle cx="210" cy="68" r="8" stroke="currentColor" strokeWidth="3" />
        <path d="M72 24 V78 A154 154 0 0 0 348 78 V24" stroke="currentColor" strokeWidth="3" />

        <path d="M150 576 V458 H270 V576" stroke="currentColor" strokeWidth="3" />
        <circle cx="210" cy="458" r="48" stroke="currentColor" strokeWidth="3" />
        <path d="M186 548 H234" stroke="currentColor" strokeWidth="3" />
        <path d="M210 548 V540" stroke="currentColor" strokeWidth="3" />
        <circle cx="210" cy="532" r="8" stroke="currentColor" strokeWidth="3" />
        <path d="M72 576 V522 A154 154 0 0 1 348 522 V576" stroke="currentColor" strokeWidth="3" />
      </svg>
    </div>
  )
}
