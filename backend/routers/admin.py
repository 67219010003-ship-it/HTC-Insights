import re
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
from models import (Review, Employer, Company, ReviewStatus, AuditLog, User, UserRole,
                    JobPosting, CommunityPost, CommunityComment, Report,
                    UpgradeRequest, UpgradeRequestStatus)
from dependencies import require_admin, require_super_admin
from auth import decrypt_identity
from routers.notifications import create_notification

router = APIRouter(prefix="/admin", tags=["admin"])

def to_thai_str(dt, fmt="%Y-%m-%d %H:%M"):
    """ แปลงเวลา UTC จากฐานข้อมูลเป็นเวลาประเทศไทย (UTC+7) """
    if not dt:
        return None
    return (dt + timedelta(hours=7)).strftime(fmt)

# --- 1. แดชบอร์ดสรุปสถิติระบบ (Stats Dashboard) ---
@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """ ดึงตัวเลขสถิติรวมของระบบ เช่น จำนวนผู้ใช้ รีวิวที่รออนุมัติ ตำแหน่งงาน และรายงาน """
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == UserRole.student).count()
    total_external = db.query(User).filter(User.role == UserRole.external).count()
    total_admins = db.query(User).filter(User.role == UserRole.admin).count()
    
    total_reviews = db.query(Review).count()
    pending_reviews = db.query(Review).filter(Review.status == ReviewStatus.pending).count()
    
    total_jobs = db.query(JobPosting).count()
    pending_jobs = db.query(JobPosting).filter((JobPosting.status == "pending") | (JobPosting.is_active == False)).count()
    
    total_posts = db.query(CommunityPost).count()
    pending_posts = db.query(CommunityPost).filter(CommunityPost.status == "pending").count()
    pending_comments = db.query(CommunityComment).filter(CommunityComment.status == "pending").count()
    pending_reports = db.query(Report).filter(Report.status == "pending").count()
    pending_upgrades = db.query(UpgradeRequest).filter(UpgradeRequest.status == UpgradeRequestStatus.pending).count()

    return {
        "users": {
            "total": total_users,
            "students": total_students,
            "external": total_external,
            "admins": total_admins,
        },
        "reviews": {
            "total": total_reviews,
            "pending": pending_reviews,
        },
        "jobs": {
            "total": total_jobs,
            "pending": pending_jobs,
        },
        "community": {
            "posts": total_posts,
            "pending_posts": pending_posts,
            "pending_comments": pending_comments,
            "pending_reports": pending_reports,
        },
        "upgrades": {
            "pending": pending_upgrades,
        }
    }

# --- 2. การจัดการและอนุมัติรีวิว (Reviews Management) ---
@router.get("/reviews/pending")
@router.get("/reviews")
def list_reviews(status: str = Query(None),
                 db: Session = Depends(get_db),
                 admin: User = Depends(require_admin)):
    """ ดึงรายการรีวิวตามสถานะ (รออนุมัติ, อนุมัติแล้ว, ปฏิเสธ) """
    query = db.query(Review)
    if status == "all":
        pass
    elif status and status in ReviewStatus.__members__:
        query = query.filter(Review.status == ReviewStatus(status))
    elif status == "pending" or not status:
        query = query.filter(Review.status == ReviewStatus.pending)
        
    reviews = query.order_by(Review.created_at.desc()).all()
    result = []
    for r in reviews:
        if r.is_anonymous:
            author_name = "นักศึกษาไม่ระบุตัวตน (ข้อมูลถูกเข้ารหัส)"
            author_email = "anonymous@encrypted"
        else:
            author_name = r.user.name if r.user else "Unknown"
            author_email = r.user.email if r.user else "Unknown"

        result.append({
            "id": r.id,
            "company_id": r.company_id,
            "company_name": r.company.name if r.company else "Unknown",
            "real_author": author_name,
            "real_email": author_email,
            "is_anonymous": r.is_anonymous,
            "score_overall": r.score_overall,
            "score_work": r.score_work,
            "score_env": r.score_env,
            "score_mentor": r.score_mentor,
            "score_welfare": r.score_welfare,
            "department": r.department,
            "period_start": r.period_start,
            "period_end": r.period_end,
            "daily_allowance": r.daily_allowance,
            "has_transport": r.has_transport,
            "work_start_time": r.work_start_time,
            "work_end_time": r.work_end_time,
            "text_work": r.text_work,
            "text_pros": r.text_pros,
            "text_cons": r.text_cons,
            "text_advice": r.text_advice,
            "status": r.status.value if r.status else "pending",
            "rejection_reason": r.rejection_reason,
            "photo_urls": [p.url for p in r.photos],
            "created_at": to_thai_str(r.created_at),
        })
    return result

