from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User, Employer, UserRole
from auth import decode_token
from jose import JWTError

# กำหนดรูปแบบการรับ Bearer Token จาก Header Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> User:
    """ ดึงข้อมูลผู้ใช้งานปัจจุบัน (นักศึกษา/แอดมิน) จาก Token ในระบบ """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = decode_token(token)
        raw_sub = payload.get("sub")
        role: str = payload.get("role")
        user_id = int(raw_sub) if raw_sub is not None else None
    except (JWTError, ValueError):
        raise credentials_exception

    if role == "employer":
        raise HTTPException(status_code=403, detail="Student access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_verified:
        raise credentials_exception
    return user

def get_any_current_user(token: str = Depends(oauth2_scheme),
                         db: Session = Depends(get_db)) -> User:
    """ ดึงข้อมูลผู้ใช้งานปัจจุบัน (รวมถึงผู้ใช้ที่ยังไม่ยืนยันสิทธิ์ is_verified=False เพื่อใช้ยื่นคำขอยืนยันตัวตน) """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = decode_token(token)
        raw_sub = payload.get("sub")
        user_id = int(raw_sub) if raw_sub is not None else None
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    return user

def require_student(current_user: User = Depends(get_current_user)) -> User:
    """ ตรวจสอบสิทธิ์เฉพาะนักศึกษา วท.หาดใหญ่ หรือ Admin เท่านั้น """
    if current_user.role not in (UserRole.student, UserRole.admin):
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """ ตรวจสอบสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น """
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_super_admin(current_user: User = Depends(require_admin)) -> User:
    """ ตรวจสอบสิทธิ์ระดับสูงสุด (Super Admin) สำหรับการจัดการสิทธิ์แอดมินคนอื่น """
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return current_user

def get_current_employer(token: str = Depends(oauth2_scheme),
                         db: Session = Depends(get_db)) -> Employer:
    """ ดึงข้อมูลบัญชีสถานประกอบการปัจจุบันที่ได้รับการอนุมัติแล้ว """
    if not token:
        raise HTTPException(status_code=401, detail="Token missing")
    try:
        payload = decode_token(token)
        raw_sub = payload.get("sub")
        role: str = payload.get("role")
        employer_id = int(raw_sub) if raw_sub is not None else None
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    if role != "employer":
        raise HTTPException(status_code=403, detail="Employer access required")
        
    employer = db.query(Employer).filter(Employer.id == employer_id).first()
    if not employer or not employer.is_approved:
        raise HTTPException(status_code=403, detail="Employer not approved")
    return employer
