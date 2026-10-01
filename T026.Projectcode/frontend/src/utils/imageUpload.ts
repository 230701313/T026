import { supabase } from '@/services/supabaseClient'
import type { ReportType } from '@/types'

// Matches the 'item-images' bucket created by database/schema.sql.
const BUCKET = 'item-images'

/**
 * Uploads an item photo directly to Supabase Storage using the current
 * user's own authenticated session (governed by the storage RLS policies
 * in schema.sql — any authenticated user may upload, only the uploader may
 * later update/delete). Returns the public URL to store on the item row.
 */
export async function uploadItemImage(
  file: File,
  userId: string,
  reportType: ReportType
): Promise<string> {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const uniqueId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const path = `${userId}/${reportType.toLowerCase()}-${Date.now()}-${uniqueId}.${extension}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('Could not generate a public URL for the uploaded image.')
  }

  return data.publicUrl
}
