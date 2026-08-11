from pydantic import BaseModel
from typing import Optional

class CompanyCard(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    industry: Optional[str] = None
    is_verified: bool = False
    avg_score: Optional[float] = None
    review_count: int = 0
    avg_daily_allowance: Optional[float] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    cover_image_url: Optional[str] = None
    description: Optional[str] = None
    departments: list[str] = []
    model_config = {"from_attributes": True}

class CompanyDetail(CompanyCard):
    lat: Optional[float] = None
    lng: Optional[float] = None

class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    industry: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    cover_image_url: Optional[str] = None
    description: Optional[str] = None
