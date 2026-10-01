from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel


class ReportType(str, Enum):
    LOST = "LOST"
    FOUND = "FOUND"


class ItemStatus(str, Enum):
    ACTIVE = "ACTIVE"
    MATCHED = "MATCHED"
    CLAIMED = "CLAIMED"
    RECOVERED = "RECOVERED"
    CLOSED = "CLOSED"


class ItemCategory(str, Enum):
    ELECTRONICS = "Electronics"
    PERSONAL_ITEMS = "Personal Items"
    DOCUMENTS = "Documents"
    ACCESSORIES = "Accessories"
    CLOTHING = "Clothing"
    BOOKS = "Books"
    KEYS = "Keys"
    BAGS = "Bags"
    OTHER = "Other"


class ItemBase(BaseModel):
    item_name: str
    category: ItemCategory
    description: str
    location: str
    date_reported: date


class ItemCreate(ItemBase):
    report_type: ReportType
    image_url: str | None = None


class Item(ItemBase):
    id: str
    user_id: str
    report_type: ReportType
    image_url: str | None = None
    status: ItemStatus
    created_at: datetime
    updated_at: datetime


class ItemStatusUpdate(BaseModel):
    status: ItemStatus
