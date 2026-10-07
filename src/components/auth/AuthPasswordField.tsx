import { Eye, EyeOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AuthPasswordFieldProps {
  id: string
  name?: string
  label: string
  value: string
  visible: boolean
  autoComplete: string
  onChange: (value: string) => void
  onToggle: () => void
  labelAction?: ReactNode
}

export function AuthPasswordField({
  id,
  name,
  label,
  value,
  visible,
  autoComplete,
  onChange,
  onToggle,
  labelAction,
}: AuthPasswordFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      <div className="relative mt-1.5">
        <Input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="pr-11"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={onToggle}
        >
          {visible
            ? <EyeOff className="h-4 w-4" aria-hidden="true" />
            : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
