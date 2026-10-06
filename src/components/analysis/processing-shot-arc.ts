export interface ProcessingShotArcState {
  percent: number
  ballX: number
  ballY: number
  strokeDashoffset: number
}

export type ProcessingShotArcVariant =
  | 'waiting'
  | 'preparing'
  | 'queued'
  | 'running'
  | 'failed'

export interface ProcessingShotArcVisualState extends ProcessingShotArcState {
  hasRealProgress: boolean
}

const START = { x: 30, y: 102 }
const CONTROL = { x: 174, y: -28 }
const END = { x: 314, y: 58 }

export function processingShotArcState(progressPercent: number): ProcessingShotArcState {
  const percent = Number.isFinite(progressPercent)
    ? Math.min(100, Math.max(0, progressPercent))
    : 0
  const progress = percent / 100
  const inverse = 1 - progress

  return {
    percent,
    ballX: inverse * inverse * START.x
      + 2 * inverse * progress * CONTROL.x
      + progress * progress * END.x,
    ballY: inverse * inverse * START.y
      + 2 * inverse * progress * CONTROL.y
      + progress * progress * END.y,
    strokeDashoffset: 100 - percent,
  }
}

export function processingShotArcVisualState(
  variant: ProcessingShotArcVariant,
  progressPercent?: number | null,
): ProcessingShotArcVisualState {
  if (variant === 'running' && progressPercent != null && Number.isFinite(progressPercent)) {
    return { ...processingShotArcState(progressPercent), hasRealProgress: true }
  }

  if (variant === 'failed') {
    return {
      percent: 0,
      ballX: 286,
      ballY: 88,
      strokeDashoffset: 38,
      hasRealProgress: false,
    }
  }

  return { ...processingShotArcState(0), hasRealProgress: false }
}
