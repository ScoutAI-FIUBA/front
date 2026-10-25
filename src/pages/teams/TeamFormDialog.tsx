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

const labelClassName = 'text-[#E3E6EB]'
const inputClassName =
  'mt-1.5 border-[#3A4254] bg-[#11151D] text-[#F4F5F7] caret-[#FF6A1F] placeholder:text-[#7D8698] hover:border-[#4A5366] focus-visible:border-[#FF6A1F] focus-visible:ring-[#FF6A1F]/30 focus-visible:ring-offset-0 disabled:bg-[#11151D] disabled:text-[#A3ABBA]'

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
  const [isOwn, setIsOwn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shortNameEdited, setShortNameEdited] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(team?.name ?? '')
    setShortName(team?.shortName ?? '')
    setCity(team?.city ?? '')
    setCountry(team?.country ?? 'Argentina')
    setIsOwn(team ? team.isOwn : true)
    setShortNameEdited(Boolean(team))
    setError(null)
  }, [open, team])

  const updateName = (value: string) => {
    setName(value)
    if (!shortNameEdited) setShortName(value.trim().slice(0, 3).toUpperCase())
  }

  const submit = async () => {
    const values = {
      isOwn,
      name: name.trim(),
      shortName: shortName.trim(),
      city: city.trim(),
      country: country.trim(),
    }
    if (Object.values({ name, shortName, city, country }).some((value) => !value.trim())) {
      setError('Completá nombre, nombre corto, ciudad y país.')
      return
    }
    setError(null)
    await onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scout-product-theme min-h-0 max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto border-[#303744] bg-[#151922] text-[#F4F5F7] shadow-[0_24px_80px_rgba(0,0,0,0.55)] [&>button]:text-[#A3ABBA] [&>button:hover]:text-[#F4F5F7] [&>button:focus-visible]:outline-none [&>button:focus-visible]:ring-2 [&>button:focus-visible]:ring-[#FF6A1F]/40">
        <DialogHeader>
          <DialogTitle className="scout-display text-2xl font-bold text-[#F4F5F7]">
            {team ? 'Editar equipo' : 'Nuevo equipo'}
          </DialogTitle>
          <DialogDescription className="text-[#A3ABBA]">
            Usá la identidad y ubicación reales del equipo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          <div>
            <Label htmlFor="team-name" className={labelClassName}>Nombre</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Ej. Club Atlético Norte"
              className={inputClassName}
            />
          </div>
          <div>
            <Label htmlFor="team-short-name" className={labelClassName}>Nombre corto</Label>
            <Input
              id="team-short-name"
              value={shortName}
              maxLength={12}
              placeholder="Ej. CAN"
              onChange={(event) => {
                setShortNameEdited(true)
                setShortName(event.target.value)
              }}
              className={inputClassName}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="team-city" className={labelClassName}>Ciudad</Label>
              <Input
                id="team-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ej. Rosario"
                className={inputClassName}
              />
            </div>
            <div>
              <Label htmlFor="team-country" className={labelClassName}>País</Label>
              <Input
                id="team-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="Ej. Argentina"
                className={inputClassName}
              />
            </div>
          </div>
          <label htmlFor="team-is-own" className="flex cursor-pointer items-center gap-3 text-sm text-[#E3E6EB]">
            <input
              id="team-is-own"
              type="checkbox"
              checked={isOwn}
              onChange={(event) => setIsOwn(event.target.checked)}
              className="h-4 w-4 accent-[#FF6A1F]"
            />
            Es mi equipo
          </label>
          {error && (
            <p
              className="rounded-lg border border-[#6B3038] bg-[#2A1519] px-3 py-2 text-sm font-medium text-[#FF9AA5]"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-[#3A4254] bg-transparent text-[#D5D9E1] hover:border-[#6F788A] hover:bg-white/[0.05] hover:text-white focus-visible:ring-[#FF6A1F]/40 focus-visible:ring-offset-[#151922]"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={submitting}
              className="bg-[#FF6A1F] text-[#0B0D12] hover:bg-[#FF7B38] hover:text-[#0B0D12] focus-visible:ring-[#FF6A1F]/50 focus-visible:ring-offset-[#151922]"
            >
              {submitting ? 'Guardando…' : 'Guardar equipo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
