from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Report, User
from dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

class ReportCreate(BaseModel):
    review_id: Optional[int] = None
    post_id: Optional[int] = None
    comment_id: Optional[int] = None
    job_id: Optional[int] = None
    company_id: Optional[int] = None
    reason: str

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_report(
    report_data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ ส่งรายงานเนื้อหาไม่เหมาะสม (รีวิว, กระทู้, ความเห็น, ประกาศงาน, บริษัท) ไปให้ Admin ตรวจสอบ """
    if not any([
        report_data.review_id,
        report_data.post_id,
        report_data.comment_id,
        report_data.job_id,
        report_data.company_id
    ]):
        raise HTTPException(
            status_code=400,
            detail="At least one target ID (review_id, post_id, comment_id, job_id, company_id) must be provided."
        )

    if not report_data.reason or not report_data.reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Reason is required."
        )

    report = Report(
        reporter_id=current_user.id,
        review_id=report_data.review_id,
        post_id=report_data.post_id,
        comment_id=report_data.comment_id,
        job_id=report_data.job_id,
        company_id=report_data.company_id,
        reason=report_data.reason,
        status="pending"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "review_id": report.review_id,
        "post_id": report.post_id,
        "comment_id": report.comment_id,
        "job_id": report.job_id,
        "company_id": report.company_id,
        "reason": report.reason,
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }
