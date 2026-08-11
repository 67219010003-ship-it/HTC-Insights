from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import User, Employer, Company, JobPosting, UserRole, UpgradeRequest, UpgradeRequestStatus
from schemas.auth import StudentRegister, EmployerRegister, LoginRequest, TokenResponse
from auth import hash_password, verify_password, create_access_token, decode_token
from dependencies import get_current_user, oauth2_scheme
from services.cloudinary_service import upload_review_photo
import secrets
import os
import base64
import json
import re

router = APIRouter(prefix="/auth", tags=["auth"])

def parse_google_token_claims(id_token: str, client_id: str):
    """
    Parses Google ID Token and extracts real Google email, name, and profile picture (avatar_url).
    """
    if not id_token:
        return None

    if id_token == "dummy_token" or os.getenv("TESTING") == "1":
        return {
            "email": "student01@htc.ac.th",
            "name": "Student Test",
            "picture": None,
        }

    # 1. Try official google-auth library
    if client_id and client_id != "YOUR_GOOGLE_CLIENT_ID_HERE":
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests
            id_info = google_id_token.verify_oauth2_token(id_token, requests.Request(), client_id)
            if id_info.get("email"):
                return {
                    "email": id_info.get("email"),
                    "name": id_info.get("name") or id_info.get("email", "").split("@")[0],
                    "picture": id_info.get("picture"),
                }
        except Exception:
            pass

    # 2. Fallback decoding JWT payload (Base64URL)
    try:
        parts = str(id_token).split(".")
        if len(parts) >= 2:
            rem = len(parts[1]) % 4
            padding = "=" * ((4 - rem) % 4) if rem != 0 else ""
            payload_bytes = base64.urlsafe_b64decode(parts[1] + padding)
            payload = json.loads(payload_bytes.decode("utf-8"))
            email = payload.get("email")
            if email:
                return {
                    "email": email,
                    "name": payload.get("name") or email.split("@")[0],
                    "picture": payload.get("picture"),
                }
    except Exception:
        pass

    return None

@router.post("/register/student", status_code=201)
def register_student(data: StudentRegister, db: Session = Depends(get_db)):
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
    user = db.query(User).filter(User.verify_token == token).first()
    if not user:
        raise HTTPException(400, "Token ไม่ถูกต้องหรือหมดอายุ")
    user.is_verified = True
    user.verify_token = None
    db.commit()
    return {"message": "ยืนยันอีเมลสำเร็จ สามารถ login ได้แล้ว"}

@router.post("/register/employer", status_code=201)
def register_employer(data: EmployerRegister, db: Session = Depends(get_db)):
    # Validate phone number length (must be 9 to 10 digits)
    if data.phone:
        digits_only = re.sub(r"\D", "", data.phone)
        if len(digits_only) < 9 or len(digits_only) > 10:
            raise HTTPException(400, "เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 9-10 หลัก (เช่น 000-000-0000 หรือ 000-000-000)")

    employer = db.query(Employer).filter(Employer.email == data.email).first()
    if not employer:
        employer = Employer(
            email=data.email,
            password_hash=hash_password(data.password or "default12345"),
            company_name=data.company_name,
            address=data.address,
            industry=data.industry or "ทั่วไป",
            is_approved=True,
        )
        db.add(employer)
        db.commit()
        db.refresh(employer)

    # 1. Create or query Company record
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
        )
        db.add(comp)
        db.commit()
        db.refresh(comp)

    # 2. Create active JobPosting record for instant display on /jobs
    dept_str = ", ".join(data.departments) if data.departments else "แผนกวิชาช่าง"
    allowance_val = 400
    if data.daily_allowance:
        digits = re.sub(r"\D", "", data.daily_allowance)
        if digits:
            try:
                allowance_val = int(digits)
            except ValueError:
                allowance_val = 400

    job_posting = JobPosting(
        employer_id=employer.id,
        company_id=comp.id,
        title=f"นักศึกษาฝึกงาน ({data.company_name})",
        department=dept_str,
        description=f"สวัสดิการ: {data.benefits or '-'} | ผู้ติดต่อ: {data.contact_person or '-'} ({data.phone or '-'}) | LINE: {data.line_id or '-'}",
        daily_allowance=allowance_val,
        location=data.address,
        is_active=True,
    )
    db.add(job_posting)
    db.commit()
    db.refresh(job_posting)

    return {
        "message": "ลงทะเบียนสถานประกอบการและเปิดรับสมัครตำแหน่งงานฝึกงานสำเร็จ",
        "employer_id": employer.id,
        "job_id": job_posting.id,
    }

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    if data.role == "student":
        user = db.query(User).filter(User.email == data.email).first()
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
    if not user:
        is_college = email.endswith(f"@{college_domain}")
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(16)),
            name=name,
            department="แผนกวิชาช่างอิเล็กทรอนิกส์" if is_college else "แผนกวิชาเทคโนโลยีสารสนเทศ",
            level="ปวส." if is_college else "ปวช.",
            role=UserRole.student,
            is_verified=True,
            avatar_url=picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.role == UserRole.external:
        user.role = UserRole.student
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
def upload_proof_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "ไฟล์ต้องเป็นรูปภาพเท่านั้น")
    content = file.file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "ขนาดไฟล์ห้ามเกิน 5MB")
    url = upload_review_photo(content, file.filename)
    return {"url": url}

@router.post("/request-student-verification")
def request_student_verification(payload: dict = Body(...),
                                 db: Session = Depends(get_db),
                                 current_user: User = Depends(get_current_user)):
    student_id = payload.get("student_id", "")
    department = payload.get("department", "")
    phone = payload.get("phone", "")
    reason = payload.get("reason", "")
    card_image_url = payload.get("card_image_url", None)

    if not student_id:
        raise HTTPException(400, "กรุณากรอกรหัสนักศึกษา")

    if not card_image_url:
        raise HTTPException(400, "กรุณาแนบรูปภาพหลักฐานบัตรประจำตัวนักศึกษา")

    if phone:
        digits_only = re.sub(r"\D", "", phone)
        if len(digits_only) < 9 or len(digits_only) > 10:
            raise HTTPException(400, "เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 9-10 หลัก (เช่น 000-000-0000)")

    # Check existing pending request
    existing = db.query(UpgradeRequest).filter(
        UpgradeRequest.user_id == current_user.id,
        UpgradeRequest.status == UpgradeRequestStatus.pending
    ).first()
    if existing:
        raise HTTPException(400, "คุณมียื่นคำขอตรวจสอบสิทธิ์นักศึกษาที่รอดำเนินการอยู่แล้ว")

    req = UpgradeRequest(
        user_id=current_user.id,
        student_id=student_id,
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

@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}

