from datetime import datetime

from pydantic import BaseModel, EmailStr


class Profile(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str | None = None
    created_at: datetime


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
