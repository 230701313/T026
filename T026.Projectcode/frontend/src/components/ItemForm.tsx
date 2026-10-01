import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type DragEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  X,
  UploadCloud,
  MapPin,
  Calendar,
  Sparkles,
  Smartphone,
  Watch,
  FileText,
  Glasses,
  Shirt,
  BookOpen,
  Key,
  Briefcase,
  Layers,
  ShieldCheck,
  Eye,
} from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { uploadItemImage } from '@/utils/imageUpload'
import {
  ITEM_CATEGORIES,
  MAX_IMAGE_SIZE_MB,
  isFormValid,
  validateItemForm,
  type ItemFormErrors,
  type ItemFormValues,
} from '@/utils/itemValidation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Item, ItemCategory, ReportType } from '@/types'

function emptyValues(): ItemFormValues {
  return {
    item_name: '',
    category: '',
    description: '',
    location: '',
    date_reported: new Date().toISOString().slice(0, 10),
    imageFile: null,
  }
}

const CATEGORY_ICONS: Record<ItemCategory, typeof Smartphone> = {
  Electronics: Smartphone,
  'Personal Items': Watch,
  Documents: FileText,
  Accessories: Glasses,
  Clothing: Shirt,
  Books: BookOpen,
  Keys: Key,
  Bags: Briefcase,
  Other: Layers,
}

interface ItemFormProps {
  reportType: ReportType
}

type SubmitStage = 'idle' | 'uploading' | 'saving'

