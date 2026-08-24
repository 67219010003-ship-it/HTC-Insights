from pydantic import BaseModel, Field
from typing import Optional

class PostCreate(BaseModel):
    type: str = Field(..., pattern=r"^(experience|qa|tips|team)$", description="ประเภทกระทู้")
    department: Optional[str] = Field(None, max_length=100)
    title: str = Field(..., min_length=5, max_length=120, description="หัวข้อกระทู้ 5-120 ตัวอักษร")
    content: str = Field(..., min_length=10, max_length=2500, description="เนื้อหากระทู้ 10-2500 ตัวอักษร")
    is_anonymous: bool = False

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=2, max_length=600, description="ความคิดเห็น 2-600 ตัวอักษร")
    parent_id: Optional[int] = None
    is_anonymous: bool = False

class ReportCreate(BaseModel):
    post_id: Optional[int] = None
    review_id: Optional[int] = None
    comment_id: Optional[int] = None
    job_id: Optional[int] = None
    company_id: Optional[int] = None
    reason: str = Field(..., min_length=5, max_length=300, description="เหตุผลการรายงาน 5-300 ตัวอักษร")
