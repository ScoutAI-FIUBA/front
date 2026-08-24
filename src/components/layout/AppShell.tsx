import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  House,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const navGroups = [
  {
    label: null,
    items: [{ to: '/dashboard', label: 'Inicio', icon: House }],
  },
  {
    label: 'Trabajo',
    items: [
      { to: '/analisis', label: 'Análisis', icon: BarChart3 },
      { to: '/partidos', label: 'Partidos', icon: CalendarDays },
    ],
  },
  {
    label: 'Material',
    items: [{ to: '/videos', label: 'Videos', icon: Video }],
  },
  {
    label: 'Scouting',
    items: [
      { to: '/equipos', label: 'Equipos', icon: Users },
      { to: '/jugadores', label: 'Jugadores', icon: UserCheck },
    ],
  },
]

const navItems = navGroups.flatMap((group) => group.items)

export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentSection = navItems.find((item) => pathname.startsWith(item.to))?.label ?? 'ScoutAI'
  const userInitials = (user?.fullName ?? 'Analista')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] lg:hidden"
          aria-label="Cerrar navegación"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-surface shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            <span>
              <span className="block text-base font-bold leading-tight text-foreground">ScoutAI</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Video intelligence
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-primary lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <Button
            className="w-full"
            onClick={() => {
              setSidebarOpen(false)
              navigate('/analisis/nuevo')
            }}
          >
            <Plus className="h-4 w-4" /> Empezar análisis
          </Button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3 pt-5">
          {navGroups.map((group, groupIndex) => (
            <div key={group.label ?? 'inicio'}>
              {group.label && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon }) => {
                  const active = pathname === to || pathname.startsWith(`${to}/`)
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary-subtle text-primary'
                          : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                      {label}
                    </Link>
                  )
                })}
              </div>
              {groupIndex === 0 && <div className="mt-5 border-t" />}
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-xl border bg-background/70 p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-primary">
              {userInitials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user?.fullName ?? 'Analista'}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                {user?.role === 'analyst' ? 'Scout' : user?.role}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg border bg-surface p-2 text-muted-foreground hover:bg-surface-subtle hover:text-primary lg:hidden"
              aria-label="Abrir menú"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{currentSection}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                ScoutAI · Plataforma de análisis deportivo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="hidden items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary sm:flex lg:hidden"
            >
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