export function ItemForm({ reportType }: ItemFormProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [values, setValues] = useState<ItemFormValues>(emptyValues)
  const [errors, setErrors] = useState<ItemFormErrors>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [stage, setStage] = useState<SubmitStage>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<Item | null>(null)

  const isLost = reportType === 'LOST'
  const busy = stage !== 'idle'

  function updateField<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    processFile(file)
  }

  function processFile(file: File | null) {
    if (!file) return
    updateField('imageFile', file)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!busy) setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (busy) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  function clearImage() {
    updateField('imageFile', null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function resetForm() {
    setValues(emptyValues())
    setErrors({})
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const validationErrors = validateItemForm(values)
    setErrors(validationErrors)
    if (!isFormValid(validationErrors) || !user || !values.imageFile) return

    try {
      setStage('uploading')
      const imageUrl = await uploadItemImage(values.imageFile, user.id, reportType)

      setStage('saving')
      const res = await api.post<Item>('/items', {
        report_type: reportType,
        item_name: values.item_name.trim(),
        category: values.category,
        description: values.description.trim(),
        location: values.location.trim(),
        date_reported: values.date_reported,
        image_url: imageUrl,
      })

      setSuccess(res.data)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setStage('idle')
    }
  }

  // Success Confirmation Screen
  if (success) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl py-8">
          <Card className="overflow-hidden border-emerald-500/30 bg-[#121622] p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-8 ring-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <Badge variant="success" size="sm" className="mt-4">
              Report Successfully Filed
            </Badge>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              {isLost ? 'Lost Item' : 'Found Item'} Registered
            </h2>

            <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-md mx-auto font-medium">
              Your report for <span className="font-bold text-white">"{success.item_name}"</span> has been saved and is ready for matching.
            </p>

            {/* Summary Preview Box */}
            <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0c101a] p-4 text-left flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-800 border border-slate-700">
                {success.image_url ? (
                  <img
                    src={success.image_url}
                    alt={success.item_name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">
                    {success.item_name}
                  </span>
                  <Badge variant={isLost ? 'danger' : 'success'} size="sm">
                    {success.report_type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Category: <span className="font-semibold text-slate-200">{success.category}</span> • Location: <span className="font-semibold text-slate-200">{success.location}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => navigate(`/items/${success.id}`)}
                className="w-full sm:w-auto"
                icon={<Eye className="h-4 w-4" />}
              >
                View Details
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/my-items?type=${reportType}`)}
                className="w-full sm:w-auto"
              >
                Go to My Reports
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSuccess(null)
                  resetForm()
                }}
                className="w-full sm:w-auto"
              >
                Report Another
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl pb-12">
        {/* Top Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isLost ? 'danger' : 'success'} size="sm" dot>
              {isLost ? 'Lost Item Form' : 'Found Item Form'}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Report {isLost ? 'a Lost' : 'a Found'} Item
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">
            {isLost
              ? 'Provide clear details and a photo so potential finders can identify and match your item.'
              : 'Found an item? Upload a photo and location so the rightful owner can recognize it.'}
          </p>
        </div>

        {/* Global Submit Error */}
        {submitError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold">Submission failed</p>
              <p className="text-xs text-rose-300 mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <Card className="p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border-slate-800/90 bg-[#121622]">
          <form onSubmit={handleSubmit} noValidate className="space-y-7">
            {/* Section 1: Photo Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  Item Photo <span className="text-rose-400">*</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">JPEG, PNG, WebP (up to {MAX_IMAGE_SIZE_MB}MB)</span>
              </div>

              {imagePreview ? (
                <div className="relative group overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 max-w-sm mx-auto sm:mx-0">
                  <img
                    src={imagePreview}
                    alt="Uploaded preview"
                    className="h-56 w-full object-cover transition-transform group-hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <button
                    type="button"
                    onClick={clearImage}
                    disabled={busy}
                    className="absolute top-3 right-3 rounded-full bg-slate-900/90 p-1.5 text-slate-300 shadow-md backdrop-blur-xs hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer border border-slate-700"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-3 left-3 text-white text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Photo attached
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-950/40 scale-[1.01]'
                      : 'border-slate-800 bg-[#0c101a]/70 hover:border-slate-700 hover:bg-[#0c101a]'
                  } ${errors.imageFile ? 'border-rose-500/50 bg-rose-950/20' : ''}`}
                >
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 shadow-2xs border border-indigo-500/20">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-white">
                    Click to upload or drag &amp; drop item photo
                  </p>
                  <p className="mt-1 text-xs text-slate-400 font-medium">
                    Clear, well-lit photos make identifying items much easier
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {errors.imageFile && (
                <p className="mt-2 text-xs font-semibold text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.imageFile}
                </p>
              )}
            </div>

            {/* Section 2: Item Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  Item Name <span className="text-rose-400">*</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">{values.item_name.length}/100</span>
              </div>
              <input
                type="text"
                value={values.item_name}
                onChange={(e) => updateField('item_name', e.target.value)}
                disabled={busy}
                placeholder="e.g. Space Gray Apple MacBook Pro 14'"
                maxLength={100}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all font-medium bg-[#0c101a] ${
                  errors.item_name
                    ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {errors.item_name && (
                <p className="mt-1.5 text-xs font-semibold text-rose-400">{errors.item_name}</p>
              )}
            </div>

            {/* Section 3: Category Picker */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Category <span className="text-rose-400">*</span>
              </label>

              {/* Visual category pills */}
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2.5">
                {ITEM_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat]
                  const isSelected = values.category === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => updateField('category', cat)}
                      disabled={busy}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200 ring-2 ring-indigo-500/30 shadow-sm shadow-indigo-500/10'
                          : 'border-slate-800 bg-[#0c101a] text-slate-400 hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-1 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span className="truncate w-full text-center">{cat}</span>
                    </button>
                  )
                })}
              </div>

              {errors.category && (
                <p className="mt-1.5 text-xs font-semibold text-rose-400">{errors.category}</p>
              )}
            </div>

            {/* Section 4: Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  Detailed Description <span className="text-rose-400">*</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">{values.description.length}/1000</span>
              </div>
              <textarea
                value={values.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={busy}
                rows={4}
                maxLength={1000}
                placeholder="Include color, brand, stickers, serial details, scratches, contents, or distinguishing features..."
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all leading-relaxed font-medium bg-[#0c101a] ${
                  errors.description
                    ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs font-semibold text-rose-400">{errors.description}</p>
              )}
            </div>

            {/* Section 5: Location & Date Grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Location */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                    {isLost ? 'Last Seen Location' : 'Found Location'} <span className="text-rose-400">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={values.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  disabled={busy}
                  placeholder="e.g. Science Library, 2nd Floor, Room 204"
                  maxLength={200}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all font-medium bg-[#0c101a] ${
                    errors.location
                      ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                />
                {errors.location && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-400">{errors.location}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    Date {isLost ? 'Lost' : 'Found'} <span className="text-rose-400">*</span>
                  </label>
                </div>
                <input
                  type="date"
                  value={values.date_reported}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => updateField('date_reported', e.target.value)}
                  disabled={busy}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 transition-all font-medium bg-[#0c101a] ${
                    errors.date_reported
                      ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                />
                {errors.date_reported && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-400">{errors.date_reported}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-800/80">
              <Button
                type="submit"
                size="lg"
                loading={busy}
                className="w-full shadow-lg shadow-indigo-600/25"
                icon={
                  !busy ? (
                    <Sparkles className="h-5 w-5" />
                  ) : undefined
                }
              >
                {stage === 'uploading'
                  ? 'Uploading Image to Secure Storage...'
                  : stage === 'saving'
                    ? 'Saving Report...'
                    : `Submit ${isLost ? 'Lost Item' : 'Found Item'} Report`}
              </Button>

              <p className="mt-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Your report will be authenticated with your profile and available immediately.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  )
}
