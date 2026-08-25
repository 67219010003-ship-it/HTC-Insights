from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class JobPostingCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=120, description="ตำแหน่งงาน 5-120 ตัวอักษร")
    department: str = Field(..., min_length=2, max_length=100, description="แผนกวิชา")
    description: str = Field(..., min_length=20, max_length=2000, description="รายละเอียดงาน 20-2000 ตัวอักษร")
    daily_allowance: Optional[int] = Field(None, ge=0, le=5000, description="เบี้ยเลี้ยง 0-5000 บาท/วัน")
    location: str = Field(..., min_length=3, max_length=250, description="สถานที่ปฏิบัติงาน 3-250 ตัวอักษร")
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
    status: Optional[str] = "pending"
    rejection_reason: Optional[str] = None
    created_at: Optional[str] = None
    model_config = {"from_attributes": True}
