"""Notification Service — Phase 6.

Handles creating and managing in-app notifications for match events and
system updates.
"""

from typing import Any

from app.database.connection import get_supabase_admin_client


def send_notification(user_id: str, title: str, message: str, match_id: str | None = None) -> dict[str, Any] | None:
    """Create a new notification row for a user."""
    supabase = get_supabase_admin_client()
    payload = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "match_id": match_id,
        "is_read": False,
    }
    try:
        res = supabase.table("notifications").insert(payload).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None
