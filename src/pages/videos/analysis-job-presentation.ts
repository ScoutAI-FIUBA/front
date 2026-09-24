import type { ProcessingJob } from '../../types/index.ts'

export type AnalysisJobIndicatorState =
  | 'neutral'
  | 'success'
  | 'destructive'
  | 'information'

export interface AnalysisJobPresentation {
  label: string
  indicatorState: AnalysisJobIndicatorState
  message: string
}

export function getAnalysisJobPresentation(job: ProcessingJob): AnalysisJobPresentation {
  switch (job.status) {
    case 'QUEUED':
      return {
        label: 'En cola',
        indicatorState: 'neutral',
        message: 'El procesamiento está esperando para comenzar.',
      }
    case 'RUNNING':
      return {
        label: 'En proceso',
        indicatorState: 'information',
        message: job.progressPercent == null
          ? 'Procesando sin porcentaje informado.'
          : `${job.progressPercent}% procesado.`,
      }
    case 'DONE':
      return {
        label: 'Completado',
        indicatorState: 'success',
        message: 'El procesamiento terminó correctamente.',
      }
    case 'FAILED':
      return {
        label: 'Fallido',
        indicatorState: 'destructive',
        message: 'El procesamiento finalizó con un error. Reintentá en unos segundos.',
      }
  }
}
