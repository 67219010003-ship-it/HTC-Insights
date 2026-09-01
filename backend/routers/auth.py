from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import User, Employer, Company, JobPosting, UserRole, UpgradeRequest, UpgradeRequestStatus
from schemas.auth import StudentRegister, EmployerRegister, LoginRequest, TokenResponse
from auth import hash_password, verify_password, create_access_token, decode_token
from dependencies import get_current_user, get_any_current_user, get_current_user_optional, oauth2_scheme
from services.cloudinary_service import upload_review_photo
from routers.notifications import create_notification
import secrets
import os
import base64
import json
import re

router = APIRouter(prefix="/auth", tags=["auth"])

def parse_google_token_claims(id_token: str, client_id: str):
    """ ตรวจสอบความถูกต้องและถอดรหัส Google ID Token ด้วย Google Auth API อย่างปลอดภัย """
    if not id_token:
        return None

    # อนุญาตเฉพาะการทดสอบอัตโนมัติ (Automated Unit Tests)
    if os.getenv("TESTING") == "1" and id_token == "dummy_token":
        return {
            "email": "student01@htc.ac.th",
            "name": "Student Test",
            "picture": None,
        }

    # 1. ตรวจสอบผ่าน google.oauth2 official library
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests
        aud = client_id if (client_id and client_id != "YOUR_GOOGLE_CLIENT_ID_HERE") else None
        id_info = google_id_token.verify_oauth2_token(id_token, requests.Request(), audience=aud)
        email = id_info.get("email")
        if email and id_info.get("email_verified", True):
            return {
                "email": email,
                "name": id_info.get("name") or email.split("@")[0],
                "picture": id_info.get("picture"),
            }
    except Exception:
        pass

    # 2. ตรวจสอบผ่าน Google TokenInfo Endpoint (Cryptographically validated by Google)
    try:
        import urllib.request
        req_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        with urllib.request.urlopen(req_url, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                email = data.get("email")
                if email and (data.get("email_verified") == "true" or data.get("email_verified") is True):
                    if client_id and client_id != "YOUR_GOOGLE_CLIENT_ID_HERE":
                        if data.get("aud") != client_id:
                            return None
                    return {
                        "email": email,
                        "name": data.get("name") or email.split("@")[0],
                        "picture": data.get("picture"),
                    }
    except Exception:
        pass

    # ❌ ปิดการถอดรหัส unverified payload ออกโดยเด็ดขาด เพื่อป้องกันการ Bypass หรือปลอมแปลง Token จากผู้ไม่ประสงค์ดี
    return None

@router.post("/register/student", status_code=201)
def register_student(data: StudentRegister, db: Session = Depends(get_db)):
    """ สมัครสมาชิกบัญชีนักศึกษาใหม่ พร้อมส่ง Verify Token """
    env_admin_emails = os.getenv("SUPER_ADMIN_EMAILS", "67219010003@htc.ac.th")
    admin_emails = {e.strip() for e in env_admin_emails.split(",") if e.strip()}
    if data.email in admin_emails or data.email == "67219010003@htc.ac.th":
        raise HTTPException(400, "อีเมลผู้ดูแลระบบ (67219010003@htc.ac.th) ต้องเข้าสู่ระบบผ่าน Google Authentication เท่านั้น")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "อีเมลนี้ถูกใช้งานแล้ว")
    token = secrets.token_urlsafe(32)
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        department=data.department,
        level=data.level,
        role=UserRole.student,
        is_verified=False,
        verify_token=token,
    )
    db.add(user)
    db.commit()
    return {"message": "สมัครสำเร็จ กรุณายืนยันอีเมล @htc.ac.th", "verify_token": token}

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """ ยืนยันอีเมลของนักศึกษาเมื่อคลิกลิงก์จาก Token """
    user = db.query(User).filter(User.verify_token == token).first()
    if not user:
        raise HTTPException(400, "Token ไม่ถูกต้องหรือหมดอายุ")
    user.is_verified = True
    user.verify_token = None
    db.commit()
    return {"message": "ยืนยันอีเมลสำเร็จ สามารถ login ได้แล้ว"}

