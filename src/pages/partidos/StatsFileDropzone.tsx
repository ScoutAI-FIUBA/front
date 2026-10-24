import { type ChangeEvent, type DragEvent, useId, useState } from 'react'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fileSizeLabel, validateStatsFile } from './match-import'

interface StatsFileDropzoneProps {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}

export function StatsFileDropzone({ file, onFileChange, disabled = false }: StatsFileDropzoneProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Remounting the input lets the user pick the same file again after removing it.
  const [inputKey, setInputKey] = useState(0)

  const acceptFile = (selected: File | undefined) => {
    if (!selected || disabled) return
    const problem = validateStatsFile(selected)
    setError(problem)
    if (problem) return
    onFileChange(selected)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0])
    setInputKey((key) => key + 1)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  const removeFile = () => {
    setError(null)
    setInputKey((key) => key + 1)
    onFileChange(null)
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className={cn(
          'flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-ring/40',
          isDragging ? 'border-primary bg-primary-subtle' : 'border-border-strong bg-surface hover:border-primary/50',
          disabled && 'pointer-events-none opacity-60',
        )}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false) }}
        onDrop={handleDrop}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
          {file ? <FileSpreadsheet aria-hidden="true" className="h-5 w-5" /> : <Upload aria-hidden="true" className="h-5 w-5" />}
        </span>
        <span className="mt-3 text-sm font-medium text-foreground">
          {file ? 'Cambiar planilla' : 'Arrastrá la planilla acá o elegila desde tu dispositivo'}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          Planilla de estadísticas de la federación en .xlsx o .csv, hasta 5 MB
        </span>
        <input
          key={inputKey}
          id={inputId}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          onChange={handleChange}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
        />
      </label>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">{error}</p>
      ) : null}

      {file ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
          <p className="min-w-0 text-sm">
            <span className="block truncate font-medium text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{fileSizeLabel(file.size)}</span>
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={removeFile} disabled={disabled}>
            <X aria-hidden="true" className="h-4 w-4" />
            Quitar
          </Button>
        </div>
      ) : null}
    </div>
  )
}
