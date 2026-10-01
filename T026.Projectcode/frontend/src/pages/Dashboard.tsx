import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  PackageSearch,
  ClipboardList,
  Sparkles,
  AlertCircle,
  ImageOff,
  Inbox,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { DashboardStats, Item } from '@/types'

function getTimeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [recentItems, setRecentItems] = useState<Item[] | null>(null)
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api
      .get<DashboardStats>('/dashboard/stats')
      .then((res) => {
        if (!cancelled) setStats(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setRecentLoading(true)
    setRecentError(null)

    api
      .get<Item[]>('/items/mine')
      .then((res) => {
        if (!cancelled) setRecentItems(res.data.slice(0, 5))
      })
      .catch((err) => {
        if (!cancelled) setRecentError(err.message)
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const displayName =
    user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'there')

  const statCards = [
    {
      label: 'Total Lost Reports',
      value: stats?.total_lost,
      description: 'Items actively being tracked',
      icon: Search,
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      text: 'text-rose-400',
    },
    {
      label: 'Total Found Reports',
      value: stats?.total_found,
      description: 'Items awaiting owners',
      icon: PackageSearch,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
      text: 'text-emerald-400',
    },
    {
      label: 'Potential Matches',
      value: stats?.potential_matches,
      description: 'Calculated matching pairs',
      icon: Sparkles,
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/25',
      text: 'text-purple-400',
    },
    {
      label: 'Recovered Items',
      value: stats?.recovered_items,
      description: 'Successfully reunited items',
      icon: CheckCircle,
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/25',
      text: 'text-cyan-400',
    },
  ]

  const quickActions = [
    {
      to: '/report/lost',
      title: 'Report Lost Item',
      desc: 'Lost something? File a report with photos & location',
      icon: Search,
      iconColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      btnText: 'Report Lost',
    },
    {
      to: '/report/found',
      title: 'Report Found Item',
      desc: 'Found an item? Post details to reach the owner',
      icon: PackageSearch,
      iconColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      btnText: 'Report Found',
    },
    {
      to: '/my-items',
      title: 'My Reports Hub',
      desc: 'Track status, update records, and verify items',
      icon: ClipboardList,
      iconColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      btnText: 'View Reports',
    },
    {
      to: '/notifications',
      title: 'Notification Center',
      desc: 'Review automated alerts and activity updates',
      icon: Sparkles,
      iconColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      btnText: 'View Alerts',
    },
  ]

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Overview Dashboard
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {getTimeOfDayGreeting()}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">
            Here's an overview of your lost &amp; found items and recovery activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/report/lost">
            <Button size="sm" icon={<Search className="h-4 w-4" />}>
              Report Lost
            </Button>
          </Link>
          <Link to="/report/found">
            <Button
              variant="outline"
              size="sm"
              icon={<PackageSearch className="h-4 w-4 text-indigo-400" />}
            >
              Report Found
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300 shadow-xs">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <p className="font-bold">Unable to fetch dashboard statistics</p>
            <p className="mt-0.5 text-xs text-rose-300">{error}</p>
          </div>
        </div>
      )}

      {/* 4 Stat Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} hover className="p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {card.label}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.bg} ${card.text} border ${card.border} shadow-2xs`}
              >
                <card.icon className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-3">
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-black text-white tracking-tight">
                  {card.value ?? 0}
                </div>
              )}
              <p className="mt-1 text-xs text-slate-400 font-medium">{card.description}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Action Navigation */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="group rounded-2xl border border-slate-800/90 bg-[#121622] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:border-slate-700 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${action.iconColor} mb-3.5 shadow-2xs group-hover:scale-105 transition-transform`}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {action.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed font-medium">{action.desc}</p>
              </div>

              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-400">
                <span>{action.btnText}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 2-Column Split: Recent Reports & Potential Matches */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recent Reports (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Recent Reports</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Latest items submitted by your account
                </p>
              </div>
              {recentItems && recentItems.length > 0 && (
                <Link to="/my-items">
                  <Button variant="ghost" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                    View All
                  </Button>
                </Link>
              )}
            </CardHeader>

            <CardContent className="flex-1 p-0">
              {recentError && (
                <div className="m-5 flex items-start gap-2 rounded-xl bg-rose-950/40 p-3 text-xs text-rose-300 border border-rose-500/30">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>Couldn't load recent reports: {recentError}</span>
                </div>
              )}

              {recentLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : recentItems && recentItems.length > 0 ? (
                <div className="divide-y divide-slate-800/70">
                  {recentItems.map((item) => (
                    <Link
                      key={item.id}
                      to={`/items/${item.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xs">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.item_name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-500">
                            <ImageOff className="h-5 w-5" />
                          </div>
                        )}
                        <span
                          className={`absolute top-0.5 left-0.5 rounded px-1 text-[9px] font-bold uppercase text-white ${
                            item.report_type === 'LOST' ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        >
                          {item.report_type}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {item.item_name}
                          </p>
                          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 shrink-0 border border-slate-700">
                            {item.category}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400 font-medium">
                          <span className="flex items-center gap-1 truncate max-w-[140px]">
                            <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                            {item.location}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {new Date(item.date_reported).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="shrink-0">
                        <StatusBadge status={item.status} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 mb-3 border border-slate-700">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No reports recorded yet</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs font-medium">
                    Start by submitting a lost or found item report to begin tracking.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link to="/report/lost">
                      <Button size="sm">Report Item</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Potential Matches (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div>
                <CardTitle>Potential Matches</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Matching item pairs
                </p>
              </div>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-slate-700">
                {stats?.potential_matches ?? 0} Matches
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 mb-3 border border-slate-700">
                <Sparkles className="h-6 w-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-white">
                No potential matches at this time
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
                When complementary lost and found reports are filed and matched, they will appear here.
              </p>
              <div className="mt-5">
                <Link to="/my-items">
                  <Button variant="outline" size="sm">
                    View My Reports
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
