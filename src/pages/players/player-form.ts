import { z } from 'zod'
import type { Player } from '@/types'
import type { CreatePlayerDto, UpdatePlayerDto } from '@/services/contracts/players.service'
import { localDateInputValue } from './player-birth-date.ts'

export const playerFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresá el nombre'),
  lastName: z.string().trim().min(1, 'Ingresá el apellido'),
  primaryPosition: z
    .union([z.enum(['PG', 'SG', 'SF', 'PF', 'C']), z.literal('')]),
  jerseyNumber: z
    .string()
    .regex(/^\d{0,2}$/, 'Usá uno o dos dígitos'),
  birthDate: z
    .string()
    .refine(
      (value) => value === '' || value <= localDateInputValue(),
      'La fecha de nacimiento no puede ser futura',
    ),
  heightCm: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 300),
      'Ingresá una altura válida de hasta 300 cm',
    ),
  weightKg: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 400),
      'Ingresá un peso válido de hasta 400 kg',
    ),
})

export type PlayerFormValues = z.infer<typeof playerFormSchema>

export const emptyPlayerFormValues: PlayerFormValues = {
  firstName: '',
  lastName: '',
  primaryPosition: '',
  jerseyNumber: '',
  birthDate: '',
  heightCm: '',
  weightKg: '',
}

export function playerToFormValues(player: Player): PlayerFormValues {
  return {
    firstName: player.firstName,
    lastName: player.lastName,
    primaryPosition: player.primaryPosition ?? '',
    jerseyNumber: player.jerseyNumber ?? '',
    birthDate: player.birthDate ?? '',
    heightCm: player.heightCm == null ? '' : String(player.heightCm),
    weightKg: player.weightKg == null ? '' : String(player.weightKg),
  }
}

function nullableNumber(value: string): number | null {
  const normalized = value.trim()
  return normalized === '' ? null : Number(normalized)
}

export function playerFormToDto(values: PlayerFormValues): UpdatePlayerDto {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    primaryPosition: values.primaryPosition || null,
    jerseyNumber: values.jerseyNumber || undefined,
    birthDate: values.birthDate.trim() || null,
    heightCm: nullableNumber(values.heightCm),
    weightKg: nullableNumber(values.weightKg),
  }
}

export function playerFormToCreateDto(
  values: PlayerFormValues,
  teamId?: string,
): CreatePlayerDto {
  return { ...playerFormToDto(values), teamId }
}

export function playerFormHasChanges(values: PlayerFormValues, player: Player): boolean {
  const next = playerFormToDto(values)
  const current = playerFormToDto(playerToFormValues(player))
  return (
    next.firstName !== current.firstName
    || next.lastName !== current.lastName
    || next.birthDate !== current.birthDate
    || next.primaryPosition !== current.primaryPosition
    || next.jerseyNumber !== current.jerseyNumber
    || next.heightCm !== current.heightCm
    || next.weightKg !== current.weightKg
  )
}
