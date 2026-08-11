from pydantic import BaseModel
from typing import Optional
from datetime import date

class JobPostingCreate(BaseModel):
    title: str
    department: str
    description: str
    daily_allowance: Optional[int] = None
    location: str
    deadline: date

class JobPostingPublic(BaseModel):
    id: int
    title: str
    company_name: str
    department: Optional[str] = None
    description: Optional[str] = None
    daily_allowance: Optional[int] = None
    location: Optional[str] = None
    deadline: Optional[date] = None
    is_active: bool = True
    model_config = {"from_attributes": True}
