from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobPosting, Employer, Company
from schemas.jobs import JobPostingCreate, JobPostingPublic
from dependencies import get_current_employer

router = APIRouter(tags=["jobs"])

@router.get("/jobs")
@router.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db)):
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
    posting = JobPosting(employer_id=employer.id, **data.model_dump())
    db.add(posting)
    db.commit()
    db.refresh(posting)
    return {"message": "สร้างประกาศสำเร็จ", "posting_id": posting.id}

@router.get("/employer/postings", response_model=list[JobPostingPublic])
def get_employer_postings(employer: Employer = Depends(get_current_employer),
                          db: Session = Depends(get_db)):
    postings = db.query(JobPosting).filter(JobPosting.employer_id == employer.id).order_by(JobPosting.created_at.desc()).all()
    return [
        JobPostingPublic(
            id=p.id, title=p.title,
            company_name=employer.company_name,
            department=p.department,
            description=p.description,
            daily_allowance=p.daily_allowance,
            location=p.location,
            deadline=p.deadline,
            is_active=p.is_active,
        ) for p in postings
    ]

@router.delete("/employer/postings/{posting_id}")
def close_posting(posting_id: int,
                  employer: Employer = Depends(get_current_employer),
                  db: Session = Depends(get_db)):
    posting = db.query(JobPosting).filter(
        JobPosting.id == posting_id,
        JobPosting.employer_id == employer.id
    ).first()
    if not posting:
        raise HTTPException(404, "ไม่พบประกาศ")
    posting.is_active = False
    db.commit()
    return {"message": "ปิดประกาศสำเร็จ"}
