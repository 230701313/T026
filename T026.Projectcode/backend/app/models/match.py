from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.models.item import Item


class MatchStatus(str, Enum):
    POTENTIAL = "POTENTIAL"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


class MatchBreakdown(BaseModel):
    image_similarity: float
    text_similarity: float
    location_similarity: float
    date_similarity: float
    final_score: float


class Match(MatchBreakdown):
    id: str
    lost_item_id: str
    found_item_id: str
    match_status: MatchStatus
    created_at: datetime
    matched_item: Item | None = None
