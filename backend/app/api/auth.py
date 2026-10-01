"""Auth API.

Actual sign-up / login / logout happen client-side against Supabase Auth
(see frontend/src/hooks/useAuth.tsx) so that Supabase can manage password
hashing, email verification, and session refresh directly. This module only
exposes what the backend needs to know about the authenticated caller.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import CurrentUser, get_current_user
from app.database.connection import get_supabase_admin_client
from app.models.user import Profile, ProfileUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=Profile)
async def get_my_profile(current_user: CurrentUser = Depends(get_current_user)) -> Profile:
    """Return the profile row for the authenticated user, verifying that a
    valid Supabase-issued token was supplied."""
    supabase = get_supabase_admin_client()
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", current_user.id)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. It should be created automatically on sign-up.",
        )
    return Profile(**result.data)


@router.patch("/me", response_model=Profile)
async def update_my_profile(
    profile_in: ProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
) -> Profile:
    """Update profile information for the authenticated user."""
    supabase = get_supabase_admin_client()

    update_data = {}
    if profile_in.full_name is not None:
        trimmed_name = profile_in.full_name.strip()
        if not trimmed_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name cannot be empty.",
            )
        update_data["full_name"] = trimmed_name

    if profile_in.phone is not None:
        update_data["phone"] = profile_in.phone.strip() if profile_in.phone.strip() else None

    if update_data:
        try:
            supabase.table("profiles").update(update_data).eq("id", current_user.id).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not update profile.",
            ) from exc

    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", current_user.id)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )
    return Profile(**result.data)

