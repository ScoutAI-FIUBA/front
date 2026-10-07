import { cn } from '@/lib/utils'

interface LoginCourtBackdropProps {
  variant?: 'visual' | 'ambient'
}

export function LoginCourtBackdrop({ variant = 'visual' }: LoginCourtBackdropProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className={cn(
          'absolute inset-0',
          variant === 'visual'
            ? 'bg-[radial-gradient(circle_at_25%_20%,rgba(255,106,31,0.17),transparent_34%),linear-gradient(145deg,rgba(255,106,31,0.06),transparent_58%)]'
            : 'bg-[radial-gradient(circle_at_75%_20%,rgba(255,106,31,0.08),transparent_32%)]',
        )}
      />
      <svg
        className={cn(
          'absolute text-[#F4F5F7]',
          variant === 'visual'
            ? '-bottom-[28%] -right-[22%] h-[150%] w-[145%] opacity-[0.13] sm:-bottom-[40%] sm:h-[175%] lg:-bottom-[12%] lg:-right-[36%] lg:h-[125%] lg:w-[145%] lg:opacity-[0.16]'
            : '-bottom-[45%] -right-[25%] h-[150%] w-[115%] rotate-[-10deg] opacity-[0.035] sm:-right-[10%] sm:w-[80%]',
        )}
        viewBox="0 0 700 1080"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        focusable="false"
      >
        <rect x="36" y="32" width="628" height="1016" rx="8" stroke="currentColor" strokeWidth="4" />
        <path d="M36 540 H664" stroke="currentColor" strokeWidth="4" />
        <circle cx="350" cy="540" r="92" stroke="currentColor" strokeWidth="4" />
        <path d="M238 32 V244 H462 V32" stroke="currentColor" strokeWidth="4" />
        <circle cx="350" cy="244" r="92" stroke="currentColor" strokeWidth="4" />
        <path d="M305 86 H395 M350 86 V104" stroke="currentColor" strokeWidth="4" />
        <circle cx="350" cy="120" r="15" stroke="currentColor" strokeWidth="4" />
        <path d="M112 32 V128 A258 258 0 0 0 588 128 V32" stroke="currentColor" strokeWidth="4" />
        <path d="M238 1048 V836 H462 V1048" stroke="currentColor" strokeWidth="4" />
        <circle cx="350" cy="836" r="92" stroke="currentColor" strokeWidth="4" />
        <path d="M305 994 H395 M350 994 V976" stroke="currentColor" strokeWidth="4" />
        <circle cx="350" cy="960" r="15" stroke="currentColor" strokeWidth="4" />
        <path d="M112 1048 V952 A258 258 0 0 1 588 952 V1048" stroke="currentColor" strokeWidth="4" />
      </svg>
    </div>
  )
}