@router.post("/register/employer", status_code=201)
def register_employer(data: EmployerRegister,
                      db: Session = Depends(get_db),
                      current_user: User | None = Depends(get_current_user_optional)):
    """ ลงทะเบียนสถานประกอบการใหม่ และสร้างประกาศงานรอ Admin ตรวจสอบ """
    if data.phone:
        digits_only = re.sub(r"\D", "", data.phone)
        if not digits_only.startswith("0") or (len(digits_only) != 9 and len(digits_only) != 10):
            raise HTTPException(400, "เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 9-10 หลัก เริ่มต้นด้วย 0 (เช่น 000-000-0000 หรือ 000-000-000)")

    from sqlalchemy import func
    # อีเมลบัญชีผู้ลงประกาศ (Poster Account Email)
    poster_email = (current_user.email if current_user else (data.email or "")).strip().lower()
    # อีเมลสำหรับติดต่อรับสมัครงานที่ระบุในฟอร์ม (Contact Email)
    contact_email = (data.contact_email or data.email or "").strip()
    if not poster_email:
        poster_email = contact_email.lower()

    if not poster_email:
        raise HTTPException(400, "กรุณาระบุอีเมลบัญชีผู้ลงประกาศ")

    employer = db.query(Employer).filter(func.lower(Employer.email) == poster_email).first()
    if employer:
        existing_job = db.query(JobPosting).filter(JobPosting.employer_id == employer.id).first()
        if existing_job:
            raise HTTPException(400, "1 บัญชีสามารถลงประกาศรับสมัครฝึกงานได้สูงสุด 1 แห่งเท่านั้น (คุณสามารถดู แก้ไข หรือลบประกาศเดิมได้จากหน้าโปรไฟล์ของคุณ)")

    if not employer:
        employer = Employer(
            email=poster_email,
            password_hash=hash_password(data.password or secrets.token_urlsafe(16)),
            company_name=data.company_name,
            address=data.address,
            industry=data.industry or "ทั่วไป",
            is_approved=False,
        )
        db.add(employer)
        db.commit()
        db.refresh(employer)

    comp = db.query(Company).filter(Company.name == data.company_name).first()
    if not comp:
        comp = Company(
            name=data.company_name,
            address=data.address,
            industry=data.industry or "ทั่วไป",
            lat=data.latitude or 7.0088,
            lng=data.longitude or 100.4747,
            phone=data.phone,
            website=data.website,
            employer_id=employer.id,
            is_verified=False,
        )
        db.add(comp)
        db.commit()
        db.refresh(comp)

    dept_str = ", ".join(data.departments) if data.departments else "แผนกวิชาช่าง"
    allowance_val = 400
    if data.daily_allowance:
        digits = re.sub(r"\D", "", data.daily_allowance)
        if digits:
            try:
                allowance_val = int(digits)
            except ValueError:
                allowance_val = 400

    contact_info_str = f"สวัสดิการ: {data.benefits or '-'} | ผู้ติดต่อ: {data.contact_person or '-'} ({data.phone or '-'})"
    if contact_email:
        contact_info_str += f" | อีเมลติดต่อ: {contact_email}"
    contact_info_str += f" | LINE: {data.line_id or '-'}"

    job_posting = JobPosting(
        employer_id=employer.id,
        company_id=comp.id,
        title=f"นักศึกษาฝึกงาน ({data.company_name})",
        department=dept_str,
        description=contact_info_str,
        daily_allowance=allowance_val,
        location=data.address,
        is_active=False,
        status="pending",
    )
    db.add(job_posting)
    db.commit()
    db.refresh(job_posting)

    admins = db.query(User).filter(User.role == UserRole.admin).all()
    for adm in admins:
        create_notification(
            db=db,
            user_id=adm.id,
            title="มีสถานประกอบการใหม่ลงทะเบียน",
            message=f"สถานประกอบการ '{data.company_name}' ลงทะเบียนเข้าสู่ระบบ รอการตรวจสอบและอนุมัติประกาศงาน",
            type="info",
            link="/admin"
        )

    return {
        "message": "ลงทะเบียนสถานประกอบการเรียบร้อยแล้ว กรุณารอเจ้าหน้าที่ Admin ตรวจสอบและอนุมัติข้อมูล",
        "employer_id": employer.id,
        "job_id": job_posting.id,
        "is_approved": False,
    }

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """ เข้าสู่ระบบด้วย Email/Password ทั่วไป (บล็อก Admin ทุกบัญชีให้เข้าผ่าน Google Auth เท่านั้น) """
    env_admin_emails = os.getenv("SUPER_ADMIN_EMAILS", "67219010003@htc.ac.th")
    admin_emails = {e.strip() for e in env_admin_emails.split(",") if e.strip()}
    if data.email in admin_emails or data.email == "67219010003@htc.ac.th":
        raise HTTPException(403, "บัญชีผู้ดูแลระบบ (67219010003@htc.ac.th) ต้องเข้าสู่ระบบด้วย Google Authentication เท่านั้น เพื่อความปลอดภัยสูงสุด")

    if data.role == "student":
        user = db.query(User).filter(User.email == data.email).first()
        if user and (user.role == UserRole.admin or user.is_super_admin):
            raise HTTPException(403, "บัญชีผู้ดูแลระบบ (Admin) ต้องเข้าสู่ระบบด้วย Google Authentication เท่านั้น เพื่อความปลอดภัยสูงสุด")
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
        if not user.is_verified:
            raise HTTPException(403, "กรุณายืนยันอีเมลก่อน")
        token = create_access_token({"sub": user.id, "role": user.role.value})
        return TokenResponse(access_token=token, role=user.role.value)
    elif data.role == "employer":
        emp = db.query(Employer).filter(Employer.email == data.email).first()
        if not emp or not verify_password(data.password, emp.password_hash):
            raise HTTPException(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
        if not emp.is_approved:
            raise HTTPException(403, "บัญชียังรอ Admin อนุมัติ")
        token = create_access_token({"sub": emp.id, "role": "employer"})
        return TokenResponse(access_token=token, role="employer")
    raise HTTPException(400, "role ต้องเป็น student หรือ employer")

@router.post("/google")
def google_auth(payload: dict = Body(...), db: Session = Depends(get_db)):
    """ เข้าสู่ระบบด้วย Google Identity Services และตรวจสอบสิทธิ์นักศึกษา/Admin อัตโนมัติ """
    id_token = payload.get("id_token") or payload.get("credential")
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    college_domain = os.getenv("COLLEGE_DOMAIN", "htc.ac.th")
    
    claims = parse_google_token_claims(id_token, client_id)
    if not claims or not claims.get("email"):
        raise HTTPException(400, "Google ID Token ไม่ถูกต้องหรือหมดอายุ")

    email = claims["email"]
    name = claims.get("name") or email.split("@")[0]
    picture = claims.get("picture")

    user = db.query(User).filter(User.email == email).first()
    is_college = email.endswith(f"@{college_domain}")

    if not user:
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(16)),
            name=name,
            department="แผนกวิชาเทคโนโลยีสารสนเทศ" if is_college else "บุคคลภายนอก/สถานประกอบการ",
            level="ปวส." if is_college else "-",
            role=UserRole.student if is_college else UserRole.external,
            is_verified=True,
            avatar_url=picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    env_admin_emails = os.getenv("SUPER_ADMIN_EMAILS", "67219010003@htc.ac.th")
    ADMIN_EMAILS = {e.strip() for e in env_admin_emails.split(",") if e.strip()}
    if email in ADMIN_EMAILS:
        user.role = UserRole.admin
        user.is_super_admin = True
        db.commit()
    elif is_college and user.role == UserRole.external:
        user.role = UserRole.student
        db.commit()
    elif not is_college and not user.is_super_admin and user.role != UserRole.admin:
        approved_upgrade = db.query(UpgradeRequest).filter(
            UpgradeRequest.user_id == user.id,
            UpgradeRequest.status == UpgradeRequestStatus.approved
        ).first()
        if not approved_upgrade and user.role != UserRole.external:
            user.role = UserRole.external
            db.commit()

    token = create_access_token({"sub": user.id, "role": user.role.value, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "is_super_admin": user.is_super_admin,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "is_super_admin": user.is_super_admin,
            "department": user.department,
            "level": user.level,
            "avatar_url": user.avatar_url,
        }
    }

