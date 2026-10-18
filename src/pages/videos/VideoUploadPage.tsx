import { type ChangeEvent, type DragEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileVideo2,
  Flame,
  LoaderCircle,
  Map,
  Play,
  RefreshCw,
  Route,
  Upload,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { teamService, videoService } from '@/services/registry'
import type { Team } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { videoUploadReturnPath, videoUploadSuccessPath } from './video-upload-navigation'
import { upsertVideoInAnalysisCatalog } from '@/pages/analysis/analysis-job-catalog-store'
import { teamsPathForVideoUpload } from '@/pages/teams/team-creation-navigation'

type VideoUploadStep = 1 | 2 | 3

const STEPS: Array<{ value: VideoUploadStep; number: string; label: string }> = [
  { value: 1, number: '01', label: 'Equipo' },
  { value: 2, number: '02', label: 'Archivo' },
  { value: 3, number: '03', label: 'Confirmar' },
]

const REPORT_PREVIEW = [
  {
    icon: Flame,
    title: 'Tiros en cancha',
    copy: 'Tiros y ubicación en cancha, cuando se detecten.',
  },
  {
    icon: Play,
    title: 'Evidencia en video',
    copy: 'La jugada para los tiros que tengan un momento registrado.',
  },
  {
    icon: Route,
    title: 'Movimiento',
    copy: 'Recorridos y mapas de calor por jugador.',
  },
  {
    icon: Map,
    title: 'Análisis similares',
    copy: 'Comparaciones del equipo si existen otros análisis compatibles.',
  },
]

function fileSizeLabel(size: number): string {
  if (size > 0 && size < 1024 * 1024 * 0.1) return '< 0,1 MB'
  return `${(size / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`
}

export function VideoUploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedTeamId = searchParams.get('team_id')
  const [step, setStep] = useState<VideoUploadStep>(1)
  const [teams, setTeams] = useState<Team[]>([])
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [teamsState, setTeamsState] = useState<'loading' | 'success' | 'error'>('loading')

  const applyLoadedTeams = useCallback((loaded: Team[]) => {
    setTeams(loaded)
    setTeamId((current) => {
      if (current && loaded.some((team) => team.id === current)) return current
      if (requestedTeamId && loaded.some((team) => team.id === requestedTeamId)) return requestedTeamId
      return ''
    })
    setTeamsState('success')
  }, [requestedTeamId])

  const loadTeams = useCallback(async () => {
    setTeamsState('loading')
    try {
      applyLoadedTeams(await teamService.list())
    } catch {
      setTeamsState('error')
    }
  }, [applyLoadedTeams])

  useEffect(() => {
    let active = true
    setTeamsState('loading')
    void teamService.list().then(
      (loaded) => { if (active) applyLoadedTeams(loaded) },
      () => { if (active) setTeamsState('error') },
    )
    return () => { active = false }
  }, [applyLoadedTeams])

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === teamId) ?? null,
    [teamId, teams],
  )

  const acceptFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return
    if (selectedFile.type && !selectedFile.type.startsWith('video/')) {
      toast.error('Seleccioná un archivo de video')
      return
    }
    setFile(selectedFile)
    if (!title.trim()) setTitle(selectedFile.name.replace(/\.[^.]+$/, ''))
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0])
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  const handleUpload = async () => {
    if (!title.trim() || !teamId || !file || isUploading) {
      if (!isUploading) toast.error('Completá título, equipo y archivo')
      return
    }

    try {
      setIsUploading(true)
      const uploaded = await videoService.upload({ title: title.trim(), teamId, description: description.trim(), file })
      if (!user || !upsertVideoInAnalysisCatalog(user.id, uploaded)) return
      toast.success('Video subido correctamente')
      navigate(videoUploadSuccessPath(searchParams, uploaded))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo subir el video')
    } finally {
      setIsUploading(false)
    }
  }

  const returnPath = videoUploadReturnPath(searchParams, teamId)
  const canOpenStep = (target: VideoUploadStep) => (
    target === 1 || (target === 2 && Boolean(teamId)) || (target === 3 && Boolean(teamId && file))
  )

  return (
    <div className="pb-16 pt-6 sm:pt-10">
      <header className="border-b border-[#252B38] pb-8">
        <Link
          to={returnPath}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#A3ABBA] transition-colors hover:text-[#F4F5F7]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a Videos
        </Link>
        <div className="mt-5 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6A1F]">Nuevo video</p>
          <h1 className="scout-display mt-3 text-[clamp(3.4rem,8vw,5.2rem)] font-extrabold text-[#F4F5F7]">
            Prepará el video
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A3ABBA] sm:text-lg">
            Elegí tu equipo, sumá el archivo y confirmá la información antes de subirlo.
          </p>
        </div>
      </header>

      <nav aria-label="Pasos para subir un video" className="grid border-b border-[#252B38] md:grid-cols-3">
        {STEPS.map((item) => {
          const active = item.value === step
          const complete = item.value < step
          const available = canOpenStep(item.value)
          return (
            <button
              key={item.value}
              type="button"
              disabled={!available || isUploading}
              aria-current={active ? 'step' : undefined}
              onClick={() => { if (available) setStep(item.value) }}
              className={cn(
                'relative flex min-h-[74px] items-center gap-3 border-b-2 border-transparent px-1 text-left transition-colors md:px-5',
                active && 'border-[#FF6A1F] text-[#F4F5F7]',
                complete && 'text-[#F4F5F7]',
                !active && !complete && 'text-[#6F788A]',
                available && !active && 'hover:text-[#F4F5F7]',
              )}
            >
              <span className={cn('scout-display text-2xl font-bold', active && 'text-[#FF6A1F]')}>
                {complete ? <Check aria-hidden="true" className="h-5 w-5" /> : item.number}
              </span>
              <span className="scout-display text-2xl font-bold">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {step === 1 ? (
        <section className="pt-10" aria-labelledby="team-step-title">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A3ABBA]">01 · Equipo</p>
            <h2 id="team-step-title" className="scout-display mt-3 text-4xl font-bold text-[#F4F5F7] sm:text-5xl">
              ¿A qué equipo pertenece este video?
            </h2>
            <p className="mt-3 text-base text-[#A3ABBA]">El video, sus análisis y comparaciones quedarán asociados a este equipo.</p>
          </div>

          <div className="mt-9 max-w-3xl border-y border-[#252B38]">
            {teamsState === 'loading' ? (
              <div className="flex min-h-40 items-center gap-3 py-8 text-[#A3ABBA]" role="status">
                <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-[#FF6A1F]" />
                Cargando equipos…
              </div>
            ) : null}

            {teamsState === 'error' ? (
              <div className="flex min-h-40 flex-col items-start justify-center py-8" role="alert">
                <h3 className="text-lg font-semibold text-[#F4F5F7]">No pudimos cargar tus equipos</h3>
                <p className="mt-2 text-sm text-[#A3ABBA]">Revisá tu conexión e intentá nuevamente.</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadTeams()}
                  className="mt-5 h-11 rounded-full border-[#3A4254] bg-transparent px-5 text-[#F4F5F7] hover:bg-white/5 hover:text-white"
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : null}

            {teamsState === 'success' && teams.length === 0 ? (
              <div className="flex min-h-44 flex-col items-start justify-center py-8">
                <h3 className="scout-display text-3xl font-bold text-[#F4F5F7]">Todavía no tenés equipos</h3>
                <p className="mt-2 text-sm text-[#A3ABBA]">Creá un equipo para poder asociar y analizar su primer video.</p>
                <Button asChild variant="outline" className="mt-5 h-11 rounded-full border-[#3A4254] bg-transparent px-5 text-[#F4F5F7] hover:bg-white/5 hover:text-white">
                  <Link to={teamsPathForVideoUpload()}>
                    Ir a Equipos
                  </Link>
                </Button>
              </div>
            ) : null}

            {teamsState === 'success' && teams.length > 0 ? teams.map((team) => {
              const selected = team.id === teamId
              const metadata = [team.league, team.category, team.season].filter(Boolean).join(' · ')
              return (
                <button
                  key={team.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTeamId(team.id)}
                  className="group flex min-h-[92px] w-full items-center gap-5 border-b border-[#252B38] px-1 py-5 text-left transition-colors last:border-b-0 hover:bg-white/[0.025] sm:px-4"
                >
                  <span className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                    selected ? 'border-[#FF6A1F] bg-[#FF6A1F] text-white' : 'border-[#3A4254] text-[#A3ABBA]',
                  )}>
                    {selected ? <Check aria-hidden="true" className="h-5 w-5" /> : (team.shortName || team.name).slice(0, 3).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold text-[#F4F5F7]">{team.name}</span>
                    <span className="mt-1 block text-sm text-[#A3ABBA]">{metadata || [team.city, team.country].filter(Boolean).join(', ') || 'Sin información adicional'}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className={cn('h-5 w-5 transition-colors', selected ? 'text-[#FF6A1F]' : 'text-[#4F586A] group-hover:text-[#A3ABBA]')} />
                </button>
              )
            }) : null}
          </div>

          {teamsState === 'success' && teams.length > 0 ? (
            <div className="mt-8 flex justify-end">
              <Button
                type="button"
                disabled={!teamId}
                onClick={() => setStep(2)}
                className="h-[52px] rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white hover:bg-[#ff7b38]"
              >
                Continuar
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="pt-10" aria-labelledby="file-step-title">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A3ABBA]">02 · Archivo</p>
            <h2 id="file-step-title" className="scout-display mt-3 text-4xl font-bold text-[#F4F5F7] sm:text-5xl">Archivo de video</h2>
            <p className="mt-3 text-base text-[#A3ABBA]">Elegí el material que querés preparar para analizar.</p>
          </div>

          <label
            className={cn(
              'mt-9 flex min-h-[340px] cursor-pointer flex-col items-center justify-center border-y border-dashed px-6 py-12 text-center transition-colors',
              isDragging ? 'border-[#FF6A1F] bg-[#FF6A1F]/[0.05]' : 'border-[#3A4254] bg-[#11151D]/40 hover:border-[#6F788A]',
              isUploading && 'pointer-events-none opacity-60',
            )}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false) }}
            onDrop={handleDrop}
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#3A4254] bg-[#151922] text-[#FF6A1F]">
              {file ? <FileVideo2 aria-hidden="true" className="h-9 w-9" /> : <Upload aria-hidden="true" className="h-9 w-9" />}
            </span>
            <span className="scout-display mt-6 text-3xl font-bold text-[#F4F5F7]">
              {file ? file.name : 'Arrastrá el archivo de video acá'}
            </span>
            <span className="mt-3 text-sm text-[#A3ABBA]">
              {file ? `${fileSizeLabel(file.size)} · Podés reemplazarlo antes de continuar` : 'Video MP4, MOV, AVI u otro formato reconocido por tu dispositivo'}
            </span>
            <span className="mt-7 inline-flex min-h-[46px] items-center rounded-full border border-[#F4F5F7] px-6 text-sm font-semibold text-[#F4F5F7]">
              {file ? 'Cambiar archivo' : 'Elegir archivo'}
            </span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFile} disabled={isUploading} />
          </label>

          <div className="mt-8 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} className="h-11 px-0 text-[#A3ABBA] hover:bg-transparent hover:text-[#F4F5F7]">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Equipo
            </Button>
            <Button
              type="button"
              disabled={!file}
              onClick={() => setStep(3)}
              className="h-[52px] rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white hover:bg-[#ff7b38]"
            >
              Continuar
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 && file && selectedTeam ? (
        <section className="pt-10" aria-labelledby="confirm-step-title">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A3ABBA]">03 · Confirmar</p>
            <h2 id="confirm-step-title" className="scout-display mt-3 text-4xl font-bold text-[#F4F5F7] sm:text-5xl">Todo listo para subir</h2>
            <p className="mt-3 text-base text-[#A3ABBA]">Revisá la información. El análisis se inicia después, desde Análisis IA.</p>
          </div>

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-16">
            <div>
              <dl className="grid gap-0 border-y border-[#252B38]">
                <div className="grid gap-1 border-b border-[#252B38] py-5 sm:grid-cols-[140px_1fr] sm:items-center">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6F788A]">Equipo</dt>
                  <dd className="flex items-center gap-3 font-semibold text-[#F4F5F7]"><Users aria-hidden="true" className="h-4 w-4 text-[#FF6A1F]" />{selectedTeam.name}</dd>
                </div>
                <div className="grid gap-1 py-5 sm:grid-cols-[140px_1fr] sm:items-center">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6F788A]">Archivo</dt>
                  <dd className="min-w-0 font-semibold text-[#F4F5F7]"><span className="block truncate">{file.name}</span><span className="mt-1 block text-xs font-normal text-[#A3ABBA]">{fileSizeLabel(file.size)}</span></dd>
                </div>
              </dl>

              <div className="mt-8 space-y-6">
                <div>
                  <Label htmlFor="video-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A3ABBA]">Título del video</Label>
                  <Input
                    id="video-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ej: Liga Metropolitana: MET vs OLY"
                    className="mt-2 h-13 rounded-none border-x-0 border-t-0 border-[#3A4254] bg-transparent px-0 text-lg text-[#F4F5F7] focus-visible:ring-0"
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <Label htmlFor="video-description" className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A3ABBA]">Descripción <span className="normal-case tracking-normal text-[#6F788A]">(opcional)</span></Label>
                  <Input
                    id="video-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Agregá contexto útil sobre el video"
                    className="mt-2 h-13 rounded-none border-x-0 border-t-0 border-[#3A4254] bg-transparent px-0 text-lg text-[#F4F5F7] focus-visible:ring-0"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <p className="mt-7 max-w-xl text-sm leading-relaxed text-[#A3ABBA]">
                La fecha que verás en la biblioteca será la fecha de carga del archivo.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  disabled={isUploading || !title.trim()}
                  onClick={() => void handleUpload()}
                  className="h-[54px] rounded-full bg-[#FF6A1F] px-8 text-base font-semibold text-white hover:bg-[#ff7b38]"
                >
                  {isUploading ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Upload aria-hidden="true" className="h-5 w-5" />}
                  {isUploading ? 'Subiendo archivo…' : 'Subir video'}
                </Button>
                <button type="button" disabled={isUploading} onClick={() => setStep(2)} className="min-h-11 text-sm font-semibold text-[#A3ABBA] hover:text-[#F4F5F7] disabled:opacity-50">
                  Cambiar archivo
                </button>
              </div>
            </div>

            <aside className="border-l border-[#252B38] pl-8 lg:pl-10" aria-labelledby="report-preview-title">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6A1F]">Tu próximo paso</p>
              <h3 id="report-preview-title" className="scout-display mt-3 text-3xl font-bold leading-tight text-[#F4F5F7]">
                Qué vas a poder ver en Análisis IA
              </h3>
              <div className="mt-7 divide-y divide-[#252B38] border-y border-[#252B38]">
                {REPORT_PREVIEW.map(({ icon: Icon, title: itemTitle, copy }) => (
                  <div key={itemTitle} className="grid grid-cols-[28px_1fr] gap-4 py-5">
                    <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#FF6A1F]" />
                    <div>
                      <p className="font-semibold text-[#F4F5F7]">{itemTitle}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#A3ABBA]">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm font-medium text-[#F4F5F7]">Depende de lo que se detecte en el video.</p>
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  )
}
