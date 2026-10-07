import type { ReactNode } from 'react'
import { LoginCourtBackdrop } from './LoginCourtBackdrop'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  children: ReactNode
  mode?: 'split' | 'compact'
  panelWidth?: 'default' | 'wide'
  visualTitle?: string
}

interface AuthPanelHeaderProps {
  eyebrow?: string
  title: string
  description?: string
}

function AuthBrand() {
  return (
    <div className="scout-display text-[28px] font-extrabold tracking-[-0.03em] text-[#F4F5F7]">
      SCOUT<span className="text-[#FF6A1F]">AI</span>
    </div>
  )
}

export function AuthPanelHeader({ eyebrow, title, description }: AuthPanelHeaderProps) {
  return (
    <header>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF8A50]">
          {eyebrow}
        </p>
      )}
      <h1 className="scout-display mt-2 text-[clamp(2.35rem,5vw,3.25rem)] font-extrabold text-[#F4F5F7]">
        {title}
      </h1>
      {description && <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
    </header>
  )
}

export function AuthShell({
  children,
  mode = 'split',
  panelWidth = 'default',
  visualTitle = 'Partidos, planteles y análisis.',
}: AuthShellProps) {
  const panelClassName = cn(
    'relative w-full rounded-2xl border border-white/[0.08] bg-[#151922]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.42)] backdrop-blur-sm sm:p-8',
    panelWidth === 'wide' ? 'max-w-lg' : 'max-w-md',
  )

  if (mode === 'compact') {
    return (
      <main className="scout-product-theme relative flex min-h-screen overflow-hidden bg-[#0B0D12] px-4 py-20 text-foreground sm:px-6">
        <LoginCourtBackdrop variant="ambient" />
        <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-7"><AuthBrand /></div>
        <div className="relative z-10 m-auto flex w-full justify-center">
          <section className={panelClassName}>{children}</section>
        </div>
      </main>
    )
  }

  return (
    <main className="scout-product-theme grid min-h-screen overflow-hidden bg-[#0B0D12] text-foreground lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
      <section className="relative flex min-h-56 overflow-hidden border-b border-white/[0.07] bg-[#11151D] p-6 sm:min-h-64 sm:p-8 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-12">
        <LoginCourtBackdrop variant="visual" />
        <div className="relative z-10 flex w-full flex-col justify-between">
          <AuthBrand />
          <div className="max-w-2xl pb-2 lg:pb-8">
            <div className="mb-5 h-1 w-14 bg-[#FF6A1F]" />
            <p className="scout-display max-w-xl text-[clamp(2.7rem,7vw,5.8rem)] font-extrabold leading-[0.88] text-[#F4F5F7]">
              {visualTitle}
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center bg-[#0B0D12] px-4 py-8 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,106,31,0.08),transparent_35%)]" />
        <div className={panelClassName}>{children}</div>
      </section>
    </main>
  )
}
