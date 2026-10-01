from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import CurrentUser, get_current_user
from app.database.connection import get_supabase_admin_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    total_lost: int
    total_found: int
    potential_matches: int
    recovered_items: int


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: CurrentUser = Depends(get_current_user)) -> DashboardStats:
    """Aggregate counts for the authenticated user's own reports.

    Reads directly from the items/matches tables so figures are always real —
    no cached or hardcoded numbers. Until Phase 2/5 populate those tables
    these will legitimately read as zero rather than fake placeholder data.
    """
    supabase = get_supabase_admin_client()

    lost_count = (
        supabase.table("items")
        .select("id", count="exact")
        .eq("user_id", current_user.id)
        .eq("report_type", "LOST")
        .execute()
    )
    found_count = (
        supabase.table("items")
        .select("id", count="exact")
        .eq("user_id", current_user.id)
        .eq("report_type", "FOUND")
        .execute()
    )
    recovered_count = (
        supabase.table("items")
        .select("id", count="exact")
        .eq("user_id", current_user.id)
        .eq("status", "RECOVERED")
        .execute()
    )

    # Query matches involving any item reported by this user
    user_items = supabase.table("items").select("id").eq("user_id", current_user.id).execute()
    user_item_ids = [row["id"] for row in (user_items.data or [])]

    potential_matches = 0
    if user_item_ids:
        try:
            m_lost = (
                supabase.table("matches")
                .select("id", count="exact")
                .in_("lost_item_id", user_item_ids)
                .execute()
            )
            m_found = (
                supabase.table("matches")
                .select("id", count="exact")
                .in_("found_item_id", user_item_ids)
                .execute()
            )
            potential_matches = (m_lost.count or 0) + (m_found.count or 0)
        except Exception:
            potential_matches = 0

    return DashboardStats(
        total_lost=lost_count.count or 0,
        total_found=found_count.count or 0,
        potential_matches=potential_matches,
        recovered_items=recovered_count.count or 0,
    )