@router.patch("/reviews/{review_id}")
def update_review_status(review_id: int, payload: dict = Body(...),
                         db: Session = Depends(get_db),
                         admin: User = Depends(require_admin)):
    """ อัปเดตสถานะรีวิวเป็น Approved หรือ Rejected พร้อมระบุเหตุผลและบันทึก Audit Log """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "ไม่พบรีวิว")
    
    status_str = payload.get("status")
    reason = payload.get("rejection_reason") or payload.get("reason")
    
    if status_str == "rejected" or status_str == ReviewStatus.rejected.value:
        if not reason or not str(reason).strip():
            raise HTTPException(400, "ต้องระบุเหตุผลในการปฏิเสธ")
        review.status = ReviewStatus.rejected
        review.rejection_reason = str(reason).strip()
        
        create_notification(
            db=db,
            user_id=review.user_id,
            title="รีวิวของคุณถูกปฏิเสธ",
            message=f"รีวิวของคุณถูกปฏิเสธเนื่องจาก: {str(reason).strip()}",
            type="warning",
            link="/insights"
        )
        db.add(AuditLog(admin_id=admin.id, action="reject_review",
                        target_type="review", target_id=review_id, reason=str(reason).strip()))
        db.commit()
        return {"message": "ปฏิเสธรีวิวสำเร็จ"}

    elif status_str == "approved" or status_str == ReviewStatus.approved.value:
        review.status = ReviewStatus.approved
        review.rejection_reason = None
        
        create_notification(
            db=db,
            user_id=review.user_id,
            title="รีวิวของคุณได้รับการอนุมัติ",
            message="รีวิวของคุณได้รับการอนุมัติและเผยแพร่เรียบร้อยแล้ว",
            type="info",
            link="/insights"
        )
        db.add(AuditLog(admin_id=admin.id, action="approve_review",
                        target_type="review", target_id=review_id))
        db.commit()
        return {"message": "อนุมัติรีวิวสำเร็จ"}
    else:
        raise HTTPException(400, "สถานะไม่ถูกต้อง")

@router.patch("/reviews/{review_id}/approve")
def approve_review(review_id: int, db: Session = Depends(get_db),
                   admin: User = Depends(require_admin)):
    """ ปุ่มลัดอนุมัติรีวิว (Approve) """
    return update_review_status(review_id, {"status": "approved"}, db, admin)

@router.patch("/reviews/{review_id}/reject")
def reject_review(review_id: int, payload: dict = Body(default={}),
                  db: Session = Depends(get_db),
                  admin: User = Depends(require_admin)):
    """ ปุ่มลัดปฏิเสธรีวิว (Reject) พร้อมเหตุผล """
    payload["status"] = "rejected"
    return update_review_status(review_id, payload, db, admin)

@router.get("/anonymous-reveal/{review_id}")
def reveal_anonymous(review_id: int, reason: str,
                     db: Session = Depends(get_db),
                     admin: User = Depends(require_admin)):
    """ ถอดรหัสเพื่อดูตัวตนจริงของผู้เขียนรีวิวแบบไม่ระบุชื่อ (พร้อมบันทึก Audit Log) """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review or not review.is_anonymous:
        raise HTTPException(404, "ไม่พบรีวิว anonymous")
    real_user_id = decrypt_identity(review.anon_identity_enc)
    user = db.query(User).filter(User.id == real_user_id).first()
    db.add(AuditLog(admin_id=admin.id, action="reveal_anonymous",
                    target_type="review", target_id=review_id, reason=reason))
    db.commit()
    return {"real_name": user.name if user else "Unknown", "real_email": user.email if user else "Unknown"}

# --- 3. การจัดการกระทู้ชุมชน (Community Posts Moderation) ---
@router.get("/posts")
def list_admin_posts(status: str = Query(None),
                     db: Session = Depends(get_db),
                     admin: User = Depends(require_admin)):
    """ ดึงรายการกระทู้ทั้งหมดในระบบเพื่อการตรวจสอบ """
    query = db.query(CommunityPost)
    if status:
        query = query.filter(CommunityPost.status == status)
    posts = query.order_by(CommunityPost.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "author_name": p.user.name if p.user else "Unknown",
            "author_email": p.user.email if p.user else "Unknown",
            "author_department": p.user.department if p.user else None,
            "type": p.type.value if p.type else "qa",
            "department": p.department,
            "title": p.title,
            "content": p.content,
            "is_anonymous": p.is_anonymous,
            "status": p.status or "pending",
            "rejection_reason": p.rejection_reason,
            "is_pinned": p.is_pinned,
            "created_at": to_thai_str(p.created_at),
        }
        for p in posts
    ]

