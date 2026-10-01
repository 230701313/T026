import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  LogOut,
  CheckCircle,
  Search,
  PackageSearch,
  Shield,
  AlertCircle,
  Edit3,
  CheckCircle2,
  Phone,
  Loader2,
} from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import type { DashboardStats, Profile as ProfileType } from '@/types'

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [fullNameInput, setFullNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.allSettled([
      api.get<ProfileType>('/auth/me'),
      api.get<DashboardStats>('/dashboard/stats'),
    ]).then(([profileRes, statsRes]) => {
      if (!cancelled) {
        if (profileRes.status === 'fulfilled') {
          const prof = profileRes.value.data
          setProfile(prof)
          setFullNameInput(prof.full_name || '')
          setPhoneInput(prof.phone || '')
        } else {
          setError(profileRes.reason?.message || 'Could not load profile details.')
        }
        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data)
        }
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  function handleStartEditing() {
    setFullNameInput(profile?.full_name || user?.user_metadata?.full_name || '')
    setPhoneInput(profile?.phone || '')
    setEditError(null)
    setIsEditing(true)
  }

  function handleCancelEditing() {
    setIsEditing(false)
    setEditError(null)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!fullNameInput.trim()) {
      setEditError('Full name cannot be empty.')
      return
    }

    setSavingProfile(true)
    setEditError(null)
    try {
      const res = await api.patch<ProfileType>('/auth/me', {
        full_name: fullNameInput.trim(),
        phone: phoneInput.trim() || null,
      })
      setProfile(res.data)
      setIsEditing(false)
      setSuccessMsg('Profile updated successfully!')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'
  const userName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Member')

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        {/* Header */}
        <div className="border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Account Management
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span className="text-xs font-medium text-slate-400">Security &amp; Preferences</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            User Profile
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">
            View your authenticated identity, security credentials, and activity metrics.
          </p>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold">Success</p>
              <p className="text-xs text-emerald-300 mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold">Unable to load complete profile data</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Profile Card Showcase */}
        <Card className="p-6 sm:p-8 overflow-hidden relative shadow-[0_4px_24px_rgba(0,0,0,0.4)] border-slate-800/90 bg-[#121622]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-2xl font-extrabold text-white shadow-lg shadow-indigo-600/30 ring-4 ring-slate-800">
              {userInitial}
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-[#121622]" />
            </div>

            {/* Main Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-black text-white">{userName}</h2>
                <Badge variant="success" size="sm" dot>
                  Verified User
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 font-medium">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                {user?.email}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Supabase RLS Protected
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                </span>
              </div>
            </div>

            {/* Logout Action */}
            <div className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-rose-400 hover:bg-rose-950/40 hover:border-rose-500/40"
                icon={<LogOut className="h-4 w-4 text-rose-400" />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </Card>

        {/* Activity Summary Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">
            Activity Summary
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5 shadow-2xs border-slate-800/90 bg-[#121622]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Lost Reports</span>
                <Search className="h-4 w-4 text-rose-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                {loading ? <Skeleton className="h-7 w-12" /> : stats?.total_lost ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Belongings being tracked</p>
            </Card>

            <Card className="p-5 shadow-2xs border-slate-800/90 bg-[#121622]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Found Reports</span>
                <PackageSearch className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                {loading ? <Skeleton className="h-7 w-12" /> : stats?.total_found ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Items turned in for recovery</p>
            </Card>

            <Card className="p-5 shadow-2xs border-slate-800/90 bg-[#121622]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Recovered Items</span>
                <CheckCircle className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                {loading ? <Skeleton className="h-7 w-12" /> : stats?.recovered_items ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Successfully returned</p>
            </Card>
          </div>
        </div>

        {/* Account Details & Security Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Editable Contact Details */}
          <Card className="p-6 border-slate-800/90 bg-[#121622] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-400" />
                  Profile Details
                </h3>

                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditing}
                    className="text-xs text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-950/40"
                    icon={<Edit3 className="h-3.5 w-3.5 text-indigo-400" />}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              {editError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-950/40 p-2.5 text-xs text-rose-300 border border-rose-500/30">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{editError}</span>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-slate-800 bg-[#0c101a] p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="w-full rounded-xl border border-slate-800 bg-[#0c101a] p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-400 block mb-1">
                      Email Address (Auth Protected)
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full rounded-xl border border-slate-800 bg-[#0c101a]/60 p-2.5 text-xs text-slate-400 font-medium cursor-not-allowed opacity-80"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditing}
                      disabled={savingProfile}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={savingProfile}
                      icon={
                        savingProfile ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : undefined
                      }
                    >
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">Full Name</span>
                    <p className="text-slate-200 font-semibold text-sm">{userName}</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-500" />
                      Phone Number
                    </span>
                    <p className="text-slate-200 font-semibold text-sm">
                      {profile?.phone || <span className="text-slate-500 font-normal">Not provided</span>}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">Email Address</span>
                    <p className="text-slate-200 font-semibold text-sm">{user?.email}</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">User UUID</span>
                    <p className="font-mono text-slate-300 bg-[#0c101a] p-2 rounded-xl border border-slate-800 truncate">
                      {user?.id}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Security & Authentication */}
          <Card className="p-6 border-slate-800/90 bg-[#121622]">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              Security &amp; Encryption
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c101a] border border-slate-800">
                <div>
                  <p className="font-bold text-white">Token Verification</p>
                  <p className="text-slate-400 text-[11px] font-medium">Supabase Auth JWKS / ES256</p>
                </div>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c101a] border border-slate-800">
                <div>
                  <p className="font-bold text-white">Storage Protection</p>
                  <p className="text-slate-400 text-[11px] font-medium">RLS item-images bucket</p>
                </div>
                <Badge variant="success" size="sm">
                  Enforced
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c101a] border border-slate-800">
                <div>
                  <p className="font-bold text-white">API Connection</p>
                  <p className="text-slate-400 text-[11px] font-medium">Bearer Token Auth</p>
                </div>
                <Badge variant="success" size="sm">
                  Healthy
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
