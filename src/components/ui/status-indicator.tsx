import type { ComponentType, SVGProps } from 'react'
import { Circle, CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusIndicatorState = 'neutral' | 'success' | 'warning' | 'destructive' | 'information'

interface StatusIndicatorProps {
  state?: StatusIndicatorState
  children: string
  className?: string
}

type StatusDefinition = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  className: string
}

const statusDefinitions: Record<StatusIndicatorState, StatusDefinition> = {
  neutral: { icon: Circle, className: 'text-muted-foreground' },
  success: { icon: CircleCheck, className: 'text-success' },
  warning: { icon: TriangleAlert, className: 'text-warning' },
  destructive: { icon: CircleAlert, className: 'text-destructive' },
  information: { icon: Info, className: 'text-information' },
}

export function StatusIndicator({ state = 'neutral', children, className }: StatusIndicatorProps) {
  const { icon: Icon, className: stateClassName } = statusDefinitions[state]

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', stateClassName, className)}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </span>
  )
}