@router.post("/upload-proof")
def upload_proof_file(file: UploadFile = File(...), current_user: User = Depends(get_any_current_user)):
    """ อัปโหลดรูปภาพหลักฐาน เช่น บัตรประจำตัวนักศึกษา ขึ้นสู่ Cloudinary """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(400, "ไฟล์ต้องเป็นรูปภาพเท่านั้น")
    try:
        content = file.file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(400, "ขนาดไฟล์ห้ามเกิน 5MB")
        url = upload_review_photo(content, file.filename or "proof.jpg")
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: {str(e)}")

@router.post("/request-student-verification")
def request_student_verification(payload: dict = Body(...),
                                 db: Session = Depends(get_db),
                                 current_user: User = Depends(get_any_current_user)):
    """ ส่งคำขอยืนยันสิทธิ์นักศึกษาสำหรับผู้ที่ใช้อีเมลส่วนตัว (Personal Gmail) """
    student_id = payload.get("student_id", "")
    department = payload.get("department", "")
    phone = payload.get("phone", "")
    reason = payload.get("reason", "")
    card_image_url = payload.get("card_image_url", None)

    clean_student_id = re.sub(r"\D", "", str(student_id))
    if len(clean_student_id) != 11:
        raise HTTPException(400, "รหัสนักศึกษาต้องเป็นตัวเลข 11 หลักเท่านั้น (เช่น 67xxxxxxxx)")

    if not card_image_url:
        raise HTTPException(400, "กรุณาแนบรูปภาพหลักฐานบัตรประจำตัวนักศึกษา")

    if phone:
        digits_only = re.sub(r"\D", "", phone)
        if len(digits_only) < 9 or len(digits_only) > 10:
            raise HTTPException(400, "เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 9-10 หลัก (เช่น 000-000-0000)")

    existing = db.query(UpgradeRequest).filter(
        UpgradeRequest.user_id == current_user.id,
        UpgradeRequest.status == UpgradeRequestStatus.pending
    ).first()
    if existing:
        raise HTTPException(400, "คุณมียื่นคำขอตรวจสอบสิทธิ์นักศึกษาที่รอดำเนินการอยู่แล้ว")

    req = UpgradeRequest(
        user_id=current_user.id,
        student_id=clean_student_id,
        department=department or current_user.department,
        phone=phone,
        reason=reason,
        card_image_url=card_image_url,
        status=UpgradeRequestStatus.pending
    )
    db.add(req)
    db.commit()

    return {
        "message": "ยื่นคำขอตรวจสอบสิทธิ์นักศึกษาเรียบร้อยแล้ว เจ้าหน้าที่จะทำการตรวจสอบข้อมูลภายใน 1-2 วันทำการ",
        "user_id": current_user.id,
        "student_id": student_id,
        "department": department
    }

