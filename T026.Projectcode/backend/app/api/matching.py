"""AI image + NLP hybrid matching API — Phase 5.

Provides endpoints for retrieving and recalculating multi-modal matches
for a user's reported items. Matches are computed server-side via
services/hybrid_matching.py and written via the service-role client,
enforcing that regular users/frontend cannot fabricate match scores.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import CurrentUser, get_current_user
from app.database.connection import get_supabase_admin_client
from app.models.item import Item
from app.models.match import Match, MatchStatus
from app.services.hybrid_matching import (
    create_notifications_for_matches,
    find_and_store_matches,
    generate_embeddings_for_item,
)

router = APIRouter(prefix="/matching", tags=["matching"])


class MatchingConfigResponse(BaseModel):
    match_weight_image: float
    match_weight_text: float
    match_weight_location: float
    match_weight_date: float
    match_threshold_strong: int
    match_threshold_possible: int


def _parse_uuid_or_404(item_id: str) -> str:
    try:
        return str(uuid.UUID(item_id))
    except ValueError as exc:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Item not found."
        ) from exc


def _check_item_ownership(item_id: str, user_id: str, supabase) -> dict:
    valid_id = _parse_uuid_or_404(item_id)
    try:
        existing = (
            supabase.table("items")
            .select("*")
            .eq("id", valid_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load item.",
        ) from exc

    if not existing or not existing.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Item not found."
        )
    if existing.data["user_id"] != user_id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You can only access matches for your own reports.",
        )
    return existing.data


def _get_matches_with_other_item(item_id: str, supabase) -> list[Match]:
    try:
        matches_res = (
            supabase.table("matches")
            .select("*")
            .or_(f"lost_item_id.eq.{item_id},found_item_id.eq.{item_id}")
            .order("final_score", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load matches.",
        ) from exc

    matches_data = matches_res.data or []
    if not matches_data:
        return []

    # Collect IDs of the other items in the pairs
    other_item_ids = list(
        {
            m["found_item_id"] if m["lost_item_id"] == item_id else m["lost_item_id"]
            for m in matches_data
        }
    )

    item_map = {}
    if other_item_ids:
        try:
            items_res = (
                supabase.table("items")
                .select("*")
                .in_("id", other_item_ids)
                .execute()
            )
            for row in items_res.data or []:
                item_map[row["id"]] = row
        except Exception as exc:
            raise HTTPException(
                status_code=http_status.HTTP_502_BAD_GATEWAY,
                detail="Could not load matched item details.",
            ) from exc

    result: list[Match] = []
    for m in matches_data:
        other_id = m["found_item_id"] if m["lost_item_id"] == item_id else m["lost_item_id"]
        matched_raw = item_map.get(other_id)
        matched_item = Item(**matched_raw) if matched_raw else None
        result.append(Match(**m, matched_item=matched_item))

    return result


@router.get("/config", response_model=MatchingConfigResponse)
async def get_matching_config() -> MatchingConfigResponse:
    """Retrieve dynamic matching weights and category thresholds."""
    settings = get_settings()
    return MatchingConfigResponse(
        match_weight_image=settings.match_weight_image,
        match_weight_text=settings.match_weight_text,
        match_weight_location=settings.match_weight_location,
        match_weight_date=settings.match_weight_date,
        match_threshold_strong=settings.match_threshold_strong,
        match_threshold_possible=settings.match_threshold_possible,
    )


@router.get("/item/{item_id}", response_model=list[Match])
async def get_item_matches(
    item_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Match]:
    """Retrieve all ranked matches involving this item with candidate item details.

    Only the reporting user may access matches for their item.
    """
    supabase = get_supabase_admin_client()
    item = _check_item_ownership(item_id, current_user.id, supabase)
    return _get_matches_with_other_item(item["id"], supabase)


@router.post("/recalculate/{item_id}", response_model=list[Match])
async def recalculate_item_matches(
    item_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Match]:
    """Re-run AI embedding generation, similarity scoring, and notification pipeline.

    Only the reporting user may trigger recalculation for their item.
    """
    supabase = get_supabase_admin_client()
    item = _check_item_ownership(item_id, current_user.id, supabase)

    try:
        generate_embeddings_for_item(item["id"])
        matches = find_and_store_matches(item["id"])
        create_notifications_for_matches(matches)
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Error recalculating matches.",
        ) from exc

    return _get_matches_with_other_item(item["id"], supabase)


@router.patch("/{match_id}/confirm", response_model=Match)
async def confirm_match(
    match_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> Match:
    """Confirm a potential match.

    Validates that the user is the owner of either the lost or found item.
    Updates the match status to CONFIRMED and both items to MATCHED.
    """
    valid_id = _parse_uuid_or_404(match_id)
    supabase = get_supabase_admin_client()

    try:
        match_res = (
            supabase.table("matches")
            .select("*")
            .eq("id", valid_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve match details.",
        ) from exc

    if not match_res or not match_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Match not found.",
        )

    match_data = match_res.data

    try:
        items_res = (
            supabase.table("items")
            .select("*")
            .in_("id", [match_data["lost_item_id"], match_data["found_item_id"]])
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve item details.",
        ) from exc

    items_map = {item["id"]: item for item in (items_res.data or [])}
    lost_item = items_map.get(match_data["lost_item_id"])
    found_item = items_map.get(match_data["found_item_id"])

    if not lost_item or not found_item:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Associated items not found.",
        )

    if current_user.id != lost_item["user_id"] and current_user.id != found_item["user_id"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to confirm this match.",
        )

    try:
        supabase.table("matches").update({"match_status": "CONFIRMED"}).eq("id", valid_id).execute()
        supabase.table("items").update({"status": "MATCHED"}).in_(
            "id", [match_data["lost_item_id"], match_data["found_item_id"]]
        ).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Failed to update match status.",
        ) from exc

    other_item_data = found_item if current_user.id == lost_item["user_id"] else lost_item
    other_item_data["status"] = "MATCHED"
    match_data["match_status"] = "CONFIRMED"

    return Match(**match_data, matched_item=Item(**other_item_data))


@router.patch("/{match_id}/reject", response_model=Match)
async def reject_match(
    match_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> Match:
    """Reject a potential match.

    Validates that the user is the owner of either the lost or found item.
    Updates the match status to REJECTED.
    """
    valid_id = _parse_uuid_or_404(match_id)
    supabase = get_supabase_admin_client()

    try:
        match_res = (
            supabase.table("matches")
            .select("*")
            .eq("id", valid_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve match details.",
        ) from exc

    if not match_res or not match_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Match not found.",
        )

    match_data = match_res.data

    try:
        items_res = (
            supabase.table("items")
            .select("*")
            .in_("id", [match_data["lost_item_id"], match_data["found_item_id"]])
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve item details.",
        ) from exc

    items_map = {item["id"]: item for item in (items_res.data or [])}
    lost_item = items_map.get(match_data["lost_item_id"])
    found_item = items_map.get(match_data["found_item_id"])

    if not lost_item or not found_item:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Associated items not found.",
        )

    if current_user.id != lost_item["user_id"] and current_user.id != found_item["user_id"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to reject this match.",
        )

    try:
        supabase.table("matches").update({"match_status": "REJECTED"}).eq("id", valid_id).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Failed to update match status.",
        ) from exc

    other_item_data = found_item if current_user.id == lost_item["user_id"] else lost_item
    match_data["match_status"] = "REJECTED"

    return Match(**match_data, matched_item=Item(**other_item_data))
