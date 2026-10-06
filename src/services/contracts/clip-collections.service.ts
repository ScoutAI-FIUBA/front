import type {
  ClipCollection,
  ClipCollectionDetail,
  ClipCollectionItem,
} from '@/types'

export interface CreateClipCollectionDto {
  name: string
  description?: string
}

export interface AddClipDto {
  startMs: number
  endMs: number
  description?: string
}

export interface IClipCollectionService {
  list(videoId: string): Promise<ClipCollection[]>
  getDetail(videoId: string, collectionId: string): Promise<ClipCollectionDetail>
  create(videoId: string, dto: CreateClipCollectionDto): Promise<ClipCollection>
  addClip(videoId: string, collectionId: string, dto: AddClipDto): Promise<ClipCollectionItem>
  addClips(videoId: string, collectionId: string, clips: AddClipDto[]): Promise<ClipCollectionItem[]>
  exportClip(videoId: string, collectionId: string, itemId: string): Promise<string>
  deleteClip(videoId: string, collectionId: string, itemId: string): Promise<void>
}
