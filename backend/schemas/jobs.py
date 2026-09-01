from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class JobPostingCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    daily_allowance: Optional[int] = Field(400, ge=0)
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None
    line_id: Optional[str] = None
    benefits: Optional[str] = None

class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    daily_allowance: Optional[int] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None

class JobPostingPublic(BaseModel):
    id: int
    user_id: int
    company_id: Optional[int] = None
    title: str
    company_name: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    daily_allowance: Optional[int] = 400
    location: Optional[str] = None
    is_active: bool = True
    status: str = "pending"
    rejection_reason: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    line_id: Optional[str] = None
    created_at: Optional[str] = None
    model_config = {"from_attributes": True}
