import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  ArrowLeft,
  AlertCircle,
  ImageOff,
  MapPin,
  Calendar,
  Eye,
  Inbox,
  RefreshCw,
  Camera,
  FileText,
  Clock,
  Check,
  X,
  ShieldCheck,
  Send,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { api } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import type { Item, Match, MatchingConfig } from '@/types'

export default function Matches() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [targetItem, setTargetItem] = useState<Item | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [matchingConfig, setMatchingConfig] = useState<MatchingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Action in progress state (match ID being confirmed or rejected)
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)

  // Claim modal state
  const [claimingItem, setClaimingItem] = useState<Item | null>(null)
  const [submittingClaim, setSubmittingClaim] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [claimForm, setClaimForm] = useState({
    uniqueMarks: '',
    contents: '',
    timeLocation: '',
    additionalNotes: '',
  })

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.allSettled([
      api.get<Item>(`/items/${id}`),
      api.get<Match[]>(`/matching/item/${id}`),
      api.get<MatchingConfig>('/matching/config'),
    ])
      .then(([itemRes, matchRes, configRes]) => {
        if (!cancelled) {
          if (itemRes.status === 'fulfilled') {
            setTargetItem(itemRes.value.data)
          } else {
            setError(itemRes.reason?.message || 'Item not found.')
          }

          if (matchRes.status === 'fulfilled') {
            setMatches(matchRes.value.data || [])
          }

          if (configRes.status === 'fulfilled') {
            setMatchingConfig(configRes.value.data)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleRecalculate() {
    if (!id) return
    setRecalculating(true)
    setError(null)
    try {
      const res = await api.post<Match[]>(`/matching/recalculate/${id}`)
      setMatches(res.data || [])
      setSuccessBanner('Matches successfully recalculated!')
      setTimeout(() => setSuccessBanner(null), 4000)
    } catch (err: any) {
      setError(err?.message || 'Failed to recalculate matches.')
    } finally {
      setRecalculating(false)
    }
  }

  async function handleConfirmMatch(matchId: string) {
    setActionInProgressId(matchId)
    setError(null)
    try {
      const res = await api.patch<Match>(`/matching/${matchId}/confirm`)
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? { ...m, match_status: 'CONFIRMED', matched_item: res.data.matched_item || m.matched_item }
            : m
        )
      )
      if (targetItem) {
        setTargetItem({ ...targetItem, status: 'MATCHED' })
      }
      setSuccessBanner('Match confirmed! Item status has been set to Matched.')
      setTimeout(() => setSuccessBanner(null), 4000)
    } catch (err: any) {
      setError(err?.message || 'Could not confirm match.')
    } finally {
      setActionInProgressId(null)
    }
  }

  async function handleRejectMatch(matchId: string) {
    setActionInProgressId(matchId)
    setError(null)
    try {
      await api.patch<Match>(`/matching/${matchId}/reject`)
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, match_status: 'REJECTED' } : m))
      )
      setSuccessBanner('Match rejected.')
      setTimeout(() => setSuccessBanner(null), 3000)
    } catch (err: any) {
      setError(err?.message || 'Could not reject match.')
    } finally {
      setActionInProgressId(null)
    }
  }

  function openClaimModal(candidateItem: Item) {
    setClaimingItem(candidateItem)
    setClaimError(null)
    setClaimSuccess(false)
    setClaimForm({
      uniqueMarks: '',
      contents: '',
      timeLocation: '',
      additionalNotes: '',
    })
  }

  function closeClaimModal() {
    setClaimingItem(null)
    setClaimError(null)
    setClaimSuccess(false)
  }

  async function handleSubmitClaim(e: React.FormEvent) {
    e.preventDefault()
    if (!claimingItem) return

    const verificationSummary = [
      claimForm.uniqueMarks.trim() && `Unique Features/Marks: ${claimForm.uniqueMarks.trim()}`,
      claimForm.contents.trim() && `Contents/Accessories: ${claimForm.contents.trim()}`,
      claimForm.timeLocation.trim() && `Time & Specific Location: ${claimForm.timeLocation.trim()}`,
      claimForm.additionalNotes.trim() && `Additional Verification: ${claimForm.additionalNotes.trim()}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    if (!verificationSummary.trim()) {
      setClaimError('Please provide at least one verification detail to prove ownership.')
      return
    }

    setSubmittingClaim(true)
    setClaimError(null)

    try {
      await api.post('/claims', {
        item_id: claimingItem.id,
        verification_details: verificationSummary,
      })
      setClaimSuccess(true)
      setTimeout(() => {
        closeClaimModal()
        setSuccessBanner('Ownership verification claim submitted! The reporter will review your details.')
        setTimeout(() => setSuccessBanner(null), 5000)
      }, 1500)
    } catch (err: any) {
      setClaimError(err?.message || 'Failed to submit ownership claim.')
    } finally {
      setSubmittingClaim(false)
    }
  }

  const strongThreshold = matchingConfig?.match_threshold_strong ?? 80
  const possibleThreshold = matchingConfig?.match_threshold_possible ?? 60

  function getScoreBadgeColor(score: number) {
    if (score >= strongThreshold) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    if (score >= possibleThreshold) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 pt-2 pb-12">
        {/* Header with breadcrumb spacing */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Reports</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                AI Multi-Modal Hub
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Item Match Results
            </h1>
            <p className="mt-1 text-sm text-slate-400 font-medium">
              Multi-modal similarity matches computed using CLIP Vision + NLP semantics + spatio-temporal decay.
            </p>
          </div>

          {targetItem && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculating}
              icon={
                <RefreshCw
                  className={`h-3.5 w-3.5 text-indigo-400 ${
                    recalculating ? 'animate-spin' : ''
                  }`}
                />
              }
            >
              {recalculating ? 'Scanning Database...' : 'Recalculate Matches'}
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
              <p className="font-bold">Unable to process matching request</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Dynamic Match Category Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0c101a] p-3.5 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-semibold">
            <Info className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Match Confidence Legend:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/25 text-emerald-300 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Strong Match (≥{strongThreshold}%)</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 border border-indigo-500/25 text-indigo-300 font-bold">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span>Possible Match ({possibleThreshold}–{strongThreshold - 1}%)</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 border border-amber-500/25 text-amber-300 font-bold">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Low Match (&lt;{possibleThreshold}%)</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : targetItem ? (
          <div className="space-y-6">
            {/* Target Item Overview Card */}
            <Card className="p-5 border-slate-800 bg-[#121622] shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xs">
                  {targetItem.image_url ? (
                    <img
                      src={targetItem.image_url}
                      alt={targetItem.item_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}
                  <span
                    className={`absolute top-0.5 left-0.5 rounded px-1 text-[8px] font-bold uppercase text-white ${
                      targetItem.report_type === 'LOST' ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}
                  >
                    {targetItem.report_type}
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white truncate">
                      {targetItem.item_name}
                    </h2>
                    <StatusBadge status={targetItem.status} size="sm" />
                    <Badge variant="default" size="sm">
                      {targetItem.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 font-medium">
                    {targetItem.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {targetItem.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      {new Date(targetItem.date_reported).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link to={`/items/${targetItem.id}`}>
                    <Button variant="outline" size="sm" icon={<Eye className="h-3.5 w-3.5" />}>
                      View Item
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Matches Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">
                    Matched Candidates ({matches.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Ranked by 4-factor hybrid confidence
                </span>
              </div>

              {matches.length > 0 ? (
                <div className="grid gap-5">
                  {matches.map((match) => {
                    const candidate = match.matched_item
                    const isProcessing = actionInProgressId === match.id
                    const isConfirmed = match.match_status === 'CONFIRMED'
                    const isRejected = match.match_status === 'REJECTED'
                    const isPotential = match.match_status === 'POTENTIAL'
                    const canClaim =
                      candidate &&
                      (isConfirmed || match.final_score >= strongThreshold)

                    return (
                      <Card
                        key={match.id}
                        className={`p-6 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${
                          isConfirmed
                            ? 'border-emerald-500/40 bg-[#0f1b18]'
                            : isRejected
                            ? 'border-slate-800 bg-[#121622] opacity-75'
                            : 'border-slate-800 bg-[#121622] hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          {/* Candidate Left: Image & Info */}
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-md">
                              {candidate?.image_url ? (
                                <img
                                  src={candidate.image_url}
                                  alt={candidate.item_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-600">
                                  <ImageOff className="h-6 w-6" />
                                </div>
                              )}
                              <span
                                className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-xs ${
                                  candidate?.report_type === 'LOST'
                                    ? 'bg-rose-600'
                                    : 'bg-emerald-600'
                                }`}
                              >
                                {candidate?.report_type || 'MATCH'}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-white truncate">
                                  {candidate?.item_name || 'Matched Item'}
                                </h3>
                                {candidate && <StatusBadge status={candidate.status} size="sm" />}
                                {isConfirmed && (
                                  <Badge variant="success" size="sm" dot>
                                    Confirmed Match
                                  </Badge>
                                )}
                                {isRejected && (
                                  <Badge variant="danger" size="sm">
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-medium">
                                {candidate?.description || 'No description provided.'}
                              </p>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium pt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-500" />
                                  {candidate?.location || 'Unknown Location'}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-500" />
                                  {candidate?.date_reported
                                    ? new Date(candidate.date_reported).toLocaleDateString()
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Overall Score Badge */}
                          <div className="flex flex-col items-end shrink-0">
                            <div
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-black text-sm ${getScoreBadgeColor(
                                match.final_score
                              )}`}
                            >
                              <Sparkles className="h-4 w-4" />
                              <span>{match.final_score}% Match</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
                              {match.final_score >= strongThreshold
                                ? 'Strong Match'
                                : match.final_score >= possibleThreshold
                                ? 'Possible Match'
                                : 'Low Match'}
                            </span>
                          </div>
                        </div>

                        {/* Multi-Modal Breakdown Progress Bars with Weights & Descriptions */}
                        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {/* Image Match */}
                          <div
                            className="rounded-xl bg-[#0c101a] p-3 border border-slate-800/80 group/metric"
                            title="CLIP ViT-B/32 vision embedding cosine similarity (45% weight)"
                          >
                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                              <span className="flex items-center gap-1 text-[11px] font-semibold">
                                <Camera className="h-3 w-3 text-indigo-400" /> Vision (45%)
                              </span>
                              <span className="font-bold text-white">
                                {match.image_similarity}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${Math.min(100, match.image_similarity)}%` }}
                              />
                            </div>
                          </div>

                          {/* Text Match */}
                          <div
                            className="rounded-xl bg-[#0c101a] p-3 border border-slate-800/80 group/metric"
                            title="SBERT all-MiniLM-L6-v2 text embedding cosine similarity (35% weight)"
                          >
                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                              <span className="flex items-center gap-1 text-[11px] font-semibold">
                                <FileText className="h-3 w-3 text-violet-400" /> Text Semantics (35%)
                              </span>
                              <span className="font-bold text-white">{match.text_similarity}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-violet-500"
                                style={{ width: `${Math.min(100, match.text_similarity)}%` }}
                              />
                            </div>
                          </div>

                          {/* Location Match */}
                          <div
                            className="rounded-xl bg-[#0c101a] p-3 border border-slate-800/80 group/metric"
                            title="Token set fuzzy string similarity (10% weight)"
                          >
                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                              <span className="flex items-center gap-1 text-[11px] font-semibold">
                                <MapPin className="h-3 w-3 text-cyan-400" /> Location (10%)
                              </span>
                              <span className="font-bold text-white">
                                {match.location_similarity}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-cyan-500"
                                style={{ width: `${Math.min(100, match.location_similarity)}%` }}
                              />
                            </div>
                          </div>

                          {/* Date Match */}
                          <div
                            className="rounded-xl bg-[#0c101a] p-3 border border-slate-800/80 group/metric"
                            title="Exponential temporal proximity decay (10% weight)"
                          >
                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                              <span className="flex items-center gap-1 text-[11px] font-semibold">
                                <Clock className="h-3 w-3 text-emerald-400" /> Date Decay (10%)
                              </span>
                              <span className="font-bold text-white">{match.date_similarity}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(100, match.date_similarity)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Match Actions & Controls */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                          <div className="flex items-center gap-2">
                            {candidate && (
                              <Link to={`/items/${candidate.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<Eye className="h-3.5 w-3.5" />}
                                >
                                  View Details
                                </Button>
                              </Link>
                            )}

                            {canClaim && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openClaimModal(candidate)}
                                className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                                icon={<ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />}
                              >
                                Claim this item
                              </Button>
                            )}
                          </div>

                          {/* Confirm / Reject Buttons */}
                          {isPotential && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleRejectMatch(match.id)}
                                className="text-rose-400 hover:bg-rose-950/40 hover:border-rose-500/40"
                                icon={<X className="h-3.5 w-3.5" />}
                              >
                                Not a match
                              </Button>

                              <Button
                                variant="primary"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleConfirmMatch(match.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                                icon={
                                  isProcessing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )
                                }
                              >
                                {isProcessing ? 'Updating...' : 'This is mine'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card className="p-8 text-center border-slate-800 bg-[#121622]">
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 mb-3 border border-slate-700">
                      <Inbox className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      No matches found for this item yet
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-400 max-w-sm leading-relaxed font-medium">
                      As complementary{' '}
                      {targetItem.report_type === 'LOST' ? 'found' : 'lost'} items are reported,
                      AI-generated matches will appear here automatically.
                    </p>
                    <div className="mt-5 flex gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRecalculate}
                        disabled={recalculating}
                        icon={
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`}
                          />
                        }
                      >
                        {recalculating ? 'Recalculating...' : 'Scan For Matches'}
                      </Button>
                      <Link to="/my-items">
                        <Button variant="ghost" size="sm">
                          Back to My Reports
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles className="h-7 w-7 text-indigo-400" />}
            title="Select an Item to View Matches"
            description="Go to My Reports and click on any reported item to inspect its matching candidates."
            action={
              <Link to="/my-items">
                <Button size="sm">Go to My Reports</Button>
              </Link>
            }
          />
        )}

        {/* Ownership Claim Modal */}
        {claimingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#141926] p-6 shadow-2xl shadow-black/80 space-y-5">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Verify Ownership Claim
                    </h3>
                    <p className="text-xs text-slate-400 truncate max-w-xs">
                      Claiming: {claimingItem.item_name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeClaimModal}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium bg-[#0c101a] p-3 rounded-xl border border-slate-800">
                To protect rightful owners, please specify non-public identifying details. The item reporter will review your submission before releasing the item.
              </p>

              {claimError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-950/40 p-3 text-xs text-rose-300 border border-rose-500/30">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{claimError}</span>
                </div>
              )}

              {claimSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-in zoom-in" />
                  <p className="text-sm font-bold text-white">Claim Submitted Successfully!</p>
                  <p className="text-xs text-slate-400">The reporter has been notified to verify your claim.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitClaim} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      1. Unique Marks, Engravings, or Serial Numbers
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Scratches on bottom, blue sticker, engraving initials..."
                      value={claimForm.uniqueMarks}
                      onChange={(e) =>
                        setClaimForm({ ...claimForm, uniqueMarks: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-800 bg-[#0c101a] p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      2. Contents or Internal Items
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3 keys on ring, USB drive inside pocket, student ID card name..."
                      value={claimForm.contents}
                      onChange={(e) => setClaimForm({ ...claimForm, contents: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-[#0c101a] p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      3. Approximate Time &amp; Specific Spot Lost/Found
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Around 2:30 PM near 2nd floor library bench..."
                      value={claimForm.timeLocation}
                      onChange={(e) =>
                        setClaimForm({ ...claimForm, timeLocation: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-800 bg-[#0c101a] p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      4. Additional Verification Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any additional notes or preferred contact info..."
                      value={claimForm.additionalNotes}
                      onChange={(e) =>
                        setClaimForm({ ...claimForm, additionalNotes: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-800 bg-[#0c101a] p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={closeClaimModal}
                      disabled={submittingClaim}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={submittingClaim}
                      icon={
                        submittingClaim ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {submittingClaim ? 'Submitting Claim...' : 'Submit Claim'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

