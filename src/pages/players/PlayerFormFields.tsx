import { Controller, type UseFormReturn } from 'react-hook-form'
import { AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { POSITIONS } from '@/lib/positions'
import { toJerseyNumber } from '@/lib/utils'
import { localDateInputValue } from './player-birth-date'
import type { PlayerFormValues } from './player-form'

interface PlayerFormFieldsProps {
  form: UseFormReturn<PlayerFormValues>
  jerseyWarning?: string | null
}

const NO_POSITION = 'no-position'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function PlayerFormFields({ form, jerseyWarning }: PlayerFormFieldsProps) {
  const { register, control, formState: { errors } } = form

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="player-first-name">Nombre</Label>
          <Input id="player-first-name" className="mt-1" autoComplete="given-name" {...register('firstName')} />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div>
          <Label htmlFor="player-last-name">Apellido</Label>
          <Input id="player-last-name" className="mt-1" autoComplete="family-name" {...register('lastName')} />
          <FieldError message={errors.lastName?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Posición <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Controller
            name="primaryPosition"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || NO_POSITION}
                onValueChange={(value) => field.onChange(value === NO_POSITION ? '' : value)}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccioná una posición" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_POSITION}>Sin especificar</SelectItem>
                  {POSITIONS.map((position) => (
                    <SelectItem key={position.code} value={position.code}>{position.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.primaryPosition?.message} />
        </div>
        <div>
          <Label htmlFor="player-jersey">Dorsal</Label>
          <Controller
            name="jerseyNumber"
            control={control}
            render={({ field }) => (
              <Input
                id="player-jersey"
                className="mt-1 text-lg font-semibold"
                inputMode="numeric"
                maxLength={2}
                placeholder="Ej. 10"
                value={field.value}
                onChange={(event) => field.onChange(toJerseyNumber(event.target.value))}
              />
            )}
          />
          <FieldError message={errors.jerseyNumber?.message} />
          {jerseyWarning && (
            <div className="mt-2 flex gap-2 rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-2.5 py-2 text-xs leading-4 text-amber-300">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              <p>{jerseyWarning}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="player-birth-date">Fecha de nacimiento <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Input
          id="player-birth-date"
          type="date"
          max={localDateInputValue()}
          className="mt-1"
          {...register('birthDate')}
        />
        <FieldError message={errors.birthDate?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="player-height">Altura (cm) <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Input id="player-height" type="number" min="1" max="300" step="1" className="mt-1" {...register('heightCm')} />
          <FieldError message={errors.heightCm?.message} />
        </div>
        <div>
          <Label htmlFor="player-weight">Peso (kg) <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Input id="player-weight" type="number" min="1" max="400" step="1" className="mt-1" {...register('weightKg')} />
          <FieldError message={errors.weightKg?.message} />
        </div>
      </div>
    </div>
  )
}
