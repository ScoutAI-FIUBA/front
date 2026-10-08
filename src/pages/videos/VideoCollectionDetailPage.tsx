import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Clapperboard, Download, Film, Loader2, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
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
import type { ClipCollectionDetail, ClipCollectionItem, Video } from '@/types'
import { clipRange, formatClipSeconds, orderClipItems } from './clip-collections'

const MAX_CLIP_DURATION_SECONDS = 30

function clipTitle(item: ClipCollectionItem): string {
  return item.description?.trim() || `Clip ${item.position} · ${clipRange(item)}`
}

export function VideoCollectionDetailPage() {
  const { videoId = '', collectionId = '' } = useParams()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [video, setVideo] = useState<Video | null>(null)
  const [detail, setDetail] = useState<ClipCollectionDetail | null>(null)
  const [selectedItem, setSelectedItem] = useState<ClipCollectionItem | null>(null)
  const [playingItemId, setPlayingItemId] = useState('')
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')
  const [videoLoading, setVideoLoading] = useState(true)
  const [videoError, setVideoError] = useState('')
  const [playerLoading, setPlayerLoading] = useState(true)
  const [playerError, setPlayerError] = useState('')
  const [playerRevision, setPlayerRevision] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [startSeconds, setStartSeconds] = useState('0')
  const [endSeconds, setEndSeconds] = useState('10')
  const [clipDescription, setClipDescription] = useState('')
  const [activeClipEnd, setActiveClipEnd] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [exportingId, setExportingId] = useState('')

  const orderedItems = useMemo(() => orderClipItems(detail?.items ?? []), [detail])

  const loadDetail = useCallback(async () => {
    if (!videoId || !collectionId) return
    try {
      setDetailLoading(true)
      setDetailError('')
      const collectionData = await clipCollectionService.getDetail(videoId, collectionId)
      const sortedData = { ...collectionData, items: orderClipItems(collectionData.items) }
      setDetail(sortedData)
      setSelectedItem((current) => (
        sortedData.items.find((item) => item.id === current?.id)
        ?? sortedData.items[0]
        ?? null
      ))
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la colección.')
    } finally {
      setDetailLoading(false)
    }
  }, [videoId, collectionId])

  const loadVideo = useCallback(async () => {
    if (!videoId) return
    try {
      setVideoLoading(true)
      setVideoError('')
      setPlayerError('')
      setPlayerLoading(true)
      const videoData = await videoService.getById(videoId)
      setVideo(videoData)
      if (!videoData) {
        setVideoError('No encontramos el video original de este partido.')
        setPlayerLoading(false)
      } else if (!videoData.storageUrl) {
        setPlayerError('El archivo de video no está disponible.')
        setPlayerLoading(false)
      }
      setPlayerRevision((revision) => revision + 1)
    } catch (loadError) {
      setVideo(null)
      setVideoError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el video original.')
      setPlayerLoading(false)
    } finally {
      setVideoLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    void loadDetail()
    void loadVideo()
  }, [loadDetail, loadVideo])

  const seedClipRange = () => {
    const current = Math.max(0, videoRef.current?.currentTime ?? 0)
    const roundedStart = Math.round(current * 10) / 10
    const duration = video?.durationMs != null ? video.durationMs / 1000 : null
    const proposedEnd = roundedStart + 10
    const boundedEnd = duration == null ? proposedEnd : Math.min(duration, proposedEnd)
    setStartSeconds(String(roundedStart))
    setEndSeconds(String(Math.max(roundedStart, Math.round(boundedEnd * 10) / 10)))
    setClipDescription('')
  }

  const handleAddOpenChange = (open: boolean) => {
    if (open) seedClipRange()
    setAddOpen(open)
  }

  const handleAdd = async () => {
    const start = Number(startSeconds)
    const end = Number(endSeconds)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) {
      toast.error('Ingresá tiempos válidos para el clip')
      return
    }
    if (end <= start) {
      toast.error('El fin debe ser mayor que el inicio')
      return
    }
    if (end - start > MAX_CLIP_DURATION_SECONDS) {
      toast.error('Cada clip puede durar como máximo 30 segundos')
      return
    }
    if (video?.durationMs != null && end * 1000 > video.durationMs) {
      toast.error('El rango no puede superar la duración del video')
      return
    }
    try {
      setSaving(true)
      const item = await clipCollectionService.addClip(videoId, collectionId, {
        startMs: Math.round(start * 1000),
        endMs: Math.round(end * 1000),
        description: clipDescription.trim() || undefined,
      })
      setAddOpen(false)
      setSelectedItem(item)
      toast.success('Clip agregado')
      await loadDetail()
    } catch (addError) {
      toast.error(addError instanceof Error ? addError.message : 'No se pudo agregar el clip')
    } finally {
      setSaving(false)
    }
  }

  const applyCurrentTime = (setter: (value: string) => void) => {
    setter(String(Math.round((videoRef.current?.currentTime ?? 0) * 10) / 10))
  }

  const playItem = (item: ClipCollectionItem) => {
    setSelectedItem(item)
    const player = videoRef.current
    if (!player || playerError || videoError) {
      toast.error('El reproductor no está disponible. El clip sigue seleccionado.')
      return
    }
    player.currentTime = item.startMs / 1000
    setActiveClipEnd(item.endMs / 1000)
    setPlayingItemId(item.id)
    void player.play().catch(() => {
      setPlayingItemId('')
      setPlayerError('No pudimos iniciar la reproducción. Probá recargar el video.')
    })
  }

  const handleVideoTimeUpdate = () => {
    const player = videoRef.current
    if (!player || activeClipEnd == null || player.currentTime < activeClipEnd) return
    player.pause()
    setActiveClipEnd(null)
    setPlayingItemId('')
  }

  const retryPlayer = () => {
    if (!video) {
      void loadVideo()
      return
    }
    setPlayerError('')
    setPlayerLoading(true)
    setPlayerRevision((revision) => revision + 1)
  }

  const handleExport = async (item: ClipCollectionItem) => {
    try {
      setExportingId(item.id)
      const downloadUrl = await clipCollectionService.exportClip(videoId, collectionId, item.id)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `clip-${item.position}.mp4`
      link.target = '_blank'
      link.rel = 'noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Clip preparado para descargar')
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'No se pudo preparar la descarga')
    } finally {
      setExportingId('')
    }
  }

  const handleDelete = async (item: ClipCollectionItem) => {
    if (!window.confirm(`¿Eliminar el clip ${item.position} de esta colección? Esta acción no elimina el video original.`)) return
    try {
      setDeletingId(item.id)
      await clipCollectionService.deleteClip(videoId, collectionId, item.id)
      toast.success('Clip eliminado')
      await loadDetail()
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el clip')
    } finally {
      setDeletingId('')
    }
  }

  if (detailLoading && !detail) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-sm text-[#A8B0BF]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FF6A1F]" /> Cargando colección…
      </div>
    )
  }

  if (detailError || !detail) {
    return (
      <div className="space-y-7">
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[#A8B0BF] hover:text-[#F4F5F7]">
          <Link to={`/videos/${videoId}/colecciones`}><ArrowLeft className="h-4 w-4" /> Volver a clips</Link>
        </Button>
        <section className="border-y border-[#3A2830] py-12">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F28A95]">Colección no disponible</p>
          <h1 className="scout-display mt-3 text-4xl font-bold text-[#F4F5F7]">No pudimos cargar estos clips</h1>
          <p className="mt-2 max-w-xl text-sm text-[#A8B0BF]">{detailError || 'No se encontró la colección solicitada.'}</p>
          <Button variant="outline" className="mt-5" onClick={() => void loadDetail()}>
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </section>
      </div>
    )
  }

  const selectedTitle = selectedItem ? clipTitle(selectedItem) : 'Reproducción libre'
  const playerUnavailable = Boolean(videoError || playerError || (!videoLoading && !video))

  return (
    <div className="space-y-6 pb-8">
      <header className="border-b border-[#252B37] pb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#8E97A7]">
          <Link className="inline-flex items-center gap-2 transition-colors hover:text-[#F4F5F7]" to={matchDetailPath(videoId, 'clips')}>
            <ArrowLeft className="h-4 w-4" /> Partido
          </Link>
          <span aria-hidden="true">/</span>
          <Link className="transition-colors hover:text-[#F4F5F7]" to={`/videos/${videoId}/colecciones`}>Clips</Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-[#D9DCE2]">{detail.collection.name}</span>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6A1F]">Colección · {orderedItems.length} {orderedItems.length === 1 ? 'clip' : 'clips'}</p>
            <h1 className="scout-display mt-2 truncate text-[clamp(2.7rem,6vw,4.4rem)] font-extrabold leading-[0.92] text-[#F4F5F7]">{detail.collection.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#A8B0BF]">
              {detail.collection.description || video?.title || 'Revisión de clips del partido'}
            </p>
          </div>
          {video?.title ? <p className="max-w-xs truncate text-right text-xs text-[#737D8E]">Video · {video.title}</p> : null}
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="review-player-title" className="min-w-0 overflow-hidden border border-[#252B37] bg-[#11151D]">
          <div className="flex items-center justify-between border-b border-[#252B37] px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#737D8E]">Reproductor</p>
              <h2 id="review-player-title" className="mt-0.5 truncate text-sm font-semibold text-[#D9DCE2]">{video?.title || 'Video del partido'}</h2>
            </div>
            {playingItemId ? <span className="flex items-center gap-2 text-xs font-semibold text-[#FF9A68]"><span className="h-1.5 w-1.5 rounded-full bg-[#FF6A1F]" /> Reproduciendo clip</span> : null}
          </div>

          <div className="relative aspect-video bg-black">
            {video?.storageUrl ? (
              <video
                ref={videoRef}
                key={`${video.id}-${playerRevision}`}
                src={video.storageUrl}
                controls
                className="h-full w-full"
                onCanPlay={() => { setPlayerLoading(false); setPlayerError('') }}
                onError={() => { setPlayerLoading(false); setPlayerError('No pudimos cargar el archivo de video.') }}
                onTimeUpdate={handleVideoTimeUpdate}
                onPause={() => setPlayingItemId('')}
                onEnded={() => { setPlayingItemId(''); setActiveClipEnd(null) }}
              />
            ) : null}

            {(videoLoading || playerLoading) && !playerUnavailable ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75 text-sm text-[#A8B0BF]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FF6A1F]" /> Cargando video…
              </div>
            ) : null}

            {playerUnavailable ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0A0C10] px-6 text-center">
                <div>
                  <Film className="mx-auto h-10 w-10 text-[#FF6A1F]" />
                  <h3 className="scout-display mt-4 text-2xl font-bold text-[#F4F5F7]">Video no disponible</h3>
                  <p className="mt-2 max-w-md text-sm text-[#8E97A7]">{playerError || videoError || 'No se pudo cargar el video original.'}</p>
                  <Button variant="outline" size="sm" className="mt-5" onClick={retryPlayer}>
                    <RefreshCw className="h-4 w-4" /> Reintentar video
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 border-t border-[#252B37] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#737D8E]">{playingItemId ? 'Reproduciendo ahora' : selectedItem ? 'Clip seleccionado' : 'Video original'}</p>
              <p className="scout-display mt-1 truncate text-2xl font-bold text-[#F4F5F7]">{selectedTitle}</p>
              {selectedItem ? (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="scout-display text-3xl font-extrabold tabular-nums text-[#FF8A4C]">{clipRange(selectedItem)}</span>
                  <span className="text-xs text-[#737D8E]">Guardado {formatDate(selectedItem.createdAt)}</span>
                </div>
              ) : <p className="mt-2 text-sm text-[#8E97A7]">Reproducí el video y capturá el rango desde la lista.</p>}
            </div>
            {selectedItem ? (
              <Button
                variant="outline"
                size="sm"
                disabled={exportingId === selectedItem.id}
                onClick={() => void handleExport(selectedItem)}
              >
                {exportingId === selectedItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exportingId === selectedItem.id ? 'Preparando…' : 'Descargar'}
              </Button>
            ) : null}
          </div>
        </section>

        <aside aria-labelledby="clip-list-title" className="border border-[#252B37] bg-[#11151D] xl:sticky xl:top-6">
          <div className="flex items-center justify-between gap-3 border-b border-[#252B37] px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#737D8E]">Colección</p>
              <h2 id="clip-list-title" className="scout-display mt-0.5 text-2xl font-bold text-[#F4F5F7]">
                {orderedItems.length} {orderedItems.length === 1 ? 'clip' : 'clips'}
              </h2>
            </div>
            <Dialog open={addOpen} onOpenChange={handleAddOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> Agregar clip</Button>
              </DialogTrigger>
              <DialogContent className="scout-product-theme min-h-0 max-w-lg border-[#303744] bg-[#151922] text-foreground">
                <DialogHeader>
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#FF6A1F]">{video?.title || 'Video del partido'}</p>
                  <DialogTitle className="scout-display text-2xl font-bold text-[#F4F5F7]">Agregar clip</DialogTitle>
                  <DialogDescription>
                    Capturá un rango de hasta 30 segundos. El inicio se toma del punto actual del reproductor.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-1">
                  <div>
                    <Label htmlFor="clip-description">Nombre opcional</Label>
                    <Input
                      id="clip-description"
                      className="mt-1.5"
                      maxLength={200}
                      placeholder="Ej. Ataque en transición"
                      value={clipDescription}
                      onChange={(event) => setClipDescription(event.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="clip-start">Inicio (segundos)</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input id="clip-start" type="number" min="0" step="0.1" value={startSeconds} onChange={(event) => setStartSeconds(event.target.value)} />
                        <Button type="button" variant="outline" size="sm" onClick={() => applyCurrentTime(setStartSeconds)}>Usar actual</Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="clip-end">Fin (segundos)</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input id="clip-end" type="number" min="0" step="0.1" value={endSeconds} onChange={(event) => setEndSeconds(event.target.value)} />
                        <Button type="button" variant="outline" size="sm" onClick={() => applyCurrentTime(setEndSeconds)}>Usar actual</Button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#303744] bg-[#11151D] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#737D8E]">Rango a guardar</p>
                    <p className="scout-display mt-1 text-2xl font-bold tabular-nums text-[#FF8A4C]">
                      {formatClipSeconds(Number(startSeconds) || 0)}–{formatClipSeconds(Number(endSeconds) || 0)}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                    <Button disabled={saving} onClick={() => void handleAdd()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {saving ? 'Guardando…' : 'Agregar clip'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {orderedItems.length > 0 ? (
            <div className="divide-y divide-[#252B37]">
              {orderedItems.map((item) => {
                const selected = selectedItem?.id === item.id
                const playing = playingItemId === item.id
                return (
                  <div key={item.id} className={`group relative grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-3 py-3 transition-colors ${selected ? 'bg-[#1A1B1E]' : 'hover:bg-[#151922]'}`}>
                    {selected ? <span className="absolute inset-y-0 left-0 w-0.5 bg-[#FF6A1F]" /> : null}
                    <button type="button" className="min-w-0 text-left focus-visible:outline-none" onClick={() => playItem(item)}>
                      <span className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-[#FF6A1F]/60 bg-[#2A1B14] text-[#FF8A4C]' : 'border-[#303744] bg-[#151922] text-[#A8B0BF]'}`}>
                          {playing ? <span className="h-2 w-2 rounded-full bg-[#FF6A1F]" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#E7E9ED]">{clipTitle(item)}</span>
                          <span className={`scout-display mt-1 block text-2xl font-bold tabular-nums ${selected ? 'text-[#FF8A4C]' : 'text-[#A8B0BF]'}`}>{clipRange(item)}</span>
                          <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#667083]">{playing ? 'Reproduciendo' : `Clip ${item.position}`}</span>
                        </span>
                      </span>
                    </button>
                    <span className="flex items-start opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={exportingId === item.id} aria-label={`Descargar clip ${item.position}`} onClick={() => void handleExport(item)}>
                        {exportingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9A6A72] hover:text-[#F28A95]" disabled={deletingId === item.id} aria-label={`Eliminar clip ${item.position}`} onClick={() => void handleDelete(item)}>
                        {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-10">
              <Clapperboard className="h-8 w-8 text-[#FF6A1F]" />
              <h3 className="scout-display mt-4 text-2xl font-bold text-[#F4F5F7]">Colección vacía</h3>
              <p className="mt-2 text-sm leading-6 text-[#8E97A7]">Reproducí el video, ubicá el momento y guardá el primer rango.</p>
              <Button size="sm" className="mt-5" onClick={() => handleAddOpenChange(true)}><Plus className="h-4 w-4" /> Agregar primer clip</Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
