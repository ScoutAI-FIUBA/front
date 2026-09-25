import { processingShotArcState } from './processing-shot-arc'

interface ProcessingShotArcProps {
  progressPercent: number
}

export function ProcessingShotArc({ progressPercent }: ProcessingShotArcProps) {
  const state = processingShotArcState(progressPercent)

  return (
    <div
      className="relative mx-auto mt-4 aspect-[18/7] w-full max-w-md overflow-hidden rounded-lg border bg-primary-subtle/35"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 360 140"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        focusable="false"
      >
        <path d="M0 118 H360" stroke="currentColor" className="text-border-strong/70" strokeWidth="2" />
        <path
          d="M4 118 A78 78 0 0 1 106 118"
          stroke="currentColor"
          className="text-border-strong/60"
          strokeWidth="2"
        />

        <path
          d="M30 102 Q174 -28 314 58"
          pathLength="100"
          stroke="currentColor"
          className="text-border-strong"
          strokeWidth="3"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
        <path
          d="M30 102 Q174 -28 314 58"
          pathLength="100"
          stroke="currentColor"
          className="text-primary motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out motion-reduce:transition-none"
          strokeWidth="4"
          strokeDasharray="100"
          strokeDashoffset={state.strokeDashoffset}
          strokeLinecap="round"
        />

        <path d="M338 28 V76" stroke="currentColor" className="text-muted-foreground" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="316" cy="62" rx="20" ry="5" stroke="currentColor" className="text-primary" strokeWidth="4" />
        <path d="M299 66 L304 86 M308 67 L310 89 M317 67 V90 M326 67 L324 89 M334 66 L330 86 M303 78 H331" stroke="currentColor" className="text-border-strong" strokeWidth="1.5" />
      </svg>

      <span
        className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground/70 bg-primary shadow-sm motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out motion-reduce:transition-none"
        style={{
          left: `${(state.ballX / 360) * 100}%`,
          top: `${(state.ballY / 140) * 100}%`,
        }}
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rotate-[18deg] bg-foreground/65" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 -rotate-[12deg] bg-foreground/65" />
      </span>
    </div>
  )
}
