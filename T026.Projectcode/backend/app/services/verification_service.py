"""Ownership verification and claims management service — Phase 7.

Handles creating claims, retrieving claims on items, and verifying/approving
or rejecting claims with ownership permission enforcement.
"""

from datetime import datetime, timezone
import uuid
from fastapi import HTTPException
from fastapi import status as http_status

from app.database.connection import get_supabase_admin_client
from app.models.claim import Claim, ClaimCreate, ClaimStatus


def _parse_uuid_or_404(raw_id: str, entity_name: str = "Item") -> str:
    try:
        return str(uuid.UUID(raw_id))
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} not found.",
        ) from exc


def create_claim(claim_in: ClaimCreate, claimant_id: str) -> Claim:
    """Create a new ownership verification claim for an item."""
    valid_item_id = _parse_uuid_or_404(claim_in.item_id, "Item")
    supabase = get_supabase_admin_client()

    # Validate item exists
    try:
        item_res = (
            supabase.table("items")
            .select("*")
            .eq("id", valid_item_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve item details.",
        ) from exc

    if not item_res or not item_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Item not found.",
        )

    item = item_res.data

    if not claim_in.verification_details or not claim_in.verification_details.strip():
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Verification details cannot be empty.",
        )

    # Insert claim
    claim_payload = {
        "item_id": valid_item_id,
        "claimant_id": claimant_id,
        "verification_details": claim_in.verification_details.strip(),
        "status": "PENDING",
    }

    try:
        insert_res = supabase.table("claims").insert(claim_payload).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Failed to submit claim.",
        ) from exc

    if not insert_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create claim record.",
        )

    created_claim = insert_res.data[0]

    # Send notification to the item reporter
    try:
        supabase.table("notifications").insert(
            {
                "user_id": item["user_id"],
                "title": "New Ownership Claim",
                "message": f"A user submitted an ownership verification claim for '{item['item_name']}'.",
            }
        ).execute()
    except Exception:
        # Non-fatal if notification fails
        pass

    return Claim(**created_claim)


def get_item_claims(item_id: str, user_id: str) -> list[Claim]:
    """Retrieve all claims submitted for an item.

    Only the user who reported the item may view its claims.
    """
    valid_item_id = _parse_uuid_or_404(item_id, "Item")
    supabase = get_supabase_admin_client()

    try:
        item_res = (
            supabase.table("items")
            .select("user_id")
            .eq("id", valid_item_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve item.",
        ) from exc

    if not item_res or not item_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Item not found.",
        )

    if item_res.data["user_id"] != user_id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You can only view claims for items you reported.",
        )

    try:
        claims_res = (
            supabase.table("claims")
            .select("*")
            .eq("item_id", valid_item_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load claims.",
        ) from exc

    claims_data = claims_res.data or []
    if not claims_data:
        return []

    # Optionally fetch claimant profile names
    claimant_ids = list({c["claimant_id"] for c in claims_data if "claimant_id" in c})
    profile_map = {}
    if claimant_ids:
        try:
            prof_res = (
                supabase.table("profiles")
                .select("id, full_name")
                .in_("id", claimant_ids)
                .execute()
            )
            for p in prof_res.data or []:
                profile_map[p["id"]] = p.get("full_name")
        except Exception:
            pass

    results = []
    for c in claims_data:
        c_dict = dict(c)
        c_dict["claimant_name"] = profile_map.get(c_dict["claimant_id"])
        results.append(Claim(**c_dict))

    return results


def approve_claim(claim_id: str, user_id: str) -> Claim:
    """Approve a claim.

    Validates that the caller is the reporter of the claimed item.
    Updates claim status to APPROVED, sets reviewed_at, and marks the item as RECOVERED.
    """
    valid_claim_id = _parse_uuid_or_404(claim_id, "Claim")
    supabase = get_supabase_admin_client()

    try:
        claim_res = (
            supabase.table("claims")
            .select("*")
            .eq("id", valid_claim_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load claim.",
        ) from exc

    if not claim_res or not claim_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Claim not found.",
        )

    claim_data = claim_res.data
    item_id = claim_data["item_id"]

    try:
        item_res = (
            supabase.table("items")
            .select("*")
            .eq("id", item_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load item.",
        ) from exc

    if not item_res or not item_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Item not found.",
        )

    item = item_res.data
    if item["user_id"] != user_id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You can only approve claims for items you reported.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        # Update claim to APPROVED
        supabase.table("claims").update(
            {"status": "APPROVED", "reviewed_at": now_iso}
        ).eq("id", valid_claim_id).execute()

        # Update item status to RECOVERED
        supabase.table("items").update(
            {"status": "RECOVERED"}
        ).eq("id", item_id).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Failed to approve claim.",
        ) from exc

    # Notify claimant
    try:
        supabase.table("notifications").insert(
            {
                "user_id": claim_data["claimant_id"],
                "title": "Claim Approved!",
                "message": f"Your claim for '{item['item_name']}' was approved. Item is marked as recovered.",
            }
        ).execute()
    except Exception:
        pass

    claim_data["status"] = ClaimStatus.APPROVED
    claim_data["reviewed_at"] = now_iso
    return Claim(**claim_data)


def reject_claim(claim_id: str, user_id: str) -> Claim:
    """Reject a claim.

    Validates that the caller is the reporter of the claimed item.
    Updates claim status to REJECTED and sets reviewed_at. Item status is unchanged.
    """
    valid_claim_id = _parse_uuid_or_404(claim_id, "Claim")
    supabase = get_supabase_admin_client()

    try:
        claim_res = (
            supabase.table("claims")
            .select("*")
            .eq("id", valid_claim_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load claim.",
        ) from exc

    if not claim_res or not claim_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Claim not found.",
        )

    claim_data = claim_res.data
    item_id = claim_data["item_id"]

    try:
        item_res = (
            supabase.table("items")
            .select("*")
            .eq("id", item_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Could not load item.",
        ) from exc

    if not item_res or not item_res.data:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Item not found.",
        )

    item = item_res.data
    if item["user_id"] != user_id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You can only reject claims for items you reported.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        # Update claim to REJECTED
        supabase.table("claims").update(
            {"status": "REJECTED", "reviewed_at": now_iso}
        ).eq("id", valid_claim_id).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reject claim.",
        ) from exc

    # Notify claimant
    try:
        supabase.table("notifications").insert(
            {
                "user_id": claim_data["claimant_id"],
                "title": "Claim Update",
                "message": f"Your claim for '{item['item_name']}' was declined by the reporter.",
            }
        ).execute()
    except Exception:
        pass

    claim_data["status"] = ClaimStatus.REJECTED
    claim_data["reviewed_at"] = now_iso
    return Claim(**claim_data)
