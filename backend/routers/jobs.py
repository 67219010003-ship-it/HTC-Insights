from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobPosting, Company, User, UserRole, Report
from schemas.jobs import JobPostingCreate, JobPostingUpdate
from dependencies import get_current_user, require_admin, oauth2_scheme
from auth import decode_token
from routers.notifications import create_notification
import re

router = APIRouter(tags=["jobs"])

def _extract_job_details(p: JobPosting, db: Session) -> dict:
    """ แปลงข้อมูลประกาศงาน พร้อมสกัดข้อมูลผู้ติดต่อและบริษัทให้ครบถ้วน """
    user = p.user
    comp = db.query(Company).filter(Company.id == p.company_id).first() if p.company_id else None
    
    comp_name = comp.name if comp else "สถานประกอบการ"
    logo_url = comp.cover_image_url if comp else None
    lat = comp.lat if comp and comp.lat else 7.0088
    lng = comp.lng if comp and comp.lng else 100.4747
    phone = comp.phone if comp and comp.phone else ""
    poster_email = user.email if user else ""
    contact_email = ""
    contact_person = "ฝ่ายรับสมัครฝึกงาน / HR"
    line_id = ""

    desc = p.description or ""
    if "ผู้ติดต่อ:" in desc:
        cp_match = re.search(r"ผู้ติดต่อ:\s*([^|\(]+)", desc)
        if cp_match:
            contact_person = cp_match.group(1).strip()
        ph_match = re.search(r"\((0[0-9]{1,2}-[0-9]{3,4}-?[0-9]{3,4}|0[0-9]{8,9})\)", desc)
        if ph_match and not phone:
            phone = ph_match.group(1).strip()
    if "อีเมลติดต่อ:" in desc:
        em_match = re.search(r"อีเมลติดต่อ:\s*([^|]+)", desc)
        if em_match:
            contact_email = em_match.group(1).strip()
    if "LINE:" in desc:
        line_match = re.search(r"LINE:\s*([^|]+)", desc)
        if line_match:
            line_id = line_match.group(1).strip()
            if line_id == "-":
                line_id = ""

    if not contact_email:
        contact_email = poster_email

    return {
        "id": p.id,
        "title": p.title,
        "user_id": p.user_id,
        "company_name": comp_name,
        "company_id": p.company_id,
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
        "email": contact_email or poster_email,
        "contact_email": contact_email or poster_email,
        "poster_email": poster_email,
        "contact_person": contact_person,
        "line_id": line_id,
        "logo_url": logo_url,
        "is_active": p.is_active,
        "status": p.status or "pending",
        "rejection_reason": p.rejection_reason,
        "created_at": p.created_at.strftime("%Y-%m-%d") if p.created_at else None,
    }

@router.get("/jobs")
@router.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db)):
    """ ดึงรายการประกาศรับสมัครนักศึกษาฝึกงานที่ผ่านการอนุมัติและยังเปิดรับอยู่ """
    postings = db.query(JobPosting).filter(
        JobPosting.status == "approved",
        JobPosting.is_active == True
    ).order_by(JobPosting.created_at.desc()).all()
    return [_extract_job_details(p, db) for p in postings]

@router.get("/jobs/my-postings")
def get_my_job_postings(current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """ ดึงประวัติประกาศงานทั้งหมดของผู้ใช้งานปัจจุบันโดยตรงจาก User ID """
    postings = db.query(JobPosting).filter(
        JobPosting.user_id == current_user.id
    ).order_by(JobPosting.created_at.desc()).all()
    return [_extract_job_details(p, db) for p in postings]

@router.post("/jobs", status_code=201)
def create_job(data: JobPostingCreate,
               current_user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """ สร้างประกาศรับสมัครงานใหม่ """
    contact_info_str = f"สวัสดิการ: {data.benefits or '-'} | ผู้ติดต่อ: {data.contact_person or '-'} ({data.phone or '-'})"
    if data.email:
        contact_info_str += f" | อีเมลติดต่อ: {data.email}"
    if data.line_id:
        contact_info_str += f" | LINE: {data.line_id}"

    posting = JobPosting(
        user_id=current_user.id,
        company_id=data.company_id,
        title=data.title,
        department=data.department,
        description=contact_info_str,
        daily_allowance=data.daily_allowance or 400,
        location=data.location,
        is_active=False,
        status="pending"
    )
    db.add(posting)
    db.commit()
    db.refresh(posting)
    return {"message": "สร้างประกาศงานสำเร็จ รอการอนุมัติจากผู้ดูแลระบบ", "job_id": posting.id}

@router.get("/jobs/{job_id}")
def get_job_detail(job_id: int, db: Session = Depends(get_db)):
    """ ดึงรายละเอียดของตำแหน่งงานตาม ID """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    return _extract_job_details(job, db)

@router.put("/jobs/{job_id}")
def update_job_posting(job_id: int,
                       data: JobPostingUpdate,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """ แก้ไขประกาศงาน (เฉพาะเจ้าของประกาศหรือ Admin) """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    if job.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(403, "ไม่มีสิทธิ์แก้ไขประกาศงานนี้")

    if data.title:
        job.title = data.title
    if data.department:
        job.department = data.department
    if data.daily_allowance is not None:
        job.daily_allowance = data.daily_allowance
    if data.location:
        job.location = data.location
    if data.is_active is not None:
        job.is_active = data.is_active

    # อัปเดตข้อมูลผู้ติดต่อใน description
    if data.contact_person or data.phone or data.email or data.line_id:
        current_desc = job.description or ""
        benefits = "สวัสดิการมาตรฐาน"
        if "สวัสดิการ:" in current_desc:
            b_match = re.search(r"สวัสดิการ:\s*([^|]+)", current_desc)
            if b_match:
                benefits = b_match.group(1).strip()

        job.description = f"สวัสดิการ: {benefits} | ผู้ติดต่อ: {data.contact_person or '-'} ({data.phone or '-'}) | อีเมลติดต่อ: {data.email or current_user.email} | LINE: {data.line_id or '-'}"

    db.commit()
    db.refresh(job)
    return {"message": "แก้ไขประกาศงานสำเร็จ", "job": _extract_job_details(job, db)}

@router.delete("/jobs/{job_id}")
def delete_job_posting(job_id: int,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """ ลบประกาศงาน (เฉพาะเจ้าของหรือ Admin) """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    if job.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(403, "ไม่มีสิทธิ์ลบประกาศงานนี้")

    db.query(Report).filter(Report.job_id == job_id).delete()
    db.delete(job)
    db.commit()
    return {"message": "ลบประกาศงานเรียบร้อยแล้ว"}

@router.patch("/jobs/{job_id}/toggle-status")
def toggle_job_active(job_id: int,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """ เปิด/ปิดรับสมัครงาน """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    if job.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(403, "ไม่มีสิทธิ์ปรับสถานะประกาศงานนี้")

    job.is_active = not job.is_active
    db.commit()
    status_str = "เปิดรับสมัคร" if job.is_active else "ปิดรับสมัครชั่วคราว"
    return {"message": f"{status_str}เรียบร้อยแล้ว", "is_active": job.is_active}