@router.get("/my-upgrade-request")
def get_my_upgrade_request(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_current_user)
):
    """ ดึงประวัติคำขอยืนยันสิทธิ์นักศึกษาล่าสุดของผู้ใช้งานปัจจุบัน """
    req = db.query(UpgradeRequest).filter(
        UpgradeRequest.user_id == current_user.id
    ).order_by(UpgradeRequest.created_at.desc()).first()

    if not req:
        return {"has_request": False, "request": None}

    return {
        "has_request": True,
        "request": {
            "id": req.id,
            "student_id": req.student_id,
            "department": req.department,
            "phone": req.phone,
            "reason": req.reason,
            "card_image_url": req.card_image_url,
            "status": req.status.value,
            "rejection_reason": req.rejection_reason,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        }
    }

@router.put("/my-upgrade-request")
def update_my_upgrade_request(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_current_user)
):
    """ แก้ไขคำขอยืนยันสิทธิ์นักศึกษา (เฉพาะสถานะ pending หรือ rejected) """
    req = db.query(UpgradeRequest).filter(
        UpgradeRequest.user_id == current_user.id
    ).order_by(UpgradeRequest.created_at.desc()).first()

    if not req:
        raise HTTPException(404, "ไม่พบประวัติคำขอยืนยันสิทธิ์")

    if req.status == UpgradeRequestStatus.approved:
        raise HTTPException(400, "คำขอนี้ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขได้")

    student_id = payload.get("student_id")
    if student_id:
        clean_student_id = re.sub(r"\D", "", str(student_id))
        if len(clean_student_id) != 11:
            raise HTTPException(400, "รหัสนักศึกษาต้องเป็นตัวเลข 11 หลักเท่านั้น (เช่น 67xxxxxxxx)")
        req.student_id = clean_student_id

    if "department" in payload and payload["department"]:
        req.department = payload["department"]

    if "phone" in payload:
        phone = payload["phone"] or ""
        if phone:
            digits_only = re.sub(r"\D", "", phone)
            if len(digits_only) < 9 or len(digits_only) > 10:
                raise HTTPException(400, "เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 9-10 หลัก (เช่น 000-000-0000)")
        req.phone = phone

    if "reason" in payload:
        req.reason = payload["reason"]

    if "card_image_url" in payload and payload["card_image_url"]:
        req.card_image_url = payload["card_image_url"]

    # Reset status to pending so admin can re-review
    req.status = UpgradeRequestStatus.pending
    req.rejection_reason = None
    db.commit()
    db.refresh(req)

    return {
        "message": "แก้ไขและส่งคำขอยืนยันสิทธิ์ใหม่เรียบร้อยแล้ว",
        "request": {
            "id": req.id,
            "student_id": req.student_id,
            "department": req.department,
            "phone": req.phone,
            "reason": req.reason,
            "card_image_url": req.card_image_url,
            "status": req.status.value,
            "rejection_reason": req.rejection_reason,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        }
    }

