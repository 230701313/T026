import type { ItemCategory } from '@/types'

export const ITEM_CATEGORIES: ItemCategory[] = [
  'Electronics',
  'Personal Items',
  'Documents',
  'Accessories',
  'Clothing',
  'Books',
  'Keys',
  'Bags',
  'Other',
]

// Mirrors backend/app/core/config.py's max_image_size_mb / allowed_image_types
// defaults, so the client can reject an obviously-too-large or wrong-type file
// before spending time uploading it.
export const MAX_IMAGE_SIZE_MB = 5
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface ItemFormValues {
  item_name: string
  category: ItemCategory | ''
  description: string
  location: string
  date_reported: string
  imageFile: File | null
}

export interface ItemFormErrors {
  item_name?: string
  category?: string
  description?: string
  location?: string
  date_reported?: string
  imageFile?: string
}

export function validateItemForm(values: ItemFormValues): ItemFormErrors {
  const errors: ItemFormErrors = {}

  const name = values.item_name.trim()
  if (!name) {
    errors.item_name = 'Item name is required.'
  } else if (name.length < 3) {
    errors.item_name = 'Item name must be at least 3 characters.'
  } else if (name.length > 100) {
    errors.item_name = 'Item name must be under 100 characters.'
  }

  if (!values.category) {
    errors.category = 'Please select a category.'
  }

  const description = values.description.trim()
  if (!description) {
    errors.description = 'Description is required.'
  } else if (description.length < 10) {
    errors.description = 'Please add a little more detail (at least 10 characters).'
  } else if (description.length > 1000) {
    errors.description = 'Description must be under 1000 characters.'
  }

  const location = values.location.trim()
  if (!location) {
    errors.location = 'Location is required.'
  } else if (location.length < 3) {
    errors.location = 'Location must be at least 3 characters.'
  } else if (location.length > 200) {
    errors.location = 'Location must be under 200 characters.'
  }

  if (!values.date_reported) {
    errors.date_reported = 'Date is required.'
  } else {
    const chosen = new Date(`${values.date_reported}T00:00:00`)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    if (Number.isNaN(chosen.getTime())) {
      errors.date_reported = 'Enter a valid date.'
    } else if (chosen.getTime() > endOfToday.getTime()) {
      errors.date_reported = 'Date cannot be in the future.'
    }
  }

  if (!values.imageFile) {
    errors.imageFile = 'Please upload a photo of the item.'
  } else if (!ALLOWED_IMAGE_TYPES.includes(values.imageFile.type)) {
    errors.imageFile = 'Only JPEG, PNG, or WebP images are allowed.'
  } else if (values.imageFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    errors.imageFile = `Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB.`
  }

  return errors
}

export function isFormValid(errors: ItemFormErrors): boolean {
  return Object.keys(errors).length === 0
}