@router.patch("/posts/{post_id}")
def update_post_status(post_id: int, payload: dict = Body(...),
                       db: Session = Depends(get_db),
                       admin: User = Depends(require_admin)):
    """ อนุมัติหรือปฏิเสธกระทู้ชุมชน """
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "ไม่พบโพสต์")
    
    status_str = payload.get("status")
    reason = payload.get("rejection_reason") or payload.get("reason")
    
    if status_str == "rejected":
        if not reason or not str(reason).strip():
            raise HTTPException(400, "ต้องระบุเหตุผลในการปฏิเสธ")
        post.status = "rejected"
        post.rejection_reason = str(reason).strip()
        
        create_notification(
            db=db,
            user_id=post.user_id,
            title="โพสต์ของคุณถูกปฏิเสธ",
            message=f"โพสต์เรื่อง '{post.title}' ถูกปฏิเสธเนื่องจาก: {str(reason).strip()}",
            type="warning",
            link="/community"
        )
        db.add(AuditLog(admin_id=admin.id, action="reject_post",
                        target_type="post", target_id=post_id, reason=str(reason).strip()))
        db.commit()
        return {"message": "ปฏิเสธโพสต์สำเร็จ"}

    elif status_str == "approved":
        post.status = "approved"
        post.rejection_reason = None
        
        create_notification(
            db=db,
            user_id=post.user_id,
            title="โพสต์ของคุณได้รับการอนุมัติ",
            message=f"โพสต์เรื่อง '{post.title}' ได้รับการอนุมัติและเผยแพร่เรียบร้อยแล้ว",
            type="info",
            link="/community"
        )
        db.add(AuditLog(admin_id=admin.id, action="approve_post",
                        target_type="post", target_id=post_id))
        db.commit()
        return {"message": "อนุมัติโพสต์สำเร็จ"}
    else:
        raise HTTPException(400, "สถานะไม่ถูกต้อง")

# --- 3.1 การจัดการความคิดเห็นชุมชน (Community Comments Moderation) ---
@router.get("/comments")
def list_admin_comments(status: str = Query(None),
                        db: Session = Depends(get_db),
                        admin: User = Depends(require_admin)):
    """ ดึงรายการความคิดเห็นในระบบเพื่อการตรวจสอบ """
    query = db.query(CommunityComment)
    if status:
        query = query.filter(CommunityComment.status == status)
    comments = query.order_by(CommunityComment.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "post_id": c.post_id,
            "post_title": c.post.title if c.post else "กระทู้",
            "user_id": c.user_id,
            "author_name": c.user.name if c.user else "Unknown",
            "author_email": c.user.email if c.user else "Unknown",
            "author_department": c.user.department if c.user else None,
            "content": c.content,
            "is_anonymous": c.is_anonymous,
            "status": c.status or "pending",
            "rejection_reason": c.rejection_reason,
            "created_at": to_thai_str(c.created_at),
        }
        for c in comments
    ]

@router.patch("/comments/{comment_id}")
def update_comment_status(comment_id: int, payload: dict = Body(...),
                          db: Session = Depends(get_db),
                          admin: User = Depends(require_admin)):
    """ อนุมัติหรือปฏิเสธความคิดเห็นในคอมมูนิตี้ """
    comment = db.query(CommunityComment).filter(CommunityComment.id == comment_id).first()
    if not comment:
        raise HTTPException(404, "ไม่พบความคิดเห็น")
    
    status_str = payload.get("status")
    reason = payload.get("rejection_reason") or payload.get("reason")
    
    if status_str == "rejected":
        if not reason or not str(reason).strip():
            raise HTTPException(400, "ต้องระบุเหตุผลในการปฏิเสธ")
        comment.status = "rejected"
        comment.rejection_reason = str(reason).strip()
        
        post_title = comment.post.title if comment.post else ""
        create_notification(
            db=db,
            user_id=comment.user_id,
            title="ความคิดเห็นของคุณถูกปฏิเสธ",
            message=f"ความคิดเห็นในกระทู้ '{post_title[:30]}' ถูกปฏิเสธเนื่องจาก: {str(reason).strip()}",
            type="warning",
            link=f"/community/{comment.post_id}" if comment.post_id else "/community"
        )
        db.add(AuditLog(admin_id=admin.id, action="reject_comment",
                        target_type="comment", target_id=comment_id, reason=str(reason).strip()))
        db.commit()
        return {"message": "ปฏิเสธความคิดเห็นสำเร็จ"}
        
    elif status_str == "approved":
        comment.status = "approved"
        comment.rejection_reason = None
        
        post_title = comment.post.title if comment.post else ""
        create_notification(
            db=db,
            user_id=comment.user_id,
            title="ความคิดเห็นของคุณได้รับการอนุมัติ",
            message=f"ความคิดเห็นในกระทู้ '{post_title[:30]}' ได้รับการอนุมัติและเผยแพร่แล้ว",
            type="info",
            link=f"/community/{comment.post_id}" if comment.post_id else "/community"
        )
        db.add(AuditLog(admin_id=admin.id, action="approve_comment",
                        target_type="comment", target_id=comment_id))
        db.commit()
        return {"message": "อนุมัติความคิดเห็นสำเร็จ"}
    else:
        raise HTTPException(400, "สถานะไม่ถูกต้อง")

