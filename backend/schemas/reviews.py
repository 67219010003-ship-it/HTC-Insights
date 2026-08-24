from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import date
import re

class ReviewCreate(BaseModel):
    company_id: int
    gender: str = Field(..., pattern=r"^(male|female|prefer_not)$")
    period_start: date
    period_end: date
    department: str = Field(..., min_length=2, max_length=100)
    daily_allowance: Optional[int] = Field(None, ge=0, le=99999, description="เบี้ยเลี้ยง 0-99,999 บาท/วัน")
    has_transport: bool = False
    work_start_time: Optional[str] = Field(None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="เวลาเริ่มงาน HH:MM")
    work_end_time: Optional[str] = Field(None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="เวลาเลิกงาน HH:MM")
    score_overall: float = Field(..., ge=1.0, le=5.0)
    score_work: Optional[float] = Field(None, ge=1.0, le=5.0)
    score_env: Optional[float] = Field(None, ge=1.0, le=5.0)
    score_mentor: Optional[float] = Field(None, ge=1.0, le=5.0)
    score_welfare: Optional[float] = Field(None, ge=1.0, le=5.0)
    text_work: str = Field(..., min_length=30, max_length=1000, description="ลักษณะงาน 30-1000 ตัวอักษร")
    text_pros: Optional[str] = Field(None, max_length=500, description="ข้อดี สูงสุด 500 ตัวอักษร")
    text_cons: Optional[str] = Field(None, max_length=500, description="ข้อเสีย สูงสุด 500 ตัวอักษร")
    text_advice: Optional[str] = Field(None, max_length=500, description="คำแนะนำ สูงสุด 500 ตัวอักษร")
    is_anonymous: bool = False

    @model_validator(mode="after")
    def validate_dates_and_times(self):
        if self.period_start and self.period_end and self.period_start > self.period_end:
            raise ValueError("วันที่เริ่มฝึกงานต้องไม่เกินวันที่สิ้นสุดฝึกงาน")
        return self

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
