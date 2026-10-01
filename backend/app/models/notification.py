from datetime import datetime

from pydantic import BaseModel


class Notification(BaseModel):
    id: str
    user_id: str
    match_id: str | None = None
    title: str
    message: str
    is_read: bool
    created_at: datetime
    image_url: str | None = None
    target_item_id: str | None = None
    candidate_item_id: str | None = None
    match_status: str | None = None

