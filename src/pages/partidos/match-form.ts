import { z } from 'zod'
import type { CreateMatchInput, UpdateMatchDetailsInput } from '../../services/contracts/matches.service.ts'
import { localDateInputValue } from '../players/player-birth-date.ts'

export const MATCH_DESCRIPTION_MAX = 2000

const matchDateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresá una fecha válida')
const descriptionField = z.string().trim().max(MATCH_DESCRIPTION_MAX, `Máximo ${MATCH_DESCRIPTION_MAX} caracteres`)

export const matchFormSchema = z
  .object({
    homeTeamId: z.string().min(1, 'Elegí el equipo local'),
    awayTeamId: z.string().min(1, 'Elegí el equipo visitante'),
    matchDate: matchDateField,
    description: descriptionField,
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

/** Editing only touches the date and the description; the teams are read-only. */
export const matchDetailsSchema = z.object({
  matchDate: matchDateField,
  description: descriptionField,
})

export type MatchDetailsValues = z.infer<typeof matchDetailsSchema>

/**
 * The PATCH input with only what changed (an emptied description clears it with null),
 * or null when nothing changed.
 */
export function matchDetailsToUpdateInput(
  values: MatchDetailsValues,
  current: { matchDate: string; description: string | null },
): UpdateMatchDetailsInput | null {
  const input: UpdateMatchDetailsInput = {}
  const description = values.description.trim() || null
  if (values.matchDate !== current.matchDate) input.matchDate = values.matchDate
  if (description !== (current.description?.trim() || null)) input.description = description
  return Object.keys(input).length > 0 ? input : null
}
