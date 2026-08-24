import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  action?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <section className={cn('max-w-xl py-10 sm:py-16', className)}>
      {icon && (
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {action}
          {secondaryAction}
        </div>
      )}
    </section>
  )
}
