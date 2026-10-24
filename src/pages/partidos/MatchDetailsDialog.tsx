import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { matchService } from '@/services/registry'
import type { MatchRecord } from '@/types'
import {
  MATCH_DESCRIPTION_MAX,
  matchDetailsSchema,
  matchDetailsToUpdateInput,
  type MatchDetailsValues,
} from './match-form'
import { matchErrorCopy } from './match-import'

export const TEAMS_READ_ONLY_NOTE = 'Para cambiar los equipos creá un partido nuevo.'

const textareaClass =
  'flex min-h-24 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60'

export function MatchDetailsDialog({
  match,
  homeName,
  awayName,
  open,
  onOpenChange,
  onSaved,
}: {
  match: MatchRecord
  homeName: string
  awayName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (match: MatchRecord) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MatchDetailsValues>({
    resolver: zodResolver(matchDetailsSchema),
    defaultValues: { matchDate: match.matchDate, description: match.description ?? '' },
  })
  const descriptionLength = watch('description').length

  const onSubmit = async (values: MatchDetailsValues) => {
    if (busyRef.current) return
    const input = matchDetailsToUpdateInput(values, match)
    if (!input) {
      onOpenChange(false)
      return
    }
    busyRef.current = true
    setSaving(true)
    setError(null)
    try {
      const updated = await matchService.updateDetails(match.id, input)
      if (!activeRef.current) return
      toast.success('Partido actualizado')
      onSaved(updated)
      onOpenChange(false)
    } catch (saveError) {
      if (activeRef.current) setError(matchErrorCopy(saveError).description)
    } finally {
      busyRef.current = false
      if (activeRef.current) setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar fecha y descripción</DialogTitle>
          <DialogDescription>{homeName} vs {awayName}. {TEAMS_READ_ONLY_NOTE}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Local</p>
              <p className="text-foreground">{homeName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Visitante</p>
              <p className="text-foreground">{awayName}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-match-date">Fecha</Label>
            <Input
              id="edit-match-date"
              type="date"
              className="mt-1"
              disabled={saving}
              aria-invalid={errors.matchDate ? true : undefined}
              aria-describedby={errors.matchDate ? 'edit-match-date-error' : undefined}
              {...register('matchDate')}
            />
            {errors.matchDate ? (
              <p id="edit-match-date-error" className="mt-1 text-xs text-destructive">{errors.matchDate.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="edit-match-description">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <textarea
              id="edit-match-description"
              rows={3}
              className={`mt-1 ${textareaClass}`}
              disabled={saving}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={`edit-match-description-count${errors.description ? ' edit-match-description-error' : ''}`}
              {...register('description')}
            />
            <div className="mt-1 flex items-start justify-between gap-3">
              {errors.description ? (
                <p id="edit-match-description-error" className="text-xs text-destructive">{errors.description.message}</p>
              ) : null}
              <p id="edit-match-description-count" className="ml-auto text-xs text-muted-foreground">
                {descriptionLength}/{MATCH_DESCRIPTION_MAX}
              </p>
            </div>
          </div>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
