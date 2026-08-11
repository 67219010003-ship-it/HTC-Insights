from pydantic import BaseModel
from typing import Optional
from datetime import date

class ReviewCreate(BaseModel):
    company_id: int
    gender: str          # "male" | "female" | "prefer_not"
    period_start: date
    period_end: date
    department: str
    daily_allowance: Optional[int] = None
    has_transport: bool = False
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    score_overall: float
    score_work: Optional[float] = None
    score_env: Optional[float] = None
    score_mentor: Optional[float] = None
    score_welfare: Optional[float] = None
    text_work: str       # min 50 chars enforced in router
    text_pros: Optional[str] = None
    text_cons: Optional[str] = None
    text_advice: Optional[str] = None
    is_anonymous: bool = False

class ReviewPublic(BaseModel):
    id: int
    company_id: int
    user_id: Optional[int] = None
    gender: str
    department: Optional[str] = None
    daily_allowance: Optional[int] = None
    has_transport: bool = False
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    score_overall: float
    score_work: Optional[float] = None
    score_env: Optional[float] = None
    score_mentor: Optional[float] = None
    score_welfare: Optional[float] = None
    text_work: str
    text_pros: Optional[str] = None
    text_cons: Optional[str] = None
    text_advice: Optional[str] = None
    is_anonymous: bool
    author_name: Optional[str] = None   # None if anonymous
    author_department: Optional[str] = None
    photo_urls: list[str] = []
    status: str
    created_at: Optional[str] = None
    model_config = {"from_attributes": True}
