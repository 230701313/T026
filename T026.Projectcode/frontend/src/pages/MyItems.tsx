import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ImageOff,
  Search,
  PackageSearch,
  Plus,
  MapPin,
  Calendar,
  Eye,
} from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { api } from '@/services/api'
import type { Item, ReportType } from '@/types'

export default function MyItems() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab: ReportType = searchParams.get('type') === 'FOUND' ? 'FOUND' : 'LOST'

  const [tab, setTab] = useState<ReportType>(initialTab)
  const [items, setItems] = useState<Item[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api
      .get<Item[]>('/items/mine', { params: { report_type: tab } })
      .then((res) => {
        if (!cancelled) setItems(res.data)
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
  }, [tab])

  function switchTab(next: ReportType) {
    setTab(next)
    setSearchParams({ type: next })
    setSearchQuery('')
    setSelectedCategory('ALL')
  }

  // Filter items based on search query and category
  const filteredItems = useMemo(() => {
    if (!items) return []
    return items.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [items, searchQuery, selectedCategory])

  // Extract unique categories in current tab
  const availableCategories = useMemo(() => {
    if (!items) return []
    const cats = new Set<string>()
    items.forEach((item) => cats.add(item.category))
    return Array.from(cats)
  }, [items])

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Item Management
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span className="text-xs font-medium text-slate-400">Your Reports</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              My Reports
            </h1>
            <p className="mt-1 text-sm text-slate-400 font-medium">
              Manage and track all of your reported lost and found items.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to={tab === 'LOST' ? '/report/lost' : '/report/found'}>
              <Button
                size="md"
                icon={<Plus className="h-4 w-4" />}
                className="shadow-lg shadow-indigo-600/25"
              >
                Report {tab === 'LOST' ? 'Lost Item' : 'Found Item'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Segmented Tab */}
          <div className="inline-flex p-1 rounded-2xl border border-slate-800 bg-[#121622] w-fit">
            <button
              onClick={() => switchTab('LOST')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
                tab === 'LOST'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Lost Items</span>
              {tab === 'LOST' && items && (
                <span className="ml-1 rounded-full bg-rose-500/30 px-2 py-0.2 text-xs font-bold text-rose-300">
                  {items.length}
                </span>
              )}
            </button>

            <button
              onClick={() => switchTab('FOUND')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
                tab === 'FOUND'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PackageSearch className="h-4 w-4" />
              <span>Found Items</span>
              {tab === 'FOUND' && items && (
                <span className="ml-1 rounded-full bg-emerald-500/30 px-2 py-0.2 text-xs font-bold text-emerald-300">
                  {items.length}
                </span>
              )}
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-[#121622] pl-10 pr-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs font-medium"
              />
            </div>

            {availableCategories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-slate-800 bg-[#121622] px-3 py-2 text-xs sm:text-sm font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Global Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold">Unable to retrieve reports</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Grid */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden p-0">
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          /* Cards Grid */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                hover
                className="group flex flex-col justify-between overflow-hidden border-slate-800/90 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:border-slate-700"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden border-b border-slate-800">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.item_name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-600">
                        <ImageOff className="h-8 w-8" />
                      </div>
                    )}

                    {/* Category badge overlay */}
                    <span className="absolute top-3 left-3 rounded-lg bg-black/80 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-slate-200 border border-slate-700/80 shadow-2xs">
                      {item.category}
                    </span>

                    {/* Status badge top right */}
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {item.item_name}
                    </h3>

                    <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">
                      {item.description}
                    </p>

                    <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Reported: {new Date(item.date_reported).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-5 pb-5 pt-0">
                  <Link to={`/items/${item.id}`} className="block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full group-hover:border-slate-600 group-hover:bg-slate-800"
                      icon={<Eye className="h-3.5 w-3.5" />}
                    >
                      View Report Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : items && items.length > 0 && searchQuery ? (
          /* Search Empty State */
          <EmptyState
            title="No matching reports found"
            description={`No items match your search filter "${searchQuery}". Try searching with a different keyword.`}
            action={
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            }
          />
        ) : (
          /* Tab Empty State */
          <EmptyState
            icon={tab === 'LOST' ? <Search className="h-7 w-7" /> : <PackageSearch className="h-7 w-7" />}
            title={`No ${tab === 'LOST' ? 'lost' : 'found'} items reported yet`}
            description={
              tab === 'LOST'
                ? "Lost your wallet, keys, or device? File a quick report and start tracking."
                : 'Found an item on campus or in public? Report it so we can help return it to its owner.'
            }
            action={
              <Link to={tab === 'LOST' ? '/report/lost' : '/report/found'}>
                <Button size="md" icon={<Plus className="h-4 w-4" />}>
                  Report {tab === 'LOST' ? 'a Lost' : 'a Found'} Item
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </AppLayout>
  )
}
