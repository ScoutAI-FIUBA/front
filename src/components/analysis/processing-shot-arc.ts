export interface ProcessingShotArcState {
  percent: number
  ballX: number
  ballY: number
  strokeDashoffset: number
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
