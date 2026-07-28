import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, FolderOpen, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { clipCollectionService, videoService } from '@/services/registry'
import type { ClipCollection, Video } from '@/types'

export function VideoCollectionsPage() {
  const { videoId = '' } = useParams()
  const [video, setVideo] = useState<Video | null>(null)
  const [collections, setCollections] = useState<ClipCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!videoId) return
    try {
      setLoading(true)
      setError('')
      const [videoData, collectionData] = await Promise.all([
        videoService.getById(videoId),
        clipCollectionService.list(videoId),
      ])
      setVideo(videoData)
      setCollections(collectionData)
      if (!videoData) setError('No se encontró el video solicitado.')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las colecciones.')
    } finally {
      setLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    void load()
  }, [load])

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
      await load()
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'No se pudo crear la colección')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando colecciones...</p>

  if (error || !video) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link to="/videos"><ArrowLeft className="h-4 w-4" /> Volver a videos</Link>
        </Button>
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-sm text-destructive">
            {error || 'No se encontró el video solicitado.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link to="/videos"><ArrowLeft className="h-4 w-4" /> Volver a videos</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Colecciones privadas</p>
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <p className="text-sm text-muted-foreground">Organizá los clips disponibles de este video.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Nueva colección</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear colección</DialogTitle>
                <DialogDescription>La colección quedará vinculada a {video.title}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="collection-name">Nombre</Label>
                  <Input
                    id="collection-name"
                    maxLength={180}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ej. Mejores jugadas"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="collection-description">Descripción opcional</Label>
                  <Input
                    id="collection-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Contexto de la colección"
                    className="mt-1"
                  />
                </div>
                <Button className="w-full" disabled={saving} onClick={() => void handleCreate()}>
                  {saving ? 'Guardando...' : 'Crear colección'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {collections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <Card key={collection.id} className="transition hover:border-primary/50 hover:shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <h2 className="font-semibold">{collection.name}</h2>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                  {collection.description || 'Sin descripción'}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Creada el {formatDate(collection.createdAt)}
                </p>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to={`/videos/${videoId}/colecciones/${collection.id}`}>Ver colección</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-accent/30">
          <CardContent className="p-10 text-center">
            <FolderOpen className="mx-auto mb-3 h-10 w-10 text-primary/50" />
            <h2 className="font-semibold">Todavía no hay colecciones</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Creá la primera para empezar a organizar clips.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nueva colección
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