# --- 4. การจัดการผู้ใช้งาน (User Management) ---
@router.get("/users")
def list_users(role: str = Query(None), q: str = Query(None),
               db: Session = Depends(get_db),
               admin: User = Depends(require_admin)):
    """ ดึงรายชื่อผู้ใช้งานทั้งหมด พร้อมค้นหาตามชื่อ/อีเมล/บทบาท """
    query = db.query(User)
    if role and role in UserRole.__members__:
        query = query.filter(User.role == UserRole(role))
    if q:
        query = query.filter((User.name.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%")))
    users = query.order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value if u.role else "student",
            "is_super_admin": u.is_super_admin,
            "department": u.department,
            "level": u.level,
            "is_verified": u.is_verified,
            "created_at": to_thai_str(u.created_at),
        }
        for u in users
    ]

@router.patch("/users/{user_id}/role")
def update_user_role(user_id: int, payload: dict = Body(...),
                     db: Session = Depends(get_db),
                     admin: User = Depends(require_admin)):
    """ เปลี่ยน Role ของผู้ใช้ (เช่น แต่งตั้ง Admin ใหม่) """
    new_role = payload.get("role")
    if new_role not in UserRole.__members__:
        raise HTTPException(400, "Role ไม่ถูกต้อง")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "ไม่พบผู้ใช้")
    
    if target_user.is_super_admin and not admin.is_super_admin:
        raise HTTPException(403, "เฉพาะ Super Admin เท่านั้นที่สามารถเปลี่ยน Role ของ Super Admin ได้")
    
    # เฉพาะ Super Admin เท่านั้นที่สามารถแต่งตั้งหรือปลดยศ Admin คนอื่นได้
    if (new_role == "admin" or target_user.role == UserRole.admin) and not admin.is_super_admin:
        raise HTTPException(403, "เฉพาะ Super Admin เท่านั้นที่สามารถแต่งตั้งหรือปลดยศ Admin ได้")
    
    if target_user.id == admin.id and target_user.is_super_admin and new_role != "admin":
        raise HTTPException(400, "ไม่สามารถลดสิทธิ์ Admin ของตนเองได้")
        
    old_role = target_user.role.value
    target_user.role = UserRole(new_role)
    db.add(AuditLog(admin_id=admin.id, action="update_user_role",
                    target_type="user", target_id=user_id,
                    reason=f"Changed role from {old_role} to {new_role}"))
    db.commit()
    return {"message": f"เปลี่ยน Role เป็น {new_role} เรียบร้อยแล้ว"}

@router.patch("/users/{user_id}/super-admin")
def toggle_super_admin(user_id: int, payload: dict = Body(...),
                       db: Session = Depends(get_db),
                       super_admin: User = Depends(require_super_admin)):
    """ มอบหรือถอดสิทธิ์ Super Admin (เฉพาะ Super Admin คนเดิมทำได้เท่านั้น) """
    is_super = payload.get("is_super_admin", False)
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "ไม่พบผู้ใช้")
    
    if target_user.id == super_admin.id and not is_super:
        raise HTTPException(400, "ไม่สามารถถอดสิทธิ์ Super Admin ของตนเองได้")
    
    target_user.is_super_admin = is_super
    if is_super:
        target_user.role = UserRole.admin
        
    db.add(AuditLog(admin_id=super_admin.id, action="toggle_super_admin",
                    target_type="user", target_id=user_id,
                    reason=f"Set is_super_admin = {is_super}"))
    db.commit()
    return {"message": f"อัปเดตสิทธิ์ Super Admin สำเร็จ (is_super_admin={is_super})"}

