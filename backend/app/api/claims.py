"""Ownership verification / claims API — Phase 7.

Exposes endpoints for submitting ownership verification claims, reviewing
claims on reported items, and approving or rejecting claims.
"""

from fastapi import APIRouter, Depends

from app.core.security import CurrentUser, get_current_user
from app.models.claim import Claim, ClaimCreate
from app.services.verification_service import (
    approve_claim,
    create_claim,
    get_item_claims,
    reject_claim,
)

router = APIRouter(prefix="/claims", tags=["claims"])


@router.post("", response_model=Claim)
async def submit_claim(
    claim_in: ClaimCreate,
    current_user: CurrentUser = Depends(get_current_user),
) -> Claim:
    """Submit a new ownership verification claim for an item."""
    return create_claim(claim_in, current_user.id)


@router.get("/item/{item_id}", response_model=list[Claim])
async def list_item_claims(
    item_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Claim]:
    """Retrieve all claims submitted on an item.

    Only the user who reported the item may view its claims.
    """
    return get_item_claims(item_id, current_user.id)


@router.patch("/{claim_id}/approve", response_model=Claim)
async def approve_item_claim(
    claim_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> Claim:
    """Approve a claim.

    Only the user who reported the item may approve the claim. Updates the claim
    status to APPROVED and sets the item status to RECOVERED.
    """
    return approve_claim(claim_id, current_user.id)


@router.patch("/{claim_id}/reject", response_model=Claim)
async def reject_item_claim(
    claim_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> Claim:
    """Reject a claim.

    Only the user who reported the item may reject the claim. Updates the claim
    status to REJECTED.
    """
    return reject_claim(claim_id, current_user.id)

