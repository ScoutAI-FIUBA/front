import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Clapperboard, Loader2, Plus, RefreshCw } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { matchDetailPath } from '@/pages/matches/match-detail'
import { clipCollectionService, videoService } from '@/services/registry'
import type { ClipCollection, Video } from '@/types'
import { orderClipCollections } from './clip-collections'

export function VideoCollectionsPage() {
  const { videoId = '' } = useParams()
  const [video, setVideo] = useState<Video | null>(null)
  const [collections, setCollections] = useState<ClipCollection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [collectionsError, setCollectionsError] = useState('')
  const [videoLoading, setVideoLoading] = useState(true)
  const [videoError, setVideoError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const orderedCollections = useMemo(() => orderClipCollections(collections), [collections])

  const loadCollections = useCallback(async () => {
    if (!videoId) return
    try {
      setCollectionsLoading(true)
      setCollectionsError('')
      setCollections(await clipCollectionService.list(videoId))
    } catch (loadError) {
      setCollectionsError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las colecciones.')
    } finally {
      setCollectionsLoading(false)
    }
  }, [videoId])

  const loadVideo = useCallback(async () => {
    if (!videoId) return
    try {
      setVideoLoading(true)
      setVideoError('')
      const videoData = await videoService.getById(videoId)
      setVideo(videoData)
      if (!videoData) setVideoError('No pudimos cargar el contexto de este partido.')
    } catch (loadError) {
      setVideo(null)
      setVideoError(loadError instanceof Error ? loadError.message : 'No pudimos cargar el contexto de este partido.')
    } finally {
      setVideoLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    void loadCollections()
    void loadVideo()
  }, [loadCollections, loadVideo])

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Ingresá un nombre para la colección')
      return
    }
    try {
      setSaving(true)
      await clipCollectionService.create(videoId, {
        name: trimmedName,
        description: description.trim() || undefined,
      })
      setName('')
      setDescription('')
      setCreateOpen(false)
      toast.success('Colección creada')
      await loadCollections()
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'No se pudo crear la colección')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <header className="border-b border-[#252B37] pb-7">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4 text-[#A8B0BF] hover:text-[#F4F5F7]">
          <Link to={matchDetailPath(videoId, 'clips')}>
            <ArrowLeft className="h-4 w-4" /> Volver al partido
          </Link>
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6A1F]">Partido · revisión de video</p>
            <h1 className="scout-display mt-2 text-[clamp(3rem,7vw,5rem)] font-extrabold leading-[0.9] text-[#F4F5F7]">Clips</h1>
            <p className="mt-3 max-w-2xl text-sm text-[#A8B0BF]">
              {videoLoading ? 'Cargando contexto del partido…' : video?.title || 'Colecciones del partido'}
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0"><Plus className="h-4 w-4" /> Nueva colección</Button>
            </DialogTrigger>
            <DialogContent className="scout-product-theme min-h-0 max-w-md border-[#303744] bg-[#151922] text-foreground">
              <DialogHeader>
                <DialogTitle className="scout-display text-2xl font-bold text-[#F4F5F7]">Nueva colección</DialogTitle>
                <DialogDescription>
                  Guardá una selección de clips dentro de {video?.title || 'este partido'}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div>
                  <Label htmlFor="collection-name">Nombre</Label>
                  <Input
                    id="collection-name"
                    maxLength={180}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ej. Ataques en transición"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="collection-description">Descripción opcional</Label>
                  <Input
                    id="collection-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Contexto breve para el equipo"
                    className="mt-1.5"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button disabled={saving} onClick={() => void handleCreate()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {saving ? 'Guardando…' : 'Crear colección'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {videoError && !videoLoading ? (
        <Alert className="flex flex-wrap items-center justify-between gap-3 border-[#735021] bg-[#17140F] text-[#D7C4A1]">
          <p className="text-sm">El contexto del partido no está disponible. Las colecciones siguen activas.</p>
          <Button size="sm" variant="ghost" className="text-[#FFB878] hover:text-[#FFD1A8]" onClick={() => void loadVideo()}>
            <RefreshCw className="h-4 w-4" /> Reintentar contexto
          </Button>
        </Alert>
      ) : null}

      {collectionsLoading ? (
        <div className="flex min-h-64 items-center justify-center border-y border-[#252B37] text-sm text-[#A8B0BF]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FF6A1F]" /> Cargando colecciones…
        </div>
      ) : collectionsError ? (
        <section className="border-y border-[#3A2830] py-12">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F28A95]">No pudimos cargar los clips</p>
          <h2 className="scout-display mt-3 text-3xl font-bold text-[#F4F5F7]">La lista de colecciones no está disponible</h2>
          <p className="mt-2 max-w-xl text-sm text-[#A8B0BF]">{collectionsError}</p>
          <Button variant="outline" className="mt-5" onClick={() => void loadCollections()}>
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </section>
      ) : orderedCollections.length > 0 ? (
        <section aria-labelledby="collection-list-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="collection-list-title" className="text-xs font-bold uppercase tracking-[0.17em] text-[#8E97A7]">Colecciones</h2>
            <span className="text-xs tabular-nums text-[#737D8E]">{orderedCollections.length} {orderedCollections.length === 1 ? 'colección' : 'colecciones'}</span>
          </div>
          <div className="divide-y divide-[#252B37] border-y border-[#252B37]">
            {orderedCollections.map((collection, index) => (
              <Link
                key={collection.id}
                to={`/videos/${videoId}/colecciones/${collection.id}`}
                className="group grid min-h-[92px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 px-2 py-4 transition-colors hover:bg-[#11151D] focus-visible:bg-[#11151D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A1F]/60 sm:grid-cols-[64px_minmax(0,1fr)_180px_auto] sm:gap-5 sm:px-4"
              >
                <span className="scout-display text-2xl font-bold tabular-nums text-[#596273] group-hover:text-[#FF6A1F]">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="scout-display block truncate text-2xl font-bold text-[#F4F5F7] transition-colors group-hover:text-white">{collection.name}</span>
                  {collection.description ? <span className="mt-1 block truncate text-sm text-[#8E97A7]">{collection.description}</span> : null}
                </span>
                <span className="hidden text-xs text-[#737D8E] sm:block">Actualizada {formatDate(collection.updatedAt)}</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-[#A8B0BF] transition-colors group-hover:text-[#FF9A68]">
                  Abrir <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="border-y border-[#252B37] py-14">
          <Clapperboard className="h-9 w-9 text-[#FF6A1F]" />
          <h2 className="scout-display mt-5 text-4xl font-bold text-[#F4F5F7]">Todavía no hay colecciones</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#A8B0BF]">
            Creá la primera para reunir los fragmentos que quieras revisar de este partido.
          </p>
          <Button className="mt-6" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Crear primera colección
          </Button>
        </section>
      )}
    </div>
  )
}