@router.patch("/users/{user_id}/ban")
def ban_user(user_id: int, payload: dict = Body(default={}),
             db: Session = Depends(get_db),
             admin: User = Depends(require_admin)):
    """ ระงับการใช้งานหรือเปิดใช้งานบัญชีผู้ใช้ """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "ไม่พบผู้ใช้")
    if target_user.is_super_admin:
        raise HTTPException(403, "ไม่สามารถระงับบัญชี Super Admin ได้")
    if target_user.role == UserRole.admin and not admin.is_super_admin:
        raise HTTPException(403, "เฉพาะ Super Admin เท่านั้นที่สามารถระงับบัญชีของ Admin ได้")
        
    reason = payload.get("reason", "ระงับการใช้งานโดย Admin")
    target_user.is_verified = not target_user.is_verified
    status_str = "ระงับการใช้งาน" if not target_user.is_verified else "เปิดใช้งาน"
    db.add(AuditLog(admin_id=admin.id, action="toggle_ban_user",
                    target_type="user", target_id=user_id, reason=reason))
    db.commit()
    return {"message": f"{status_str}บัญชีผู้ใช้สำเร็จ"}

# --- 5. การอนุมัติประกาศงาน (Job Postings Moderation) ---
@router.get("/jobs/pending")
@router.get("/jobs")
def list_admin_jobs(status: str = Query(None),
                    db: Session = Depends(get_db),
                    admin: User = Depends(require_admin)):
    """ ดึงรายการตำแหน่งงานเพื่อการตรวจสอบและอนุมัติ """
    query = db.query(JobPosting)
    if status:
        query = query.filter(JobPosting.status == status)
    jobs = query.order_by(JobPosting.created_at.desc()).all()
    results = []
    for j in jobs:
        emp = j.employer
        emp_name = emp.company_name if emp else "Unknown"
        emp_email = emp.email if emp else "-"
        emp_phone = ""
        comp_name = emp_name
        contact_person = "ฝ่ายรับสมัครฝึกงาน / HR"
        line_id = ""
        
        if j.company_id:
            comp = db.query(Company).filter(Company.id == j.company_id).first()
            if comp:
                comp_name = comp.name or emp_name
                if comp.phone:
                    emp_phone = comp.phone

        desc = j.description or ""
        if "ผู้ติดต่อ:" in desc:
            cp_match = re.search(r"ผู้ติดต่อ:\s*([^|\(]+)", desc)
            if cp_match:
                contact_person = cp_match.group(1).strip()
            ph_match = re.search(r"\((0[0-9]{1,2}-[0-9]{3,4}-?[0-9]{3,4}|0[0-9]{8,9})\)", desc)
            if ph_match and not emp_phone:
                emp_phone = ph_match.group(1).strip()
            line_match = re.search(r"LINE:\s*([^|]+)", desc)
            if line_match:
                line_id = line_match.group(1).strip()
                if line_id == "-":
                    line_id = ""

        results.append({
            "id": j.id,
            "title": j.title,
            "employer_id": j.employer_id,
            "employer_name": emp_name,
            "employer_email": emp_email,
            "employer_phone": emp_phone,
            "company_name": comp_name,
            "contact_person": contact_person,
            "phone": emp_phone,
            "email": emp_email,
            "line_id": line_id,
            "department": j.department,
            "description": j.description,
            "daily_allowance": j.daily_allowance,
            "location": j.location,
            "is_active": j.is_active,
            "status": j.status or "pending",
            "rejection_reason": j.rejection_reason,
            "created_at": to_thai_str(j.created_at),
        })
    return results

@router.patch("/jobs/{job_id}")
def update_job_status(job_id: int, payload: dict = Body(...),
                      db: Session = Depends(get_db),
                      admin: User = Depends(require_admin)):
    """ อนุมัติหรือปฏิเสธประกาศรับสมัครงานจากสถานประกอบการ """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    
    status_str = payload.get("status")
    reason = payload.get("rejection_reason") or payload.get("reason")
    
    if status_str == "rejected":
        if not reason or not str(reason).strip():
            raise HTTPException(400, "ต้องระบุเหตุผลในการปฏิเสธ")
        job.status = "rejected"
        job.is_active = False
        job.rejection_reason = str(reason).strip()
        
        if job.employer and job.employer.email:
            emp_user = db.query(User).filter(User.email == job.employer.email).first()
            if emp_user:
                create_notification(
                    db=db,
                    user_id=emp_user.id,
                    title="ประกาศงานของคุณถูกปฏิเสธ",
                    message=f"ประกาศงาน '{job.title}' ถูกปฏิเสธเนื่องจาก: {str(reason).strip()}",
                    type="warning",
                    link="/jobs"
                )
        db.add(AuditLog(admin_id=admin.id, action="reject_job",
                        target_type="job", target_id=job_id, reason=str(reason).strip()))
        db.commit()
        return {"message": "ปฏิเสธประกาศรับสมัครงานสำเร็จ"}

    elif status_str == "approved":
        job.status = "approved"
        job.is_active = True
        job.rejection_reason = None
        
        if job.employer and job.employer.email:
            emp_user = db.query(User).filter(User.email == job.employer.email).first()
            if emp_user:
                create_notification(
                    db=db,
                    user_id=emp_user.id,
                    title="ประกาศงานของคุณได้รับการอนุมัติ",
                    message=f"ประกาศงาน '{job.title}' ได้รับการอนุมัติเรียบร้อยแล้ว",
                    type="info",
                    link="/jobs"
                )
        db.add(AuditLog(admin_id=admin.id, action="approve_job",
                        target_type="job", target_id=job_id))
        db.commit()
        return {"message": "อนุมัติประกาศรับสมัครงานสำเร็จ"}
    else:
        raise HTTPException(400, "สถานะไม่ถูกต้อง")

