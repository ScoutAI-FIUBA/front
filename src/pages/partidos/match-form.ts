import { z } from 'zod'
import type { CreateMatchInput } from '../../services/contracts/matches.service.ts'
import { localDateInputValue } from '../players/player-birth-date.ts'

export const MATCH_DESCRIPTION_MAX = 2000

export const matchFormSchema = z
  .object({
    homeTeamId: z.string().min(1, 'Elegí el equipo local'),
    awayTeamId: z.string().min(1, 'Elegí el equipo visitante'),
    matchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresá una fecha válida'),
    description: z.string().trim().max(MATCH_DESCRIPTION_MAX, `Máximo ${MATCH_DESCRIPTION_MAX} caracteres`),
  })
  .refine(
    (values) => !values.homeTeamId || !values.awayTeamId || values.homeTeamId !== values.awayTeamId,
    { message: 'Elegí un equipo distinto al local', path: ['awayTeamId'] },
  )

export type MatchFormValues = z.infer<typeof matchFormSchema>

/** The date defaults to today (local time); future dates are allowed. */
export function emptyMatchFormValues(today = localDateInputValue()): MatchFormValues {
  return { homeTeamId: '', awayTeamId: '', matchDate: today, description: '' }
}

export function matchFormToCreateInput(values: MatchFormValues): CreateMatchInput {
  const description = values.description.trim()
  return {
    homeTeamId: values.homeTeamId,
    awayTeamId: values.awayTeamId,
    matchDate: values.matchDate,
    ...(description ? { description } : {}),
  }
}
