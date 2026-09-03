from pydantic import BaseModel
from typing import Optional

class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    industry: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    cover_image_url: Optional[str] = None

class CompanyPublic(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    industry: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    cover_image_url: Optional[str] = None
    avg_score: Optional[float] = None
    review_count: int = 0
    avg_daily_allowance: Optional[float] = None
    departments: list[str] = []
    created_at: Optional[str] = None
    model_config = {"from_attributes": True}
