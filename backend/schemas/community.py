from pydantic import BaseModel
from typing import Optional

class PostCreate(BaseModel):
    type: str       # experience | qa | tips | team
    department: Optional[str] = None
    title: str
    content: str
    is_anonymous: bool = False

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None
    is_anonymous: bool = False

class ReportCreate(BaseModel):
    post_id: Optional[int] = None
    review_id: Optional[int] = None
    reason: str
