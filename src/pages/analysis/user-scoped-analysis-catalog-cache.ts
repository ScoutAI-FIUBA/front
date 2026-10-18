import type { AnalysisJobCatalog } from './analysis-job-catalog.ts'

interface OwnedCatalog {
  userId: string
  catalog: AnalysisJobCatalog
}

interface CatalogLoadInFlight {
  userId: string
  generation: number
  promise: Promise<AnalysisJobCatalog>
}

export class AnalysisCatalogIdentityChangedError extends Error {
  constructor() {
    super('The authenticated identity changed while loading the analysis catalogue.')
    this.name = 'AnalysisCatalogIdentityChangedError'
  }
}

export function isAnalysisCatalogIdentityChangedError(
  error: unknown,
): error is AnalysisCatalogIdentityChangedError {
  return error instanceof AnalysisCatalogIdentityChangedError
}

export class UserScopedAnalysisCatalogCache {
  private readonly ttlMs: number
  private activeUserId: string | null = null
  private identityGeneration = 0
  private cachedCatalog: OwnedCatalog | null = null
  private loadInFlight: CatalogLoadInFlight | null = null

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs
  }

  private isCurrentIdentity(userId: string, generation = this.identityGeneration): boolean {
    return this.activeUserId === userId && this.identityGeneration === generation
  }

  private assertCurrentIdentity(userId: string, generation = this.identityGeneration): void {
    if (!this.isCurrentIdentity(userId, generation)) {
      throw new AnalysisCatalogIdentityChangedError()
    }
  }

  setIdentity(userId: string | null): void {
    if (this.activeUserId === userId) return
    this.activeUserId = userId
    this.identityGeneration += 1
    this.cachedCatalog = null
    this.loadInFlight = null
  }

  peek(userId: string): AnalysisJobCatalog | null {
    if (this.activeUserId !== userId || this.cachedCatalog?.userId !== userId) return null
    return this.cachedCatalog.catalog
  }

  async load(
    userId: string,
    loader: () => Promise<AnalysisJobCatalog>,
    options: { force?: boolean; now?: () => number } = {},
  ): Promise<AnalysisJobCatalog> {
    this.assertCurrentIdentity(userId)
    const owned = this.cachedCatalog?.userId === userId ? this.cachedCatalog : null
    const cacheIsFresh = owned
      && (options.now?.() ?? Date.now()) - owned.catalog.updatedAt < this.ttlMs
    if (!options.force && cacheIsFresh) return owned.catalog
    if (
      this.loadInFlight?.userId === userId
      && this.loadInFlight.generation === this.identityGeneration
    ) return this.loadInFlight.promise

    const generation = this.identityGeneration
    const promise = loader().then((catalog) => {
      this.assertCurrentIdentity(userId, generation)
      this.cachedCatalog = { userId, catalog }
      return catalog
    })
    const request: CatalogLoadInFlight = { userId, generation, promise }
    this.loadInFlight = request
    void promise.then(
      () => {
        if (this.loadInFlight === request) this.loadInFlight = null
      },
      () => {
        if (this.loadInFlight === request) this.loadInFlight = null
      },
    )
    return promise
  }

  async updateFromAsync(
    userId: string,
    update: () => Promise<AnalysisJobCatalog>,
  ): Promise<AnalysisJobCatalog> {
    const generation = this.identityGeneration
    this.assertCurrentIdentity(userId, generation)
    const catalog = await update()
    this.assertCurrentIdentity(userId, generation)
    this.cachedCatalog = { userId, catalog }
    return catalog
  }

  mutate(userId: string, update: (catalog: AnalysisJobCatalog) => AnalysisJobCatalog): boolean {
    if (this.activeUserId !== userId) return false
    if (this.cachedCatalog?.userId !== userId) return true
    this.cachedCatalog = { userId, catalog: update(this.cachedCatalog.catalog) }
    return true
  }

  reset(): void {
    this.activeUserId = null
    this.identityGeneration += 1
    this.cachedCatalog = null
    this.loadInFlight = null
  }
}
