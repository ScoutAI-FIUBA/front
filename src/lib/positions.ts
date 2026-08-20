import type { PositionCode } from '@/types'

export const POSITIONS: ReadonlyArray<{ code: PositionCode; label: string }> = [
  { code: 'PG', label: 'Base' },
  { code: 'SG', label: 'Escolta' },
  { code: 'SF', label: 'Alero' },
  { code: 'PF', label: 'Ala-Pívot' },
  { code: 'C', label: 'Pívot' },
]

export const POSITION_CODES: ReadonlyArray<PositionCode> = POSITIONS.map((p) => p.code)

const LABEL_BY_CODE = new Map(POSITIONS.map((p) => [p.code, p.label]))

export function positionLabel(code: string): string {
  return LABEL_BY_CODE.get(code as PositionCode) ?? code
}
