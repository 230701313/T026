import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ImageOff,
  Loader2,
  MapPin,
  Calendar,
  Sparkles,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Check,
  X,
  User as UserIcon,
} from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import type { Item, ItemStatus, Claim } from '@/types'

const STATUS_OPTIONS: { value: ItemStatus; label: string; desc: string }[] = [
  { value: 'ACTIVE', label: 'Active', desc: 'Item is actively lost/found and open for matching' },
  { value: 'MATCHED', label: 'Matched', desc: 'Match identified and being verified' },
  { value: 'CLAIMED', label: 'Claimed', desc: 'Owner has verified ownership' },
  { value: 'RECOVERED', label: 'Recovered', desc: 'Item returned successfully' },
  { value: 'CLOSED', label: 'Closed', desc: 'Report resolved or cancelled' },
]

export default function ItemDetails() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusSuccess, setStatusSuccess] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  // Claims state (for item owners)
  const [claims, setClaims] = useState<Claim[]>([])
  const [loadingClaims, setLoadingClaims] = useState(false)
  const [claimActionId, setClaimActionId] = useState<string | null>(null)
  const [claimActionMsg, setClaimActionMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setNotFound(false)

    api
      .get<Item>(`/items/${id}`)
      .then((res) => {
        if (!cancelled) setItem(res.data)
      })
      .catch((err) => {
        if (cancelled) return
        const message: string = err?.message ?? ''
        if (message.toLowerCase().includes('not found')) {
          setNotFound(true)
        } else {
          setError(message || 'Something went wrong.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // Load claims if the current user owns this item
  useEffect(() => {
    if (!item || !user || item.user_id !== user.id) return

    let cancelled = false
    setLoadingClaims(true)
    api
      .get<Claim[]>(`/claims/item/${item.id}`)
      .then((res) => {
        if (!cancelled) setClaims(res.data || [])
      })
      .catch((err) => {
        console.warn('Could not load claims:', err?.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingClaims(false)
      })

    return () => {
      cancelled = true
    }
  }, [item, user])

  async function handleStatusChange(newStatus: ItemStatus) {
    if (!item) return
    setStatusError(null)
    setStatusSuccess(false)
    setUpdatingStatus(true)
    try {
      const res = await api.patch<Item>(`/items/${item.id}/status`, { status: newStatus })
      setItem(res.data)
      setStatusSuccess(true)
      setTimeout(() => setStatusSuccess(false), 3000)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleApproveClaim(claimId: string) {
    setClaimActionId(claimId)
    setClaimActionMsg(null)
    try {
      const res = await api.patch<Claim>(`/claims/${claimId}/approve`)
      setClaims((prev) => prev.map((c) => (c.id === claimId ? res.data : c)))
      if (item) setItem({ ...item, status: 'RECOVERED' })
      setClaimActionMsg('Claim approved! Item marked as Recovered.')
      setTimeout(() => setClaimActionMsg(null), 4000)
    } catch (err: any) {
      setClaimActionMsg(err?.message || 'Failed to approve claim.')
    } finally {
      setClaimActionId(null)
    }
  }

  async function handleRejectClaim(claimId: string) {
    setClaimActionId(claimId)
    setClaimActionMsg(null)
    try {
      const res = await api.patch<Claim>(`/claims/${claimId}/reject`)
      setClaims((prev) => prev.map((c) => (c.id === claimId ? res.data : c)))
      setClaimActionMsg('Claim declined.')
      setTimeout(() => setClaimActionMsg(null), 4000)
    } catch (err: any) {
      setClaimActionMsg(err?.message || 'Failed to decline claim.')
    } finally {
      setClaimActionId(null)
    }
  }

  const isOwner = !!item && !!user && item.user_id === user.id
  const isLost = item?.report_type === 'LOST'

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Reports</span>
          </button>

          {item && (
            <div className="flex items-center gap-2">
              <Badge variant={isLost ? 'danger' : 'success'} size="sm" dot>
                {item.report_type} Item
              </Badge>
              <StatusBadge status={item.status} size="sm" />
            </div>
          )}
        </div>

        {/* Loading View */}
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : notFound ? (
          /* Not Found View */
          <EmptyState
            icon={<AlertCircle className="h-8 w-8 text-amber-400" />}
            title="Report Not Found"
            description="This item report could not be found. It may have been removed or the link is invalid."
            action={
              <Link to="/my-items">
                <Button size="sm">Back to My Reports</Button>
              </Link>
            }
          />
        ) : error ? (
          /* Error View */
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold">Unable to load item details</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        ) : item ? (
          /* Main 2-Column Item Showcase */
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Column: Image & Photo Card (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <Card className="overflow-hidden p-0 border-slate-800 shadow-xl bg-[#121622]">
                <div className="relative h-80 sm:h-96 w-full bg-black flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600">
                      <ImageOff className="h-12 w-12 stroke-[1.5]" />
                      <span className="text-xs mt-2 font-medium">No photo attached</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md ${
                        isLost ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                    >
                      {item.report_type}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[#0c101a] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    Item Registered
                  </span>
                  <span>ID: {item.id.slice(0, 8)}...</span>
                </div>
              </Card>

              {/* Match CTA Link */}
              <Card className="p-5 border-slate-800 bg-[#121622] shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-bold text-white">Matches Hub</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Check potential matches filed for this {isLost ? 'lost' : 'found'} report.
                </p>
                <div className="mt-4">
                  <Link to={`/matches/${item.id}`} className="block">
                    <Button size="sm" className="w-full shadow-md shadow-indigo-600/20" icon={<Sparkles className="h-3.5 w-3.5" />}>
                      View Matches
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>

            {/* Right Column: Metadata & Status Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border-slate-800/90 bg-[#121622]">
                {/* Header info */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="default" size="sm" icon={<Tag className="h-3 w-3 text-slate-400" />}>
                        {item.category}
                      </Badge>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-slate-400 font-medium">
                        Reported {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h1 className="text-2xl font-black text-white tracking-tight">
                      {item.item_name}
                    </h1>
                  </div>

                  <StatusBadge status={item.status} size="md" />
                </div>

                {/* Description */}
                <div className="mt-5 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Item Description
                  </h3>
                  <div className="rounded-xl bg-[#0c101a] p-4 border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {item.description}
                  </div>
                </div>

                {/* Location & Date Details */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-[#0c101a] p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{isLost ? 'Last Seen Location' : 'Found Location'}</span>
                    </div>
                    <p className="text-sm font-bold text-white">{item.location}</p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0c101a] p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Date {isLost ? 'Lost' : 'Found'}</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {new Date(item.date_reported).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Owner Status Management Panel */}
                {isOwner && (
                  <div className="mt-8 border-t border-slate-800/80 pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Report Status Management
                      </label>
                      <span className="text-xs text-slate-500 font-medium">Owner Controls</span>
                    </div>

                    <p className="text-xs text-slate-400 mb-3 font-medium">
                      Update the status as your item moves from active search to recovery.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <select
                        value={item.status}
                        disabled={updatingStatus}
                        onChange={(e) => handleStatusChange(e.target.value as ItemStatus)}
                        className="rounded-xl border border-slate-800 bg-[#0c101a] px-3.5 py-2.5 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs disabled:opacity-60 cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} — {opt.desc}
                          </option>
                        ))}
                      </select>

                      {updatingStatus && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      )}

                      {statusSuccess && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-in fade-in duration-200">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Status updated!</span>
                        </div>
                      )}
                    </div>

                    {statusError && (
                      <p className="mt-2 text-xs font-semibold text-rose-400">{statusError}</p>
                    )}
                  </div>
                )}
              </Card>

              {/* Ownership Verification Claims Management (for Owner) */}
              {isOwner && (
                <Card className="p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border-slate-800/90 bg-[#121622]">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-indigo-400" />
                      <h3 className="text-base font-bold text-white">
                        Ownership Claims ({claims.length})
                      </h3>
                    </div>
                    <Badge variant="default" size="sm">
                      {claims.filter((c) => c.status === 'PENDING').length} Pending Review
                    </Badge>
                  </div>

                  {claimActionMsg && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-950/40 p-3 text-xs text-indigo-300 border border-indigo-500/30">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                      <span>{claimActionMsg}</span>
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    {loadingClaims ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                      </div>
                    ) : claims.length > 0 ? (
                      claims.map((claim) => {
                        const isPending = claim.status === 'PENDING'
                        const isProcessing = claimActionId === claim.id
                        return (
                          <div
                            key={claim.id}
                            className="rounded-xl border border-slate-800 bg-[#0c101a] p-4 text-xs space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-bold text-white">
                                  {claim.claimant_name || `Claimant ${claim.claimant_id.slice(0, 8)}`}
                                </span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400">
                                  {new Date(claim.created_at).toLocaleDateString()}
                                </span>
                              </div>

                              <Badge
                                variant={
                                  claim.status === 'APPROVED'
                                    ? 'success'
                                    : claim.status === 'REJECTED'
                                    ? 'danger'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {claim.status}
                              </Badge>
                            </div>

                            <div className="rounded-lg bg-[#141926] p-3 text-slate-300 whitespace-pre-wrap font-medium leading-relaxed border border-slate-800/80">
                              {claim.verification_details}
                            </div>

                            {isPending && (
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isProcessing}
                                  onClick={() => handleRejectClaim(claim.id)}
                                  className="text-rose-400 hover:bg-rose-950/40"
                                  icon={<X className="h-3.5 w-3.5" />}
                                >
                                  Decline Claim
                                </Button>

                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={isProcessing}
                                  onClick={() => handleApproveClaim(claim.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                  icon={
                                    isProcessing ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )
                                  }
                                >
                                  {isProcessing ? 'Processing...' : 'Approve Ownership'}
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-slate-400 py-2 font-medium">
                        No ownership verification claims have been submitted for this item yet.
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