# --- 6. การอนุมัติคำขอยืนยันสิทธิ์นักศึกษา (Student Verification Requests) ---
@router.get("/upgrades")
@router.get("/upgrade-requests")
def list_upgrade_requests(status: str = Query(None),
                          db: Session = Depends(get_db),
                          admin: User = Depends(require_admin)):
    """ ดึงคำขอยื่นหลักฐานยืนยันตัวตนนักศึกษา """
    query = db.query(UpgradeRequest)
    if status and status in UpgradeRequestStatus.__members__:
        query = query.filter(UpgradeRequest.status == UpgradeRequestStatus(status))
    elif status == "pending":
        query = query.filter(UpgradeRequest.status == UpgradeRequestStatus.pending)
    reqs = query.order_by(UpgradeRequest.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user.name if r.user else "Unknown",
            "user_email": r.user.email if r.user else "Unknown",
            "student_id": r.student_id,
            "department": r.department,
            "phone": r.phone,
            "reason": r.reason,
            "status": r.status.value if r.status else "pending",
            "rejection_reason": r.rejection_reason,
            "card_image_url": r.card_image_url,
            "created_at": to_thai_str(r.created_at),
        }
        for r in reqs
    ]

@router.patch("/upgrades/{request_id}")
def process_upgrade_request(request_id: int, payload: dict = Body(...),
                            db: Session = Depends(get_db),
                            admin: User = Depends(require_admin)):
    """ อนุมัติหรือปฏิเสธคำขอยืนยันสิทธิ์นักศึกษา """
    req = db.query(UpgradeRequest).filter(UpgradeRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "ไม่พบคำขอ")
        
    status_str = payload.get("status")
    reason = payload.get("rejection_reason")
    
    if status_str == "approved":
        req.status = UpgradeRequestStatus.approved
        target_user = db.query(User).filter(User.id == req.user_id).first()
        if target_user:
            target_user.role = UserRole.student
            if req.department:
                target_user.department = req.department
            target_user.is_verified = True
            
            create_notification(
                db=db,
                user_id=target_user.id,
                title="ยืนยันสิทธิ์นักศึกษาสำเร็จ",
                message="คำขอยืนยันสิทธิ์นักศึกษาของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าถึงข้อมูลรีวิวได้เต็มรูปแบบ",
                type="success",
                link="/insights"
            )
        db.add(AuditLog(admin_id=admin.id, action="approve_student_upgrade",
                        target_type="upgrade_request", target_id=request_id))
        db.commit()
        return {"message": "อนุมัติสิทธิ์นักศึกษาสำเร็จ"}
        
    elif status_str == "rejected":
        if not reason or not str(reason).strip():
            raise HTTPException(400, "ต้องระบุเหตุผลในการปฏิเสธ")
        req.status = UpgradeRequestStatus.rejected
        req.rejection_reason = str(reason).strip()
        
        target_user = db.query(User).filter(User.id == req.user_id).first()
        if target_user:
            create_notification(
                db=db,
                user_id=target_user.id,
                title="คำขอยืนยันสิทธิ์นักศึกษาถูกปฏิเสธ",
                message=f"คำขอของคุณไม่ผ่านการอนุมัติเนื่องจาก: {str(reason).strip()}",
                type="warning",
                link="/"
            )
        db.add(AuditLog(admin_id=admin.id, action="reject_student_upgrade",
                        target_type="upgrade_request", target_id=request_id, reason=str(reason).strip()))
        db.commit()
        return {"message": "ปฏิเสธคำขอสำเร็จ"}
        
    raise HTTPException(400, "สถานะไม่ถูกต้อง")

