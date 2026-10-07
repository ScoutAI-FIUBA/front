import { useEffect, useState } from 'react'
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
import type { CreateTeamDto } from '@/services/contracts/teams.service'
import type { Team } from '@/types'

interface TeamFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: Team | null
  submitting: boolean
  onSubmit: (values: CreateTeamDto) => Promise<void>
}

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
  submitting,
  onSubmit,
}: TeamFormDialogProps) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Argentina')
  const [error, setError] = useState<string | null>(null)
  const [shortNameEdited, setShortNameEdited] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(team?.name ?? '')
    setShortName(team?.shortName ?? '')
    setCity(team?.city ?? '')
    setCountry(team?.country ?? 'Argentina')
    setShortNameEdited(Boolean(team))
    setError(null)
  }, [open, team])

  const updateName = (value: string) => {
    setName(value)
    if (!shortNameEdited) setShortName(value.trim().slice(0, 3).toUpperCase())
  }

  const submit = async () => {
    const values = {
      name: name.trim(),
      shortName: shortName.trim(),
      city: city.trim(),
      country: country.trim(),
    }
    if (Object.values(values).some((value) => !value)) {
      setError('Completá nombre, nombre corto, ciudad y país.')
      return
    }
    setError(null)
    await onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scout-product-theme">
        <DialogHeader>
          <DialogTitle>{team ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
          <DialogDescription>
            Usá la identidad y ubicación reales del equipo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="team-name">Nombre</Label>
            <Input id="team-name" value={name} onChange={(event) => updateName(event.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="team-short-name">Nombre corto</Label>
            <Input
              id="team-short-name"
              value={shortName}
              maxLength={12}
              onChange={(event) => {
                setShortNameEdited(true)
                setShortName(event.target.value)
              }}
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="team-city">Ciudad</Label>
              <Input id="team-city" value={city} onChange={(event) => setCity(event.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="team-country">País</Label>
              <Input id="team-country" value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar equipo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
