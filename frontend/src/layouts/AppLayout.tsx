import { type ReactNode, useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  PackageSearch,
  ClipboardList,
  Sparkles,
  Bell,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { AppNotification } from '@/types'
import { api } from '@/services/api'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/report/lost', label: 'Report Lost', icon: Search },
  { to: '/report/found', label: 'Report Found', icon: PackageSearch },
  { to: '/my-items', label: 'My Reports', icon: ClipboardList },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return
    let cancelled = false

    api
      .get<AppNotification[]>('/notifications')
      .then((res) => {
        if (!cancelled) {
          const unread = (res.data || []).filter((n) => !n.is_read).length
          setUnreadCount(unread)
        }
      })
      .catch(() => {
        // Non-fatal
      })

    return () => {
      cancelled = true
    }
  }, [user, location.pathname])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
    setUserDropdownOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'
  const userName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'User')

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-sans selection:bg-indigo-900 selection:text-white">
      {/* Deep Dark Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0c101a]/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="group flex items-center gap-2.5 font-bold text-white tracking-tight transition-transform active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all border border-indigo-400/20">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="text-base font-bold leading-none text-white flex items-center gap-1">
                Lost&amp;Found <span className="text-indigo-400">AI</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-[#121622] p-1 rounded-2xl border border-slate-800/90 shadow-inner">
            {NAV_ITEMS.map((item) => {
              const active =
                item.to === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.to)

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 shadow-2xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <item.icon
                    className={`h-3.5 w-3.5 transition-colors ${
                      active ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User & Actions Right */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Notification Bell */}
            <Link
              to="/notifications"
              className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-black text-white ring-2 ring-[#0c101a]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="h-5 w-px bg-slate-800" />

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#121622] p-1.5 pr-3 text-left shadow-2xs hover:border-slate-700 hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
                  {userInitial}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-200 leading-tight max-w-[120px] truncate">
                    {userName}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight max-w-[120px] truncate">
                    {user?.email}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-800 bg-[#141926] p-1.5 shadow-xl shadow-black/80 ring-1 ring-white/5 animate-in fade-in-0 zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white truncate">{userName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      Account Profile
                    </Link>
                    <Link
                      to="/my-items"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                      My Reports
                    </Link>
                    <Link
                      to="/notifications"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Bell className="h-3.5 w-3.5 text-slate-400" />
                      Notifications
                    </Link>
                  </div>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5 text-rose-400" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/notifications"
              className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-black text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 active:bg-slate-700 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="border-t border-slate-800 bg-[#0c101a] px-4 py-4 lg:hidden animate-in slide-in-from-top-2 duration-150">
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[#141926] p-3 border border-slate-800 shadow-2xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-2xs">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.to === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon
                      className={`h-4 w-4 ${active ? 'text-indigo-400' : 'text-slate-500'}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}

              <div className="border-t border-slate-800 my-2 pt-2">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-rose-400" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Deep Dark Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#0c101a] py-6 text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Lost&amp;Found AI</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Secure Supabase Auth
            </span>
            <span className="hidden md:inline">•</span>
            <span>FastAPI Backend</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
