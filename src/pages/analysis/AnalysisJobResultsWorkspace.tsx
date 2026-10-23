import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Clock3, FileSearch, GitCompareArrows, MapPinned, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ProcessingJob, Team, Video } from '@/types'
import { AnalysisJobCourtPositionsView, type AnalysisMovementTechnicalSummary } from './AnalysisJobCourtPositions'
import { AnalysisJobDetails } from './AnalysisJobDetails'
import { AnalysisJobOverview } from './AnalysisJobOverview'
import { AnalysisJobShotsWorkspace } from './AnalysisJobShotsWorkspace'
import { AnalysisJobSimilarAnalysesView } from './AnalysisJobSimilarAnalyses'
import { analysisJobPlayerIdentitiesForJob } from './analysis-job-player-identity'
import {
  AnalysisWorkspaceVideo,
  type AnalysisWorkspaceVideoHandle,
  type AnalysisWorkspaceVideoState,
} from './AnalysisWorkspaceVideo'
import {
  useAnalysisJobShootingData,
  type AnalysisShootingSummary,
} from './use-analysis-job-shooting-data'

export type AnalysisJobResultsSection = 'overview' | 'shots' | 'movement' | 'similar' | 'details'

const MODULES: Array<{
  id: AnalysisJobResultsSection
  label: string
  icon: typeof BarChart3
  resultsOnly?: boolean
  secondary?: boolean
}> = [
  { id: 'overview', label: 'Resumen', icon: BarChart3 },
  { id: 'shots', label: 'Tiros', icon: Clock3, resultsOnly: true },
  { id: 'movement', label: 'Movimiento', icon: MapPinned, resultsOnly: true },
  { id: 'similar', label: 'Similares', icon: GitCompareArrows, resultsOnly: true, secondary: true },
  { id: 'details', label: 'Detalles', icon: FileSearch, secondary: true },
]

interface AnalysisJobResultsWorkspaceProps {
  job: ProcessingJob
  video: Video | null
  team: Team | null
  activeSection: AnalysisJobResultsSection
  onSectionChange: (section: AnalysisJobResultsSection) => void
  onJobUpdated: (job: ProcessingJob) => void
  showNavigation?: boolean
  includeDetails?: boolean
  presentation?: 'legacy' | 'match-report'
}

