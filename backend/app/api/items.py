"""Lost/Found item reporting API — Phase 2 (Lost/Found Reporting).

Image files themselves are uploaded directly from the frontend to Supabase
Storage (using the user's own authenticated session, governed by the
storage RLS policies in database/schema.sql). This API only ever receives
and stores the resulting public image URL alongside the report — it never
handles raw file bytes, keeping the backend simple and consistent with the
rest of the project's "auth lives in Supabase, backend trusts the JWT"
design (see app/api/auth.py).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status

from app.core.security import CurrentUser, get_current_user
from app.database.connection import get_supabase_admin_client
from app.models.item import Item, ItemCreate, ItemStatusUpdate, ReportType

router = APIRouter(prefix="/items", tags=["items"])


def _parse_uuid_or_404(item_id: str) -> str:
    """Validate the path parameter looks like a UUID before querying.

    Postgres would otherwise raise a raw casting error on a malformed id,
    which the global exception handler would turn into an opaque 500. A
    malformed id is really just "not found".
    """
    try:
        return str(uuid.UUID(item_id))
    except ValueError as exc:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Item not found."
        ) from exc


@router.post("", response_model=Item, status_code=http_status.HTTP_201_CREATED)
async def create_item(
    payload: ItemCreate,
    current_user: CurrentUser = Depends(get_current_user),
) -> Item:
    """Create a new lost or found item report for the authenticated user.

    The backend — not the client — decides `user_id`, `status`, and
    timestamps, so a caller can never report an item under someone else's
    account or set an arbitrary initial status.
    """
    supabase = get_supabase_admin_client()
    row = {
        "user_id": current_user.id,
        "report_type": payload.report_type.value,
        "item_name": payload.item_name,
        "category": payload.category.value,
        "description": payload.description,
        "location": payload.location,
        "date_reported": payload.date_reported.isoformat(),
        "image_url": payload.image_url,
    }

    try:
        result = supabase.table("items").insert(row).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not save the report. Please try again.",
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create item.",
        )

    created_item = Item(**result.data[0])

    # Run AI embedding generation and hybrid matching pipeline asynchronously / with error isolation
    try:
        from app.services.hybrid_matching import (
            create_notifications_for_matches,
            find_and_store_matches,
            generate_embeddings_for_item,
        )

        generate_embeddings_for_item(created_item.id)
        matches = find_and_store_matches(created_item.id)
        create_notifications_for_matches(matches)
    except Exception as match_err:
        import logging

        logging.getLogger("uvicorn.error").exception(
            "Matching pipeline error for item %s: %s", created_item.id, match_err
        )

    return created_item


@router.get("/mine", response_model=list[Item])
async def get_my_items(
    report_type: ReportType | None = Query(
        default=None, description="Filter to LOST or FOUND reports only."
    ),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Item]:
    """List the authenticated user's own reports, most recent first.

    Powers both "My Lost Items" and "My Found Items" (pass ?report_type=
    LOST or FOUND) as well as a combined recent-activity view when the
    filter is omitted.
    """
    supabase = get_supabase_admin_client()
    query = supabase.table("items").select("*").eq("user_id", current_user.id)
    if report_type:
        query = query.eq("report_type", report_type.value)

    try:
        result = query.order("created_at", desc=True).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load your reports. Please try again.",
        ) from exc

    return [Item(**row) for row in result.data]


@router.get("/{item_id}", response_model=Item)
async def get_item(
    item_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> Item:
    """Fetch a single item report by id.

    Any authenticated user may view any report (mirrors the "Anyone
    authenticated can view active items" RLS policy) so a potential finder
    can open a lost report and vice versa. Only the reporter can change it
    (see update_item_status below).
    """
    valid_id = _parse_uuid_or_404(item_id)
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("items").select("*").eq("id", valid_id).maybe_single().execute()
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load this report. Please try again.",
        ) from exc

    if not result or not result.data:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Item not found.")
    return Item(**result.data)


@router.patch("/{item_id}/status", response_model=Item)
async def update_item_status(
    item_id: str,
    payload: ItemStatusUpdate,
    current_user: CurrentUser = Depends(get_current_user),
) -> Item:
    """Update an item's status. Only the reporting user may do this.

    Ownership is re-checked here server-side (not just relied on via RLS)
    so the API returns a clear 403 instead of a silent no-op.
    """
    valid_id = _parse_uuid_or_404(item_id)
    supabase = get_supabase_admin_client()

    try:
        existing = (
            supabase.table("items").select("id,user_id").eq("id", valid_id).maybe_single().execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load this report. Please try again.",
        ) from exc

    if not existing or not existing.data:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Item not found.")
    if existing.data["user_id"] != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You can only update the status of your own reports.",
        )

    try:
        result = (
            supabase.table("items")
            .update({"status": payload.status.value})
            .eq("id", valid_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not update the report. Please try again.",
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update item.",
        )
    return Item(**result.data[0])