# --- 7. การตรวจสอบและจัดการรายงานความไม่เหมาะสม (Reports Handling) ---
@router.get("/reports")
def list_reports(status: str = Query(None),
                 db: Session = Depends(get_db),
                 admin: User = Depends(require_admin)):
    """ ดึงรายการแจ้งรายงานเนื้อหาไม่เหมาะสมทั้งหมด พร้อมรายละเอียดเป้าหมาย """
    query = db.query(Report)
    if status and status != "all":
        query = query.filter(Report.status == status)
    reports = query.order_by(Report.created_at.desc()).all()
    results = []
    for rep in reports:
        target_type = "review" if rep.review_id else "post" if rep.post_id else "comment" if rep.comment_id else "job" if rep.job_id else "company" if rep.company_id else "unknown"
        target_type_th = "รีวิวสถานประกอบการ" if rep.review_id else "กระทู้ชุมชน" if rep.post_id else "ความคิดเห็น" if rep.comment_id else "ประกาศงาน" if rep.job_id else "สถานประกอบการ" if rep.company_id else "เนื้อหาทั่วไป"
        target_id = rep.review_id or rep.post_id or rep.comment_id or rep.job_id or rep.company_id or rep.id
        
        target_title = None
        target_content = None
        is_anonymous = False
        if rep.review:
            company_name = rep.review.company.name if rep.review.company else "สถานประกอบการ"
            target_title = f"รีวิว: {company_name}"
            target_content = rep.review.text_work
            is_anonymous = rep.review.is_anonymous
        elif rep.post:
            target_title = f"กระทู้: {rep.post.title}"
            target_content = rep.post.content
            is_anonymous = rep.post.is_anonymous
        elif rep.comment:
            target_title = f"ความคิดเห็นในกระทู้ #{rep.comment.post_id}"
            target_content = rep.comment.content
        elif rep.job:
            target_title = f"งาน: {rep.job.title}"
            target_content = rep.job.description

        results.append({
            "id": rep.id,
            "reporter_id": rep.reporter_id,
            "reporter_name": rep.reporter.name if rep.reporter else "ผู้ใช้",
            "reporter_email": rep.reporter.email if rep.reporter else None,
            "target_type": target_type,
            "target_type_th": target_type_th,
            "target_id": target_id,
            "target_title": target_title,
            "target_content": target_content,
            "is_anonymous": is_anonymous,
            "post_id": rep.post_id,
            "post_title": rep.post.title if rep.post else None,
            "review_id": rep.review_id,
            "comment_id": rep.comment_id,
            "job_id": rep.job_id,
            "company_id": rep.company_id,
            "company_name": rep.review.company.name if rep.review and rep.review.company else None,
            "reason": rep.reason,
            "status": rep.status,
            "created_at": to_thai_str(rep.created_at),
        })
    return results

@router.patch("/reports/{report_id}")
def update_report_status(report_id: int, payload: dict = Body(...),
                         db: Session = Depends(get_db),
                         admin: User = Depends(require_admin)):
    """ อัปเดตสถานะรายงานความผิด (resolved, dismissed) และดำเนินการตามคำขอ """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "ไม่พบรายงาน")
    
    new_status = payload.get("status", "resolved")
    action = payload.get("action")
    
    report.status = new_status
    if action in ["delete_post", "deleted"]:
        if report.post_id:
            from models import CommunityPost, CommunityComment, CommunityLike
            post = db.query(CommunityPost).filter(CommunityPost.id == report.post_id).first()
            if post:
                db.query(CommunityComment).filter(CommunityComment.post_id == post.id).delete()
                db.query(CommunityLike).filter(CommunityLike.post_id == post.id).delete()
                db.delete(post)
        elif report.review_id:
            from models import Review, ReviewPhoto
            rev = db.query(Review).filter(Review.id == report.review_id).first()
            if rev:
                db.query(ReviewPhoto).filter(ReviewPhoto.review_id == rev.id).delete()
                db.delete(rev)
        elif report.comment_id:
            from models import CommunityComment
            comment = db.query(CommunityComment).filter(CommunityComment.id == report.comment_id).first()
            if comment:
                db.delete(comment)
        elif report.job_id:
            from models import JobPosting
            job = db.query(JobPosting).filter(JobPosting.id == report.job_id).first()
            if job:
                db.delete(job)
            
    db.add(AuditLog(admin_id=admin.id, action="handle_report",
                    target_type="report", target_id=report_id,
                    reason=f"Updated report status to {new_status} (action={action})"))
    db.commit()
    return {"message": f"อัปเดตสถานะรายงานเป็น {new_status} สำเร็จ"}

