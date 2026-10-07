import { z } from 'zod'
import type { Player, PositionCode } from '@/types'
import type { CreatePlayerDto, UpdatePlayerDto } from '@/services/contracts/players.service'
import { localDateInputValue } from './player-birth-date.ts'

export const playerFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresá el nombre'),
  lastName: z.string().trim().min(1, 'Ingresá el apellido'),
  primaryPosition: z
    .union([z.enum(['PG', 'SG', 'SF', 'PF', 'C']), z.literal('')])
    .refine((value) => value.length > 0, 'Seleccioná una posición'),
  jerseyNumber: z
    .string()
    .regex(/^\d{0,2}$/, 'Usá uno o dos dígitos'),
  birthDate: z
    .string()
    .min(1, 'Ingresá la fecha de nacimiento')
    .refine((value) => value <= localDateInputValue(), 'La fecha de nacimiento no puede ser futura'),
  heightCm: z
    .string()
    .trim()
    .min(1, 'Ingresá la altura')
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'Ingresá una altura válida'),
  weightKg: z
    .string()
    .trim()
    .min(1, 'Ingresá el peso')
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'Ingresá un peso válido'),
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
    primaryPosition: player.primaryPosition,
    jerseyNumber: player.jerseyNumber ?? '',
    birthDate: player.birthDate,
    heightCm: player.heightCm == null ? '' : String(player.heightCm),
    weightKg: player.weightKg == null ? '' : String(player.weightKg),
  }
}

export function playerFormToDto(values: PlayerFormValues): UpdatePlayerDto {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    primaryPosition: values.primaryPosition as PositionCode,
    jerseyNumber: values.jerseyNumber || undefined,
    birthDate: values.birthDate,
    heightCm: Number(values.heightCm),
    weightKg: Number(values.weightKg),
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
