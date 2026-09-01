from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole
from auth import decode_token
from jose import JWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> User:
    """ ดึงข้อมูลผู้ใช้งานปัจจุบันจาก Token ในระบบ และตรวจสถานะ is_active """
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
    if not user.is_active:
        raise HTTPException(status_code=403, detail="บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ")
    return user

def get_any_current_user(token: str = Depends(oauth2_scheme),
                         db: Session = Depends(get_db)) -> User:
    """ ดึงข้อมูลผู้ใช้งานปัจจุบัน """
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

def get_current_user_optional(token: str = Depends(oauth2_scheme),
                              db: Session = Depends(get_db)) -> User | None:
    """ ดึงข้อมูลผู้ใช้ปัจจุบันหากมี Token ส่งมา """
    if not token:
        return None
    try:
        payload = decode_token(token)
        raw_sub = payload.get("sub")
        user_id = int(raw_sub) if raw_sub is not None else None
        if user_id is None:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None