@router.delete("/my-upgrade-request")
def delete_my_upgrade_request(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_current_user)
):
    """ ลบ/ยกเลิกคำขอยืนยันสิทธิ์นักศึกษา (เฉพาะที่ยังไม่อนุมัติ) """
    req = db.query(UpgradeRequest).filter(
        UpgradeRequest.user_id == current_user.id
    ).order_by(UpgradeRequest.created_at.desc()).first()

    if not req:
        raise HTTPException(404, "ไม่พบประวัติคำขอยืนยันสิทธิ์")

    if req.status == UpgradeRequestStatus.approved:
        raise HTTPException(400, "คำขอนี้ได้รับการอนุมัติแล้ว ไม่สามารถลบได้")

    db.delete(req)
    db.commit()

    return {"message": "ลบคำขอยืนยันสิทธิ์เรียบร้อยแล้ว"}

@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """ ดึงข้อมูลโปรไฟล์ผู้ใช้งานปัจจุบัน """
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        raw_sub = payload.get("sub")
        role: str = payload.get("role")
        sub_id = int(raw_sub) if raw_sub is not None else None
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "employer":
        emp = db.query(Employer).filter(Employer.id == sub_id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employer not found")
        return {
            "id": emp.id,
            "email": emp.email,
            "name": emp.company_name,
            "role": "employer",
            "is_super_admin": False,
            "is_approved": bool(emp.is_approved),
            "avatar_url": emp.logo_url,
            "company_name": emp.company_name,
            "industry": emp.industry,
            "address": emp.address,
        }

    user = db.query(User).filter(User.id == sub_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "is_super_admin": user.is_super_admin,
        "department": user.department,
        "level": user.level,
        "avatar_url": user.avatar_url,
    }

@router.delete("/me")
def delete_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """ ลบบัญชีผู้ใช้งานปัจจุบันออกจากระบบ """
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}
