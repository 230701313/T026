import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Sparkles,
  CheckCircle2,
  Clock,
  Check,
  ArrowRight,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { api } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import type { AppNotification } from '@/types'

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'MATCHES'>('ALL')
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  function fetchNotifications() {
    setLoading(true)
    setError(null)
    api
      .get<AppNotification[]>('/notifications')
      .then((res) => {
        setNotifications(res.data || [])
      })
      .catch((err) => {
        setError(err.response?.data?.detail || err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err: any) {
      console.error('Failed to mark all read:', err)
    }
  }

  async function markSingleRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (err: any) {
      console.error('Failed to mark notification read:', err)
    }
  }

  async function handleConfirmMatch(notification: AppNotification) {
    if (!notification.match_id) return
    setActionInProgressId(notification.id)
    setError(null)
    try {
      await api.patch(`/matching/${notification.match_id}/confirm`)
      if (!notification.is_read) {
        await api.patch(`/notifications/${notification.id}/read`).catch(() => {})
      }
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, match_status: 'CONFIRMED', is_read: true }
            : n
        )
      )
      setSuccessBanner('Match confirmed directly from notifications!')
      setTimeout(() => setSuccessBanner(null), 4000)
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm match.')
    } finally {
      setActionInProgressId(null)
    }
  }

  async function handleRejectMatch(notification: AppNotification) {
    if (!notification.match_id) return
    setActionInProgressId(notification.id)
    setError(null)
    try {
      await api.patch(`/matching/${notification.match_id}/reject`)
      if (!notification.is_read) {
        await api.patch(`/notifications/${notification.id}/read`).catch(() => {})
      }
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, match_status: 'REJECTED', is_read: true }
            : n
        )
      )
      setSuccessBanner('Match rejected.')
      setTimeout(() => setSuccessBanner(null), 3000)
    } catch (err: any) {
      setError(err?.message || 'Failed to reject match.')
    } finally {
      setActionInProgressId(null)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read
    if (filter === 'MATCHES') return !!n.match_id
    return true
  })

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Activity Hub
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Notification Center
            </h1>
            <p className="mt-1 text-sm text-slate-400 font-medium">
              Stay informed with real-time AI match alerts and quick verification actions.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              icon={<Check className="h-3.5 w-3.5" />}
            >
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold">Success</p>
              <p className="text-xs text-emerald-300 mt-0.5">{successBanner}</p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold">Notification request failed</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center justify-between">
          <div className="inline-flex p-1 rounded-2xl border border-slate-800 bg-[#121622]">
            <button
              onClick={() => setFilter('ALL')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('MATCHES')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filter === 'MATCHES'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Matches
            </button>
          </div>

          <span className="text-xs text-slate-400 font-semibold">
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((item) => {
              const isMatch = !!item.match_id
              const isProcessing = actionInProgressId === item.id
              const isConfirmed = item.match_status === 'CONFIRMED'
              const isRejected = item.match_status === 'REJECTED'
              const isPotential = !item.match_status || item.match_status === 'POTENTIAL'

              return (
                <Card
                  key={item.id}
                  hover
                  className={`p-4 sm:p-5 transition-all border-slate-800/90 ${
                    !item.is_read
                      ? 'bg-indigo-950/20 ring-1 ring-indigo-500/30'
                      : 'bg-[#121622]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Left: Thumbnail or Icon */}
                    <div className="shrink-0">
                      {item.image_url ? (
                        <div className="h-14 w-14 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md">
                          <img
                            src={item.image_url}
                            alt="Match candidate"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-2xs ${
                            isMatch
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isMatch ? (
                            <Sparkles className="h-6 w-6" />
                          ) : (
                            <CheckCircle2 className="h-6 w-6" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{item.title}</span>
                            {!item.is_read && (
                              <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                            )}
                          </h3>
                          {isConfirmed && (
                            <Badge variant="success" size="sm">
                              Confirmed
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge variant="danger" size="sm">
                              Rejected
                            </Badge>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-medium">
                        {item.message}
                      </p>

                      {/* Quick Actions for Match Notifications */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 mt-3">
                        <div className="flex items-center gap-3">
                          {item.target_item_id ? (
                            <Link
                              to={`/matches/${item.target_item_id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                              onClick={() => {
                                if (!item.is_read) markSingleRead(item.id)
                              }}
                            >
                              <span>Inspect Matches</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <Link
                              to="/my-items"
                              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                              onClick={() => {
                                if (!item.is_read) markSingleRead(item.id)
                              }}
                            >
                              <span>View Reports</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}

                          {!item.is_read && (
                            <button
                              onClick={() => markSingleRead(item.id)}
                              className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                        </div>

                        {/* Inline Confirm / Reject Buttons for Matches */}
                        {isMatch && isPotential && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleRejectMatch(item)}
                              className="text-rose-400 hover:bg-rose-950/40 text-xs py-1 px-2.5 h-auto"
                              icon={<X className="h-3 w-3" />}
                            >
                              Not mine
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleConfirmMatch(item)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1 px-2.5 h-auto"
                              icon={
                                isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              }
                            >
                              {isProcessing ? 'Saving...' : 'This is mine'}
                            </Button>
                          </div>
                        )}

                        {/* Direct Claim Action for Confirmed Matches */}
                        {isMatch && isConfirmed && item.target_item_id && (
                          <Link to={`/matches/${item.target_item_id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 text-xs py-1 px-2.5 h-auto"
                              icon={<ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />}
                            >
                              Claim / Verify Item
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Bell className="h-7 w-7 text-indigo-400" />}
            title="All Caught Up"
            description="You have no notifications pending. Real-time updates and match alerts will appear here as items are reported."
          />
        )}
      </div>
    </AppLayout>
  )
}

