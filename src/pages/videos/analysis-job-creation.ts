import type { ProcessingJob } from '../../types/index.ts'

export function addCreatedAnalysisJob(
  jobs: ProcessingJob[],
  createdJob: ProcessingJob,
): ProcessingJob[] {
  return [createdJob, ...jobs.filter((job) => job.id !== createdJob.id)]
}

interface AnalysisJobSubmissionOptions {
  create: () => Promise<ProcessingJob>
  onCreated: (job: ProcessingJob) => void
  onError: (error: unknown) => void
  onSubmittingChange: (submitting: boolean) => void
}

export interface AnalysisJobSubmission {
  submit(): Promise<void>
}

export function createAnalysisJobSubmission({
  create,
  onCreated,
  onError,
  onSubmittingChange,
}: AnalysisJobSubmissionOptions): AnalysisJobSubmission {
  let inFlight: Promise<void> | null = null

  return {
    submit() {
      if (inFlight) return inFlight

      onSubmittingChange(true)
      inFlight = (async () => {
        try {
          const job = await create()
          onCreated(job)
        } catch (error) {
          onError(error)
        } finally {
          onSubmittingChange(false)
          inFlight = null
        }
      })()
      return inFlight
    },
  }
}
