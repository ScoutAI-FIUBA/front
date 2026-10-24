import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
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
import { teamService } from '@/services/registry'
import type { Team } from '@/types'
import { NEW_TEAM_DEFAULT_COUNTRY, newTeamDefaults, similarTeams } from './team-suggestion'

/**
 * Creates a team from its name, city and country. A team is created only on an explicit click; if the name
 * looks like an existing team a second, deliberate click ("Crear igual") is required.
 */
export function TeamQuickCreateDialog({
  open,
  onOpenChange,
  title,
  initialName,
  teams,
  onCreated,
  onUseExisting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialName: string
  teams: Team[]
  onCreated: (team: Team) => void
  onUseExisting: (team: Team) => void
}) {
  const [name, setName] = useState(initialName)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState(NEW_TEAM_DEFAULT_COUNTRY)
  const [warned, setWarned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false }
  }, [])

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setCity('')
    setCountry(NEW_TEAM_DEFAULT_COUNTRY)
    setWarned(false)
    setError(null)
  }, [open, initialName])

  const trimmed = name.trim()
  const complete = trimmed !== '' && city.trim() !== '' && country.trim() !== ''
  const similar = similarTeams(trimmed, teams)

  const create = async () => {
    if (busyRef.current || !complete) return
    if (similar.length > 0 && !warned) {
      setWarned(true)
      return
    }
    busyRef.current = true
    setSaving(true)
    setError(null)
    try {
      const created = await teamService.create(newTeamDefaults(trimmed, city, country))
      if (!activeRef.current) return
      toast.success('Equipo creado')
      onCreated(created)
      onOpenChange(false)
    } catch {
      if (activeRef.current) setError('No pudimos crear el equipo. Intentá nuevamente.')
    } finally {
      busyRef.current = false
      if (activeRef.current) setSaving(false)
    }
  }

  const showWarning = warned && similar.length > 0

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Completá el nombre, la ciudad y el país. El resto lo podés editar después en Equipos.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => { event.preventDefault(); void create() }}
        >
          <div>
            <Label htmlFor="quick-team-name">Nombre del equipo</Label>
            <Input
              id="quick-team-name"
              className="mt-1"
              value={name}
              disabled={saving}
              onChange={(event) => { setName(event.target.value); setWarned(false) }}
            />
          </div>
          <div>
            <Label htmlFor="quick-team-city">Ciudad</Label>
            <Input
              id="quick-team-city"
              className="mt-1"
              value={city}
              disabled={saving}
              onChange={(event) => { setCity(event.target.value) }}
            />
          </div>
          <div>
            <Label htmlFor="quick-team-country">País</Label>
            <Input
              id="quick-team-country"
              className="mt-1"
              value={country}
              disabled={saving}
              onChange={(event) => { setCountry(event.target.value) }}
            />
          </div>

          <div aria-live="polite" className="space-y-3">
            {showWarning ? (
              <Alert className="border-amber-400/30 bg-amber-400/[0.06] text-amber-200">
                {similar.slice(0, 3).map(({ team }) => (
                  <div key={team.id} className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Ya existe {team.name}, ¿es el mismo?</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => { onUseExisting(team); onOpenChange(false) }}
                    >
                      Usar {team.name}
                    </Button>
                  </div>
                ))}
              </Alert>
            ) : null}
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant={showWarning ? 'outline' : 'default'} disabled={saving || !complete}>
              {saving ? 'Creando…' : showWarning ? 'Crear igual' : 'Crear equipo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
