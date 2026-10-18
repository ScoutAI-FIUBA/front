import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/partidos', label: 'Partidos' },
  { to: '/equipos', label: 'Equipos' },
  { to: '/jugadores', label: 'Jugadores' },
]

export interface AppShellOutletContext {
  setWorkspaceMode: (active: boolean) => void
}

export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useState(false)

  const userInitials = (user?.fullName ?? 'Analista')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={cn(
        'scout-product-theme min-h-screen bg-background text-foreground',
        workspaceMode && 'analysis-workspace-theme',
      )}
    >
      <header className="sticky top-0 z-40 border-b border-[#252B38] bg-[#0B0D12]/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] w-full max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="scout-display text-[28px] font-extrabold tracking-[-0.03em] text-[#F4F5F7]"
            onClick={() => setMenuOpen(false)}
            aria-label="ScoutAI · Inicio"
          >
            Scout<span className="text-[#FF6A1F]">AI</span>
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label }) => {
              const active = pathname === to || (to !== '/' && pathname.startsWith(`${to}/`))
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'relative rounded-full px-5 py-2.5 text-sm font-semibold transition-colors',
                    active
                      ? 'text-[#F4F5F7]'
                      : 'text-[#A3ABBA] hover:text-[#F4F5F7]',
                  )}
                >
                  {label}
                  {active ? (
                    <span className="absolute inset-x-5 -bottom-[18px] h-0.5 rounded-full bg-[#FF6A1F]" />
                  ) : null}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/cuenta"
              className="flex items-center gap-2 rounded-full border border-[#252B38] py-1.5 pl-1.5 pr-3 text-[#A3ABBA] transition-colors hover:border-[#3A4254] hover:text-[#F4F5F7]"
              aria-label={`Cuenta de ${user?.fullName ?? 'Analista'}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#252B38] text-xs font-bold text-[#FF9A68]">
                {userInitials}
              </span>
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#A3ABBA] transition-colors hover:bg-white/[0.06] hover:text-[#F4F5F7]"
              aria-label="Cerrar sesión"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#3A4254] text-[#F4F5F7] md:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-[#252B38] bg-[#11151D] px-4 py-4 md:hidden">
            <nav aria-label="Navegación móvil" className="mx-auto grid max-w-[1120px] gap-1">
              {navItems.map(({ to, label }) => {
                const active = pathname === to || (to !== '/' && pathname.startsWith(`${to}/`))
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'rounded-xl px-4 py-3 text-base font-semibold',
                      active ? 'bg-[#FF6A1F] text-white' : 'text-[#A3ABBA]',
                    )}
                  >
                    {label}
                  </Link>
                )
              })}
              <div className="mt-3 flex items-center justify-between border-t border-[#252B38] pt-4">
                <Link
                  to="/cuenta"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-semibold text-[#F4F5F7]"
                >
                  {user?.fullName ?? 'Mi cuenta'}
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#3A4254] px-4 text-sm font-semibold text-[#A3ABBA]"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Salir
                </button>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="min-w-0 overflow-x-hidden">
        <div
          className={cn(
            'mx-auto w-full px-4 sm:px-6',
            workspaceMode ? 'max-w-[1600px] py-3 sm:py-5' : 'max-w-[1120px]',
          )}
        >
          <Outlet context={{ setWorkspaceMode } satisfies AppShellOutletContext} />
        </div>
      </main>
    </div>
  )
}
