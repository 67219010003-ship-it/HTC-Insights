from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobPosting, Employer, Company, User, UserRole, Report
from schemas.jobs import JobPostingCreate, JobPostingUpdate, JobPostingPublic
from dependencies import oauth2_scheme, get_current_employer
from auth import decode_token
from routers.notifications import create_notification
import re

router = APIRouter(tags=["jobs"])

def get_current_user_or_employer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """ ดึงข้อมูลผู้ใช้งานหรือสถานประกอบการปัจจุบันจาก Token เพื่อตรวจสอบสิทธิ์เจ้าของประกาศงาน """
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        raw_sub = payload.get("sub")
        role = payload.get("role")
        sub_id = int(raw_sub) if raw_sub is not None else None
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if role == "employer":
        emp = db.query(Employer).filter(Employer.id == sub_id).first()
        if not emp:
            raise HTTPException(404, "Employer not found")
        return {"type": "employer", "id": emp.id, "email": emp.email, "role": "employer", "obj": emp}
    
    user = db.query(User).filter(User.id == sub_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return {"type": "user", "id": user.id, "email": user.email, "role": user.role.value, "obj": user}

def _extract_job_details(p: JobPosting, db: Session) -> dict:
    """ ฟังก์ชันแปลงข้อมูลตำแหน่งงาน พร้อมสกัดข้อมูลผู้ติดต่อและบริษัทให้ครบถ้วน """
    emp = p.employer
    comp = db.query(Company).filter(Company.id == p.company_id).first() if p.company_id else None
    
    comp_name = emp.company_name if emp else (comp.name if comp else "สถานประกอบการ")
    logo_url = emp.logo_url if emp and emp.logo_url else (comp.cover_image_url if comp else None)
    lat = comp.lat if comp and comp.lat else 7.0088
    lng = comp.lng if comp and comp.lng else 100.4747
    phone = comp.phone if comp and comp.phone else ""
    poster_email = emp.email if emp else ""
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
        "employer_email": poster_email,
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
def get_my_job_postings(auth: dict = Depends(get_current_user_or_employer),
                        db: Session = Depends(get_db)):
    """ ดึงประวัติประกาศงานทั้งหมดของผู้ใช้งานปัจจุบัน (ทั้งผู้ใช้ภายนอกและบัญชีสถานประกอบการ) """
    if auth["type"] == "employer":
        postings = db.query(JobPosting).filter(
            JobPosting.employer_id == auth["id"]
        ).order_by(JobPosting.created_at.desc()).all()
    else:
        # ค้นหาผ่าน Employer ที่ใช้อีเมลเดียวกันกับ User (แบบ Case-Insensitive) หรือที่ตรงกับใน JobPosting
        from sqlalchemy import func, or_
        user_email = (auth.get("email") or "").lower().strip()
        if not user_email:
            return []
        employers = db.query(Employer).filter(func.lower(Employer.email) == user_email).all()
        emp_ids = [e.id for e in employers]
        
        query = db.query(JobPosting)
        if emp_ids:
            query = query.filter(
                or_(
                    JobPosting.employer_id.in_(emp_ids),
                    JobPosting.description.ilike(f"%{user_email}%")
                )
            )
        else:
            query = query.filter(JobPosting.description.ilike(f"%{user_email}%"))
            
        postings = query.order_by(JobPosting.created_at.desc()).all()

    return [_extract_job_details(p, db) for p in postings]

@router.post("/employer/postings", status_code=201)
def create_posting(data: JobPostingCreate,
                   employer: Employer = Depends(get_current_employer),
                   db: Session = Depends(get_db)):
    """ สถานประกอบการสร้างประกาศรับสมัครฝึกงานใหม่ (จำกัด 1 บัญชี 1 ที่) """
    existing_job = db.query(JobPosting).filter(JobPosting.employer_id == employer.id).first()
    if existing_job:
        raise HTTPException(status_code=400, detail="1 บัญชีสามารถลงประกาศรับสมัครฝึกงานได้สูงสุด 1 แห่งเท่านั้น (คุณสามารถแก้ไขหรือลบประกาศเดิมได้จากหน้าโปรไฟล์)")

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
    return [_extract_job_details(p, db) for p in postings]

@router.put("/jobs/{job_id}")
def update_job_posting(job_id: int,
                       data: JobPostingUpdate,
                       auth: dict = Depends(get_current_user_or_employer),
                       db: Session = Depends(get_db)):
    """ แก้ไขประกาศรับสมัครฝึกงานของตนเอง """
    p = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not p:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    
    # ตรวจสอบสิทธิ์เจ้าของประกาศงาน
    is_owner = False
    if auth["type"] == "employer" and p.employer_id == auth["id"]:
        is_owner = True
    elif auth["type"] == "user":
        if auth["role"] == "admin":
            is_owner = True
        elif p.employer and p.employer.email == auth["email"]:
            is_owner = True
    
    if not is_owner:
        raise HTTPException(403, "คุณไม่มีสิทธิ์แก้ไขประกาศงานนี้")

    if data.title is not None:
        p.title = data.title.strip()
    if data.department is not None:
        p.department = data.department.strip()
    if data.daily_allowance is not None:
        p.daily_allowance = data.daily_allowance
    if data.location is not None:
        p.location = data.location.strip()
    if data.is_active is not None:
        p.is_active = data.is_active

    # อัปเดตข้อมูลผู้ติดต่อและรายละเอียดงาน
    if data.description is not None:
        p.description = data.description.strip()
    elif data.contact_person or data.phone or data.line_id:
        benefits_str = "-"
        if p.description and "สวัสดิการ:" in p.description:
            b_match = re.search(r"สวัสดิการ:\s*([^|]+)", p.description)
            if b_match: benefits_str = b_match.group(1).strip()
        
        cp = data.contact_person or "ฝ่ายรับสมัครฝึกงาน / HR"
        ph = data.phone or "-"
        ln = data.line_id or "-"
        p.description = f"สวัสดิการ: {benefits_str} | ผู้ติดต่อ: {cp} ({ph}) | LINE: {ln}"

    # เมื่อมีการแก้ไขประกาศงาน ให้ปรับสถานะกลับเป็น pending รอ Admin ตรวจสอบใหม่ (ถ้าไม่ใช่ Admin แก้ไข)
    if auth["role"] != "admin":
        p.status = "pending"

    db.commit()
    db.refresh(p)
    return {"message": "แก้ไขประกาศงานเรียบร้อยแล้ว (ส่งให้ Admin ตรวจสอบใหม่)", "posting": _extract_job_details(p, db)}

@router.delete("/jobs/{job_id}")
def delete_job_posting(job_id: int,
                       auth: dict = Depends(get_current_user_or_employer),
                       db: Session = Depends(get_db)):
    """ ลบประกาศรับสมัครฝึกงานของตนเอง """
    p = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not p:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    
    is_owner = False
    if auth["type"] == "employer" and p.employer_id == auth["id"]:
        is_owner = True
    elif auth["type"] == "user":
        if auth["role"] == "admin":
            is_owner = True
        elif p.employer and p.employer.email == auth["email"]:
            is_owner = True
    
    if not is_owner:
        raise HTTPException(403, "คุณไม่มีสิทธิ์ลบประกาศงานนี้")

    # ลบรายงานที่เกี่ยวข้อง
    db.query(Report).filter(Report.job_id == job_id).delete()
    db.delete(p)
    db.commit()
    return {"message": "ลบประกาศงานเรียบร้อยแล้ว"}

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