# --- 8. บันทึกประวัติการกระทำของผู้ดูแลระบบ (Audit Logs) ---
@router.get("/audit-logs")
def get_audit_logs(skip: int = 0, limit: int = 50,
                   db: Session = Depends(get_db),
                   admin: User = Depends(require_admin)):
    """ ดึงบันทึกประวัติการกระทำของ Admin (Audit Logs) ย้อนหลัง """
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for l in logs:
        admin_name = "System/Admin"
        if getattr(l, "admin", None) and getattr(l.admin, "name", None):
            admin_name = l.admin.name
        result.append({
            "id": l.id,
            "admin_id": l.admin_id,
            "admin_name": admin_name,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "reason": l.reason,
            "created_at": to_thai_str(l.created_at, "%Y-%m-%d %H:%M:%S"),
        })
    return result

# --- 9. ฟังก์ชันการลบข้อมูลโดยผู้ดูแลระบบ (Admin Direct Deletions) ---
@router.delete("/reviews/{review_id}")
def admin_delete_review(review_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """ ผู้ดูแลระบบสามารถลบรีวิวใดๆ ก็ได้ในระบบโดยตรง """
    from models import Review, ReviewPhoto
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "ไม่พบรีวิว")
    db.query(ReviewPhoto).filter(ReviewPhoto.review_id == review_id).delete()
    db.delete(review)
    db.add(AuditLog(admin_id=admin.id, action="delete_review", target_type="review", target_id=review_id, reason="Admin manually deleted review"))
    db.commit()
    return {"message": "ลบรีวิวสำเร็จ"}

@router.delete("/posts/{post_id}")
def admin_delete_post(post_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """ ผู้ดูแลระบบสามารถลบกระทู้คอมมูนิตี้ใดๆ ก็ได้ในระบบโดยตรง """
    from models import CommunityPost, CommunityComment, CommunityLike
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "ไม่พบโพสต์")
    db.query(CommunityComment).filter(CommunityComment.post_id == post_id).delete()
    db.query(CommunityLike).filter(CommunityLike.post_id == post_id).delete()
    db.delete(post)
    db.add(AuditLog(admin_id=admin.id, action="delete_post", target_type="community_post", target_id=post_id, reason="Admin manually deleted community post"))
    db.commit()
    return {"message": "ลบกระทู้สำเร็จ"}

@router.delete("/jobs/{job_id}")
def admin_delete_job(job_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """ ผู้ดูแลระบบสามารถลบประกาศงานใดๆ ก็ได้ในระบบโดยตรง """
    from models import JobPosting
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(404, "ไม่พบประกาศงาน")
    db.delete(job)
    db.add(AuditLog(admin_id=admin.id, action="delete_job", target_type="job_posting", target_id=job_id, reason="Admin manually deleted job posting"))
    db.commit()
    return {"message": "ลบประกาศงานสำเร็จ"}

# --- 10. การจัดการสถานประกอบการ (Employers Management) ---
@router.get("/employers")
def list_admin_employers(status: str = Query(None),
                         db: Session = Depends(get_db),
                         admin: User = Depends(require_admin)):
    """ ดึงรายชื่อสถานประกอบการทั้งหมด (กรองตามสถานะ: pending, approved, all) """
    query = db.query(Employer)
    if status == "pending":
        query = query.filter(Employer.is_approved == False)
    elif status == "approved":
        query = query.filter(Employer.is_approved == True)
    
    employers = query.order_by(Employer.created_at.desc()).all()
    return [
        {
            "id": e.id,
            "email": e.email,
            "company_name": e.company_name,
            "address": e.address,
            "industry": e.industry,
            "logo_url": e.logo_url,
            "is_approved": e.is_approved,
            "created_at": to_thai_str(e.created_at),
        }
        for e in employers
    ]

@router.patch("/employers/{employer_id}/approve")
def approve_employer(employer_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """ อนุมัติการลงทะเบียนของสถานประกอบการ """
    emp = db.query(Employer).filter(Employer.id == employer_id).first()
    if not emp:
        raise HTTPException(404, "ไม่พบสถานประกอบการ")
    emp.is_approved = True
    db.add(AuditLog(admin_id=admin.id, action="approve_employer", target_type="employer", target_id=employer_id, reason="Admin approved employer account"))
    db.commit()
    return {"message": "อนุมัติบัญชีสถานประกอบการสำเร็จ"}

@router.delete("/employers/{employer_id}")
def delete_employer(employer_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """ ลบบัญชีสถานประกอบการออกจากระบบ """
    emp = db.query(Employer).filter(Employer.id == employer_id).first()
    if not emp:
        raise HTTPException(404, "ไม่พบสถานประกอบการ")
    db.delete(emp)
    db.add(AuditLog(admin_id=admin.id, action="delete_employer", target_type="employer", target_id=employer_id, reason="Admin manually deleted employer account"))
    db.commit()
    return {"message": "ลบบัญชีสถานประกอบการสำเร็จ"}
