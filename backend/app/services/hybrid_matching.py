"""Hybrid Multi-Modal Matching Service — Phase 5.

Combines vision embeddings (Phase 3 CLIP), text semantics (Phase 4 NLP),
location fuzzy matching, and temporal decay into a unified match score.
Orchestrates embedding generation, candidate comparisons, match persistence,
and high-confidence notification triggers.
"""

import difflib
import logging
import math
from datetime import date, datetime
from typing import Any

from app.core.config import get_settings
from app.database.connection import get_supabase_admin_client
from app.services.image_matching import (
    _to_float_list,
    cosine_similarity as image_cosine_similarity,
    get_image_embedding,
)
from app.services.text_matching import (
    cosine_similarity as text_cosine_similarity,
    get_text_embedding,
)

logger = logging.getLogger("uvicorn.error")


def _parse_date(val: Any) -> date | None:
    """Parse a date from string or date object."""
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        try:
            return datetime.strptime(val[:10], "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def calculate_location_similarity(loc1: str | None, loc2: str | None) -> float:
    """Calculate case-insensitive fuzzy similarity between two location strings (0-100 scale).

    Uses difflib.SequenceMatcher with substring overlap boost.
    """
    s1 = (loc1 or "").lower().strip()
    s2 = (loc2 or "").lower().strip()

    if not s1 or not s2:
        return 0.0

    if s1 == s2:
        return 100.0

    matcher_ratio = difflib.SequenceMatcher(None, s1, s2).ratio() * 100.0

    if s1 in s2 or s2 in s1:
        substring_overlap = (min(len(s1), len(s2)) / max(len(s1), len(s2))) * 100.0
        return max(matcher_ratio, substring_overlap)

    return matcher_ratio


def calculate_date_similarity(d1: date | None, d2: date | None) -> float:
    """Calculate temporal similarity using exponential decay over days apart (0-100 scale).

    Scores 100 for same day, decaying smoothly to ~6 by 14 days apart.
    """
    if not d1 or not d2:
        return 0.0

    days_apart = abs((d1 - d2).days)
    decay_score = 100.0 * math.exp(-days_apart / 5.0)
    return max(0.0, min(100.0, decay_score))


def generate_embeddings_for_item(item_id: str) -> bool:
    """Generate and persist CLIP vision and NLP text embeddings for a reported item.

    Fetches the item, computes embeddings if inputs exist, and caches vectors
    directly on the items row via the admin client.

    Returns:
        True if at least the text embedding succeeded, False if both failed.
    """
    supabase = get_supabase_admin_client()

    try:
        res = (
            supabase.table("items")
            .select("id, item_name, description, image_url, image_embedding, text_embedding")
            .eq("id", item_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.error("Failed to fetch item %s for embedding generation: %s", item_id, exc)
        return False

    if not res or not res.data:
        logger.warning("Item %s not found for embedding generation", item_id)
        return False

    item = res.data
    update_data: dict[str, Any] = {}
    has_image_emb = False
    has_text_emb = False

    # 1. Image embedding via CLIP
    if item.get("image_url"):
        img_emb = get_image_embedding(item["image_url"])
        if img_emb is not None:
            update_data["image_embedding"] = img_emb
            has_image_emb = True

    # 2. Text embedding via Sentence-Transformers
    text_content = f"{item.get('item_name', '')}. {item.get('description', '')}".strip()
    if text_content:
        txt_emb = get_text_embedding(text_content)
        if txt_emb is not None:
            update_data["text_embedding"] = txt_emb
            has_text_emb = True

    # 3. Update the item row in Supabase
    if update_data:
        try:
            supabase.table("items").update(update_data).eq("id", item_id).execute()
        except Exception as exc:
            logger.error("Failed to store embeddings for item %s: %s", item_id, exc)

    logger.info(
        "Generated embeddings for item %s: image=%s, text=%s",
        item_id,
        has_image_emb,
        has_text_emb,
    )

    return has_text_emb


def find_and_store_matches(item_id: str) -> list[dict[str, Any]]:
    """Compare an item against all active candidates of opposite type and persist matches.

    Args:
        item_id: ID of the newly created or updated item.

    Returns:
        List of all computed candidate comparison records, sorted by final_score descending.
    """
    settings = get_settings()
    supabase = get_supabase_admin_client()

    # 1. Fetch the target item
    try:
        item_res = supabase.table("items").select("*").eq("id", item_id).maybe_single().execute()
    except Exception as exc:
        logger.error("Failed to fetch item %s for matching: %s", item_id, exc)
        return []

    if not item_res or not item_res.data:
        return []

    item = item_res.data
    if item.get("status") != "ACTIVE":
        return []

    target_type = "FOUND" if item["report_type"] == "LOST" else "LOST"

    # 2. Fetch all ACTIVE candidates of the opposite report_type
    try:
        candidates_res = (
            supabase.table("items")
            .select("*")
            .eq("report_type", target_type)
            .eq("status", "ACTIVE")
            .execute()
        )
    except Exception as exc:
        logger.error("Failed to fetch active candidates for item %s: %s", item_id, exc)
        return []

    candidates = candidates_res.data or []
    if not candidates:
        logger.info("No active %s candidates found for comparison against item %s", target_type, item_id)
        return []

    item_date = _parse_date(item.get("date_reported"))
    item_img_emb = _to_float_list(item.get("image_embedding"))
    item_txt_emb = _to_float_list(item.get("text_embedding"))

    all_compared_scores: list[dict[str, Any]] = []

    # 3. Score against each candidate
    for cand in candidates:
        cand_id = cand["id"]
        cand_img_emb = _to_float_list(cand.get("image_embedding"))
        cand_txt_emb = _to_float_list(cand.get("text_embedding"))

        # Image similarity (treat as 0 if either embedding is missing)
        if item_img_emb and cand_img_emb:
            img_sim = image_cosine_similarity(item_img_emb, cand_img_emb)
        else:
            img_sim = 0.0

        # Text similarity
        if item_txt_emb and cand_txt_emb:
            txt_sim = text_cosine_similarity(item_txt_emb, cand_txt_emb)
        else:
            txt_sim = 0.0

        # Location similarity (fuzzy substring match)
        loc_sim = calculate_location_similarity(item.get("location"), cand.get("location"))

        # Date similarity (exponential decay)
        cand_date = _parse_date(cand.get("date_reported"))
        date_sim = calculate_date_similarity(item_date, cand_date)

        # 4. Final weighted score
        final_score = (
            settings.match_weight_image * img_sim
            + settings.match_weight_text * txt_sim
            + settings.match_weight_location * loc_sim
            + settings.match_weight_date * date_sim
        )
        final_score = round(final_score, 2)

        # Critical requirement: Log EVERY candidate comparison
        logger.info(
            "Compared %s vs %s: image=%.2f, text=%.2f, location=%.2f, date=%.2f, final=%.2f",
            item_id,
            cand_id,
            img_sim,
            txt_sim,
            loc_sim,
            date_sim,
            final_score,
        )

        if item["report_type"] == "LOST":
            lost_id = item["id"]
            found_id = cand["id"]
        else:
            lost_id = cand["id"]
            found_id = item["id"]

        comparison_record = {
            "lost_item_id": lost_id,
            "found_item_id": found_id,
            "image_similarity": round(img_sim, 2),
            "text_similarity": round(txt_sim, 2),
            "location_similarity": round(loc_sim, 2),
            "date_similarity": round(date_sim, 2),
            "final_score": final_score,
            "match_status": "POTENTIAL",
        }

        # 5. Persist if score meets or exceeds possible threshold
        if final_score >= settings.match_threshold_possible:
            try:
                upsert_res = (
                    supabase.table("matches")
                    .upsert(comparison_record, on_conflict="lost_item_id,found_item_id")
                    .execute()
                )
                if upsert_res.data:
                    comparison_record["id"] = upsert_res.data[0].get("id")
                    comparison_record["created_at"] = upsert_res.data[0].get("created_at")
            except Exception as exc:
                logger.error("Failed to upsert match between %s and %s: %s", lost_id, found_id, exc)

        all_compared_scores.append(comparison_record)

    # 6. Return all candidate comparisons sorted by final_score descending
    all_compared_scores.sort(key=lambda m: float(m.get("final_score", 0)), reverse=True)
    return all_compared_scores


def create_notifications_for_matches(matches: list[dict[str, Any]]) -> None:
    """Trigger in-app notification rows for high-confidence matches (final_score >= threshold).

    Sends notifications to both the lost item owner and found item owner,
    avoiding duplicate notifications for the same match_id + user_id pair.
    """
    if not matches:
        return

    settings = get_settings()
    supabase = get_supabase_admin_client()

    for match in matches:
        final_score = float(match.get("final_score", 0))
        if final_score < settings.match_threshold_strong:
            continue

        match_id = match.get("id")
        lost_id = match.get("lost_item_id")
        found_id = match.get("found_item_id")

        if not lost_id or not found_id:
            continue

        # If match wasn't given an id yet (e.g. not in returned row), query it
        if not match_id:
            try:
                m_row = (
                    supabase.table("matches")
                    .select("id")
                    .eq("lost_item_id", lost_id)
                    .eq("found_item_id", found_id)
                    .maybe_single()
                    .execute()
                )
                if m_row and m_row.data:
                    match_id = m_row.data["id"]
            except Exception:
                pass

        # Fetch lost and found item details
        try:
            items_res = (
                supabase.table("items")
                .select("id, user_id, item_name, report_type")
                .in_("id", [lost_id, found_id])
                .execute()
            )
        except Exception as exc:
            logger.warning("Could not fetch items for match %s notifications: %s", match_id, exc)
            continue

        item_map = {row["id"]: row for row in (items_res.data or [])}
        lost_item = item_map.get(lost_id)
        found_item = item_map.get(found_id)

        if not lost_item or not found_item:
            continue

        lost_owner_id = lost_item["user_id"]
        found_owner_id = found_item["user_id"]

        # 1. Notify Lost Item Owner
        try:
            query = supabase.table("notifications").select("id").eq("user_id", lost_owner_id)
            if match_id:
                query = query.eq("match_id", match_id)
            existing_lost_notif = query.maybe_single().execute()

            if not existing_lost_notif or not existing_lost_notif.data:
                supabase.table("notifications").insert(
                    {
                        "user_id": lost_owner_id,
                        "match_id": match_id,
                        "title": f"Potential match found for your lost {lost_item['item_name']}",
                        "message": (
                            f"A found report '{found_item['item_name']}' matches your item "
                            f"with a {final_score}% match score."
                        ),
                        "is_read": False,
                    }
                ).execute()
        except Exception as exc:
            logger.error("Failed to notify lost item owner %s: %s", lost_owner_id, exc)

        # 2. Notify Found Item Owner (if different user)
        if found_owner_id != lost_owner_id:
            try:
                query = supabase.table("notifications").select("id").eq("user_id", found_owner_id)
                if match_id:
                    query = query.eq("match_id", match_id)
                existing_found_notif = query.maybe_single().execute()

                if not existing_found_notif or not existing_found_notif.data:
                    supabase.table("notifications").insert(
                        {
                            "user_id": found_owner_id,
                            "match_id": match_id,
                            "title": f"Potential match found for your reported found {found_item['item_name']}",
                            "message": (
                                f"A lost item report '{lost_item['item_name']}' matches your "
                                f"found item with a {final_score}% match score."
                            ),
                            "is_read": False,
                        }
                    ).execute()
            except Exception as exc:
                logger.error("Failed to notify found item owner %s: %s", found_owner_id, exc)
