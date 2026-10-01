from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class ClaimStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ClaimCreate(BaseModel):
    item_id: str
    verification_details: str


class Claim(BaseModel):
    id: str
    item_id: str
    claimant_id: str
    verification_details: str
    status: ClaimStatus
    created_at: datetime
    reviewed_at: datetime | None = None
    claimant_name: str | None = None

