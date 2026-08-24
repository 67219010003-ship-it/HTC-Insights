from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Notification, User
from dependencies import get_current_user
from typing import Optional

router = APIRouter(prefix="/notifications", tags=["notifications"])

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
    link: Optional[str] = None
) -> Notification:
    """ ฟังก์ชันภายในระบบสำหรับสร้างและบันทึกการแจ้งเตือนใหม่ไปยังผู้ใช้ """
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

@router.get("")
@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ ดึงรายการแจ้งเตือนทั้งหมดของผู้ใช้งานปัจจุบันเรียงตามล่าสุด """
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [
        {
            "id": n.id,
            "user_id": n.user_id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]

@router.patch("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ ปรับสถานะการแจ้งเตือนทั้งหมดของผู้ใช้งานปัจจุบันเป็นอ่านแล้ว """
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ ปรับสถานะรายการแจ้งเตือนที่กำหนดเป็นอ่านแล้ว """
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return {
        "id": notif.id,
        "user_id": notif.user_id,
        "title": notif.title,
        "message": notif.message,
        "type": notif.type,
        "is_read": notif.is_read,
        "link": notif.link,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }
