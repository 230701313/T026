export type ReportType = 'LOST' | 'FOUND'

export type ItemStatus = 'ACTIVE' | 'MATCHED' | 'CLAIMED' | 'RECOVERED' | 'CLOSED'

export type ItemCategory =
  | 'Electronics'
  | 'Personal Items'
  | 'Documents'
  | 'Accessories'
  | 'Clothing'
  | 'Books'
  | 'Keys'
  | 'Bags'
  | 'Other'

export interface Item {
  id: string
  user_id: string
  report_type: ReportType
  item_name: string
  category: ItemCategory
  description: string
  location: string
  date_reported: string
  image_url: string | null
  status: ItemStatus
  created_at: string
  updated_at: string
}

export interface MatchBreakdown {
  image_similarity: number
  text_similarity: number
  location_similarity: number
  date_similarity: number
  final_score: number
}

export type MatchStatus = 'POTENTIAL' | 'CONFIRMED' | 'REJECTED'

export interface Match extends MatchBreakdown {
  id: string
  lost_item_id: string
  found_item_id: string
  match_status: MatchStatus
  created_at: string
  matched_item?: Item
}

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string
}

export interface AppNotification {
  id: string
  user_id: string
  match_id: string | null
  title: string
  message: string
  is_read: boolean
  created_at: string
  image_url?: string | null
  target_item_id?: string | null
  candidate_item_id?: string | null
  match_status?: MatchStatus | null
}

export interface DashboardStats {
  total_lost: number
  total_found: number
  potential_matches: number
  recovered_items: number
}

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Claim {
  id: string
  item_id: string
  claimant_id: string
  verification_details: string
  status: ClaimStatus
  created_at: string
  reviewed_at: string | null
  claimant_name?: string | null
}

export interface MatchingConfig {
  match_weight_image: number
  match_weight_text: number
  match_weight_location: number
  match_weight_date: number
  match_threshold_strong: number
  match_threshold_possible: number
}