export function AnalysisJobResultsWorkspace({
  job,
  video,
  team,
  activeSection,
  onSectionChange,
  onJobUpdated,
  showNavigation = true,
  includeDetails = true,
  presentation = 'legacy',
}: AnalysisJobResultsWorkspaceProps) {
  const shootingData = useAnalysisJobShootingData(job)
  const playerIdentities = analysisJobPlayerIdentitiesForJob(job.id, shootingData)
  const [movementSummary, setMovementSummary] = useState<AnalysisMovementTechnicalSummary | null>(null)
  const [videoState, setVideoState] = useState<AnalysisWorkspaceVideoState>('loading')
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const playerRef = useRef<AnalysisWorkspaceVideoHandle | null>(null)
  const moduleButtonRefs = useRef<Partial<Record<AnalysisJobResultsSection, HTMLButtonElement | null>>>({})

  useEffect(() => {
    setVideoState('loading')
    setMovementSummary(null)
    setEvidenceOpen(false)
  }, [job.id])

  useEffect(() => {
    if (!showNavigation) return
    const button = moduleButtonRefs.current[activeSection]
    if (!button || !globalThis.matchMedia?.('(max-width: 639px)').matches) return
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    button.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })
  }, [activeSection, showNavigation])

  const shootingSummary = useMemo<AnalysisShootingSummary | null>(() => {
    const { stats, statsState } = shootingData
    if (statsState !== 'success' || !stats || stats.jobId !== job.id) return null
    return {
      team: stats.teams.find((candidate) => candidate.teamSide === stats.ourTeamSide) ?? null,
      coverage: stats.coverage,
    }
  }, [job.id, shootingData])

  const handleSeekToVideo = useCallback((seconds: number) => {
    if (presentation === 'match-report') setEvidenceOpen(true)
    if (!playerRef.current?.seekTo(seconds)) return
    if (presentation === 'match-report' || globalThis.matchMedia?.('(max-width: 1279px)').matches) {
      const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      globalThis.requestAnimationFrame(() => {
        document.getElementById('analysis-source-video')?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
        })
      })
    }
  }, [presentation])

  const availableModules = MODULES.filter((module) => (
    (includeDetails || module.id !== 'details')
    && (!module.resultsOnly || job.status === 'DONE')
  ))
  const title = video?.title || 'Análisis de video'
  const editorialReportSection = presentation === 'match-report'
    && (activeSection === 'overview' || activeSection === 'shots')
  const reportContentOnlySection = presentation === 'match-report'
    && (activeSection === 'movement' || activeSection === 'similar')
  const showReportEvidence = presentation === 'match-report'
    && activeSection === 'shots'
    && evidenceOpen

  return (
    <div className={cn(
      'grid items-start gap-5',
      editorialReportSection || reportContentOnlySection
        ? 'grid-cols-1'
        : videoState === 'error'
        ? 'xl:grid-cols-[minmax(340px,0.72fr)_minmax(620px,1.28fr)]'
        : 'xl:grid-cols-[minmax(420px,0.9fr)_minmax(560px,1.1fr)]',
    )}>
      <div className={cn(
        'min-w-0',
        editorialReportSection
          ? showReportEvidence ? 'ml-auto w-full max-w-2xl' : 'hidden'
          : reportContentOnlySection ? 'hidden'
          : 'xl:sticky xl:top-20',
      )}>
        {showReportEvidence ? (
          <div className="mb-2 flex items-center justify-between gap-3 border-b border-[#252B38] pb-2">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#788397]">Evidencia de video</p><p className="mt-1 text-xs text-[#A3ABBA]">Reproducción directa desde el timestamp informado.</p></div>
            <Button type="button" variant="ghost" size="sm" className="text-[#A3ABBA]" onClick={() => setEvidenceOpen(false)}><X className="h-4 w-4" aria-hidden="true" /> Cerrar</Button>
          </div>
        ) : null}
        <AnalysisWorkspaceVideo
          ref={playerRef}
          video={video}
          videoId={job.videoId}
          teamId={job.teamId}
          title={title}
          minimalChrome={presentation === 'match-report'}
          onStateChange={setVideoState}
        />
      </div>

      <div className="min-w-0">
        {showNavigation ? (
          <nav className="relative mb-3 overflow-hidden rounded-xl border border-white/10 bg-surface p-1.5" aria-label="Secciones del análisis">
            <div className="flex min-w-max snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {availableModules.map(({ id, label, icon: Icon, secondary }) => (
                <button
                  type="button"
                  key={id}
                  ref={(element) => { moduleButtonRefs.current[id] = element }}
                  className={cn(
                    'inline-flex h-10 snap-start items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors motion-reduce:transition-none',
                    activeSection === id
                      ? 'bg-primary text-primary-foreground'
                      : secondary
                        ? 'text-muted-foreground/70 hover:bg-surface-subtle hover:text-foreground'
                        : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
                  )}
                  aria-current={activeSection === id ? 'page' : undefined}
                  onClick={() => onSectionChange(id)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <span className="pointer-events-none absolute inset-y-1.5 right-1.5 w-6 rounded-r-lg bg-gradient-to-l from-surface to-transparent sm:hidden" aria-hidden="true" />
          </nav>
        ) : null}

        <div className="min-h-[480px] px-1 py-2 sm:px-2 lg:px-3">
          <div hidden={activeSection !== 'overview'}>
            <AnalysisJobOverview
              job={job}
              shootingSummary={shootingSummary}
              onJobUpdated={onJobUpdated}
              onNavigate={onSectionChange}
              showDetailsAction={includeDetails}
              presentation={presentation}
              shootingData={shootingData}
            />
          </div>
          <div hidden={activeSection !== 'shots'}>
            <AnalysisJobShotsWorkspace
              job={job}
              shootingData={shootingData}
              playerIdentities={playerIdentities}
              onSeekToVideo={handleSeekToVideo}
              onOpenOverview={() => onSectionChange('overview')}
              presentation={presentation}
            />
          </div>
          <div hidden={activeSection !== 'movement'}>
            <AnalysisJobCourtPositionsView
              job={job}
              playerIdentities={playerIdentities}
              onTechnicalSummaryChange={setMovementSummary}
              presentation={presentation}
            />
          </div>
          <div hidden={activeSection !== 'similar'}>
            <AnalysisJobSimilarAnalysesView job={job} teamName={team?.name} presentation={presentation} />
          </div>
          {includeDetails ? (
            <div hidden={activeSection !== 'details'}>
              <AnalysisJobDetails
                job={job}
                video={video}
                team={team}
                shootingSummary={shootingSummary}
                movementSummary={movementSummary}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
