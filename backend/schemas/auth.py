from pydantic import BaseModel, EmailStr
from typing import Optional

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    is_super_admin: bool = False

class GoogleAuthRequest(BaseModel):
    id_token: str

class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_super_admin: bool = False
    is_active: bool = True
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    model_config = {"from_attributes": True}

class EmployerRegister(BaseModel):
    company_name: str
    email: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    contact_person: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    line_id: Optional[str] = None
    departments: Optional[list[str]] = None
    daily_allowance: Optional[str] = None
    benefits: Optional[str] = None
    notes: Optional[str] = None
