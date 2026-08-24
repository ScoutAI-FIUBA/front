import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border-strong bg-surface text-foreground',
        analyzed: 'border-success/20 bg-success/10 text-success',
        processing: 'border-information/20 bg-information/10 text-information',
        failed: 'border-destructive/20 bg-destructive/10 text-destructive',
        uploaded: 'border-border bg-surface-subtle text-muted-foreground',
        position: 'border-primary/20 bg-primary-subtle text-primary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}



