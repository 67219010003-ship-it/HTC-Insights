from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobPosting, Employer, Company, User, UserRole
from schemas.jobs import JobPostingCreate, JobPostingPublic
from dependencies import get_current_employer
from routers.notifications import create_notification

router = APIRouter(tags=["jobs"])

@router.get("/jobs")
@router.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db)):
    """ ดึงรายการประกาศรับสมัครนักศึกษาฝึกงานที่ผ่านการอนุมัติและยังเปิดรับอยู่ """
    postings = db.query(JobPosting).filter(
        JobPosting.status == "approved",
        JobPosting.is_active == True
    ).order_by(JobPosting.created_at.desc()).all()
    results = []
    for p in postings:
        comp = p.employer.company_name if p.employer else "Unknown"
        lat = 7.0088
        lng = 100.4747
        phone = ""
        email = p.employer.email if p.employer else ""
        if p.company_id:
            c = db.query(Company).filter(Company.id == p.company_id).first()
            if c:
                if c.lat: lat = c.lat
                if c.lng: lng = c.lng
                if c.phone: phone = c.phone
        results.append({
            "id": p.id,
            "title": p.title,
            "company_name": comp,
            "department": p.department,
            "description": p.description,
            "daily_allowance": p.daily_allowance or 400,
            "allowance_range": f"{p.daily_allowance or 400} / วัน",
            "location": p.location,
            "work_type": "ฝึกงาน (Internship)",
            "highlights": [
                f"แผนกที่เปิดรับ: {p.department or 'แผนกวิชาช่าง'}",
                f"เบี้ยเลี้ยงรายวัน: ฿{p.daily_allowance or 400}/วัน",
            ],
            "responsibilities": [
                f"ปฏิบัติงานฝึกงานตามแผนก {p.department or 'ที่เกี่ยวข้อง'}",
                "เรียนรู้การทำงานร่วมกับช่างเทคนิคและทีมงานมืออาชีพ",
            ],
            "qualifications": [
                f"นักศึกษาวิทยาลัยเทคนิคหาดใหญ่ สาขา {p.department or 'ที่เกี่ยวข้อง'}",
                "ขยัน ตรงต่อเวลา และซื่อสัตย์",
            ],
            "benefits": [
                f"เบี้ยเลี้ยงรายวัน ฿{p.daily_allowance or 400}/วัน",
                "สวัสดิการมาตรฐานสถานประกอบการ",
            ],
            "posted_time": "เพิ่งลงประกาศเมื่อครู่",
            "latitude": lat,
            "longitude": lng,
            "phone": phone,
            "email": email,
            "contact_person": "ฝ่ายรับสมัครฝึกงาน / HR",
            "is_active": p.is_active,
        })
    return results

@router.post("/employer/postings", status_code=201)
def create_posting(data: JobPostingCreate,
                   employer: Employer = Depends(get_current_employer),
                   db: Session = Depends(get_db)):
    """ สถานประกอบการสร้างประกาศรับสมัครฝึกงานใหม่ (ส่งรอ Admin อนุมัติ) """
    posting = JobPosting(employer_id=employer.id, status="pending", is_active=True, **data.model_dump())
    db.add(posting)
    db.commit()
    db.refresh(posting)

    admins = db.query(User).filter(User.role == UserRole.admin).all()
    for adm in admins:
        create_notification(
            db=db,
            user_id=adm.id,
            title="มีตำแหน่งงานใหม่รอการอนุมัติ",
            message=f"สถานประกอบการ '{employer.company_name}' ได้ลงประกาศ '{posting.title[:35]}' รอการตรวจสอบจาก Admin",
            type="info",
            link="/admin",
        )

    return {"message": "สร้างประกาศงานสำเร็จ (อยู่ระหว่างรอ Admin อนุมัติ)", "posting_id": posting.id}

@router.get("/employer/postings", response_model=list[JobPostingPublic])
def get_employer_postings(employer: Employer = Depends(get_current_employer),
                          db: Session = Depends(get_db)):
    """ ดึงประวัติประกาศงานทั้งหมดของสถานประกอบการปัจจุบัน """
    postings = db.query(JobPosting).filter(JobPosting.employer_id == employer.id).order_by(JobPosting.created_at.desc()).all()
    return [
        JobPostingPublic(
            id=p.id, title=p.title,
            company_name=employer.company_name,
            department=p.department,
            description=p.description,
            daily_allowance=p.daily_allowance,
            location=p.location, is_active=p.is_active,
            status=p.status or "pending",
            rejection_reason=p.rejection_reason,
            created_at=p.created_at.strftime("%Y-%m-%d") if p.created_at else None,
        )
        for p in postings
    ]

@router.patch("/employer/postings/{posting_id}/toggle")
def toggle_posting(posting_id: int,
                   employer: Employer = Depends(get_current_employer),
                   db: Session = Depends(get_db)):
    """ เปิด/ปิด การรับสมัครของตำแหน่งงาน """
    p = db.query(JobPosting).filter(JobPosting.id == posting_id, JobPosting.employer_id == employer.id).first()
    if not p:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    p.is_active = not p.is_active
    db.commit()
    return {"message": "เปลี่ยนสถานะสำเร็จ", "is_active": p.is_active}
