import re
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
from models import (Review, Company, ReviewStatus, AuditLog, User, UserRole,
                    JobPosting, CommunityPost, CommunityComment, Report,
                    UpgradeRequest, UpgradeRequestStatus)
from dependencies import require_admin, require_super_admin
from routers.notifications import create_notification

router = APIRouter(prefix="/admin", tags=["admin"])

def to_thai_str(dt, fmt="%Y-%m-%d %H:%M"):
    if not dt:
        return None
    return (dt + timedelta(hours=7)).strftime(fmt)

# --- 1. แดชบอร์ดสรุปสถิติระบบ (Stats Dashboard) ---
@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """ ดึงตัวเลขสถิติรวมของระบบ """
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
    """ ดึงรายการรีวิวตามสถานะ """
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
        author_name = r.user.name if r.user else "Unknown"
        author_email = r.user.email if r.user else "Unknown"

        result.append({
            "id": r.id,
            "company_id": r.company_id,
            "company_name": r.company.name if r.company else "Unknown",
            "real_author": author_name,
            "real_email": author_email,
            "score_overall": r.score_overall,
            "score_work": r.score_work,
            "score_env": r.score_env,
            "score_mentor": r.score_mentor,
            "score_welfare": r.score_welfare,
            "department": r.department,
            "period_start": r.period_start,
            "period_end": r.period_end,
            "daily_allowance": r.daily_allowance,
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
    """ อัปเดตสถานะรีวิวเป็น Approved หรือ Rejected """
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
    return update_review_status(review_id, {"status": "approved"}, db, admin)

@router.patch("/reviews/{review_id}/reject")
def reject_review(review_id: int, payload: dict = Body(default={}),
                  db: Session = Depends(get_db),
                  admin: User = Depends(require_admin)):
    payload["status"] = "rejected"
    return update_review_status(review_id, payload, db, admin)

# --- 3. การจัดการกระทู้และคอมเมนต์ชุมชน ---
@router.get("/posts")
def list_admin_posts(status: str = Query(None),
                     db: Session = Depends(get_db),
                     admin: User = Depends(require_admin)):
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
            "type": p.type.value if p.type else "qa",
            "department": p.department,
            "title": p.title,
            "content": p.content,
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

@router.get("/comments")
def list_admin_comments(status: str = Query(None),
                        db: Session = Depends(get_db),
                        admin: User = Depends(require_admin)):
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
            "content": c.content,
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
            "is_active": u.is_active,
            "is_verified": u.is_active,  # compatibility field for frontend
            "avatar_url": u.avatar_url,
            "created_at": to_thai_str(u.created_at),
        }
        for u in users
    ]

@router.patch("/users/{user_id}/role")
def update_user_role(user_id: int, payload: dict = Body(...),
                     db: Session = Depends(get_db),
                     admin: User = Depends(require_admin)):
    new_role = payload.get("role")
    if new_role not in UserRole.__members__:
        raise HTTPException(400, "Role ไม่ถูกต้อง")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "ไม่พบผู้ใช้")
    
    if target_user.is_super_admin and not admin.is_super_admin:
        raise HTTPException(403, "เฉพาะ Super Admin เท่านั้นที่สามารถเปลี่ยน Role ของ Super Admin ได้")
    
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
    target_user.is_active = not target_user.is_active
    status_str = "ระงับการใช้งาน" if not target_user.is_active else "เปิดใช้งาน"
    db.add(AuditLog(admin_id=admin.id, action="toggle_ban_user",
                    target_type="user", target_id=user_id, reason=reason))
    db.commit()
    return {"message": f"{status_str}บัญชีผู้ใช้สำเร็จ", "is_active": target_user.is_active}

# --- 5. การอนุมัติประกาศงาน (Job Postings Moderation) ---
@router.get("/jobs/pending")
@router.get("/jobs")
def list_admin_jobs(status: str = Query(None),
                    db: Session = Depends(get_db),
                    admin: User = Depends(require_admin)):
    query = db.query(JobPosting)
    if status:
        query = query.filter(JobPosting.status == status)
    jobs = query.order_by(JobPosting.created_at.desc()).all()
    results = []
    for j in jobs:
        user = j.user
        poster_name = user.name if user else "Unknown"
        poster_email = user.email if user else "-"
        comp = j.company
        comp_name = comp.name if comp else poster_name
        phone = comp.phone if comp and comp.phone else ""
        contact_person = "ฝ่ายรับสมัครฝึกงาน / HR"
        line_id = ""
        contact_email = poster_email

        desc = j.description or ""
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

        results.append({
            "id": j.id,
            "title": j.title,
            "user_id": j.user_id,
            "employer_id": j.user_id,  # compatibility field
            "employer_name": comp_name,
            "poster_email": poster_email,
            "contact_email": contact_email,
            "company_name": comp_name,
            "contact_person": contact_person,
            "phone": phone,
            "email": contact_email,
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
        
        create_notification(
            db=db,
            user_id=job.user_id,
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
        
        create_notification(
            db=db,
            user_id=job.user_id,
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

# --- 6. การอนุมัติคำขอยืนยันสิทธิ์นักศึกษา ---
@router.get("/upgrades")
@router.get("/upgrade-requests")
def list_upgrade_requests(status: str = Query(None),
                          db: Session = Depends(get_db),
                          admin: User = Depends(require_admin)):
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
def update_upgrade_request_status(request_id: int, payload: dict = Body(...),
                                  db: Session = Depends(get_db),
                                  admin: User = Depends(require_admin)):
    req = db.query(UpgradeRequest).filter(UpgradeRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "ไม่พบคำขอ")

    status_str = payload.get("status")
    reason = payload.get("rejection_reason") or payload.get("reason")

    if status_str == "rejected":
        if not reason or not str(reason).strip():
            raise HTTPException(400, "ต้องระบุเหตุผลในการปฏิเสธคำขอ")
        req.status = UpgradeRequestStatus.rejected
        req.rejection_reason = str(reason).strip()

        create_notification(
            db=db,
            user_id=req.user_id,
            title="คำขอยืนยันสิทธิ์นักศึกษาถูกปฏิเสธ",
            message=f"คำขอของคุณถูกปฏิเสธเนื่องจาก: {str(reason).strip()}",
            type="warning",
            link="/profile?tab=upgrade"
        )
        db.add(AuditLog(admin_id=admin.id, action="reject_upgrade",
                        target_type="upgrade_request", target_id=request_id, reason=str(reason).strip()))
        db.commit()
        return {"message": "ปฏิเสธคำขอสำเร็จ"}

    elif status_str == "approved":
        req.status = UpgradeRequestStatus.approved
        req.rejection_reason = None

        user = db.query(User).filter(User.id == req.user_id).first()
        if user:
            user.role = UserRole.student

        create_notification(
            db=db,
            user_id=req.user_id,
            title="ยืนยันสิทธิ์นักศึกษาสำเร็จ!",
            message="บัญชีของคุณได้รับการอัปเกรดเป็นนักศึกษาเรียบร้อยแล้ว สามารถเขียนรีวิวและใช้งานได้เต็มรูปแบบ",
            type="success",
            link="/insights"
        )
        db.add(AuditLog(admin_id=admin.id, action="approve_upgrade",
                        target_type="upgrade_request", target_id=request_id))
        db.commit()
        return {"message": "อนุมัติคำขอยืนยันสิทธิ์นักศึกษาสำเร็จ"}
    else:
        raise HTTPException(400, "สถานะไม่ถูกต้อง")


# --- 7. การจัดการรายงานเนื้อหาไม่เหมาะสม (Reports Moderation) ---
@router.get("/reports")
def list_reports(status: str = Query(None),
                 db: Session = Depends(get_db),
                 admin: User = Depends(require_admin)):
    """ ดึงรายการข้อร้องเรียน/รายงานเนื้อหาไม่เหมาะสม """
    query = db.query(Report)
    if status == "pending" or not status:
        query = query.filter(Report.status == "pending")
    elif status != "all":
        query = query.filter(Report.status == status)

    reports = query.order_by(Report.created_at.desc()).all()
    results = []
    for rep in reports:
        target_type = "general"
        target_type_th = "รายงานทั่วไป"
        target_id = None
        target_title = None
        target_content = None
        is_anon = False

        if rep.post:
            target_type = "post"
            target_type_th = "กระทู้ชุมชน"
            target_id = rep.post_id
            target_title = rep.post.title
            target_content = rep.post.content
        elif rep.review:
            target_type = "review"
            target_type_th = "รีวิวฝึกงาน"
            target_id = rep.review_id
            target_title = f"รีวิว {rep.review.company.name if rep.review.company else ''}"
            target_content = rep.review.text_work
        elif rep.comment:
            target_type = "comment"
            target_type_th = "ความคิดเห็น"
            target_id = rep.comment_id
            target_title = f"ความคิดเห็นในกระทู้ #{rep.comment.post_id}"
            target_content = rep.comment.content
        elif rep.job:
            target_type = "job"
            target_type_th = "ประกาศรับสมัครงาน"
            target_id = rep.job_id
            target_title = rep.job.title
            target_content = rep.job.description
        elif rep.company:
            target_type = "company"
            target_type_th = "ข้อมูลสถานที่ฝึกงาน"
            target_id = rep.company_id
            target_title = rep.company.name
            target_content = rep.company.address

        results.append({
            "id": rep.id,
            "reporter_id": rep.reporter_id,
            "reporter_name": rep.reporter.name if rep.reporter else "ผู้ใช้งาน",
            "reporter_email": rep.reporter.email if rep.reporter else "-",
            "reason": rep.reason,
            "target_type": target_type,
            "target_type_th": target_type_th,
            "target_id": target_id,
            "target_title": target_title,
            "target_content": target_content,
            "post_id": rep.post_id,
            "review_id": rep.review_id,
            "comment_id": rep.comment_id,
            "job_id": rep.job_id,
            "company_id": rep.company_id,
            "company_name": rep.company.name if rep.company else None,
            "status": rep.status or "pending",
            "created_at": to_thai_str(rep.created_at),
        })
    return results

@router.patch("/reports/{report_id}")
def update_report_status(report_id: int, payload: dict = Body(...),
                         db: Session = Depends(get_db),
                         admin: User = Depends(require_admin)):
    """ ดำเนินการตรวจสอบ/ปัดตก/จัดการข้อร้องเรียน """
    rep = db.query(Report).filter(Report.id == report_id).first()
    if not rep:
        raise HTTPException(404, "ไม่พบรายงานข้อร้องเรียนนี้")

    status_str = payload.get("status", "resolved")
    action = payload.get("action", "")

    rep.status = status_str
    db.add(AuditLog(
        admin_id=admin.id,
        action=f"report_{status_str}",
        target_type="report",
        target_id=report_id,
        reason=f"Action: {action} | Status: {status_str}"
    ))
    db.commit()
    return {"message": "จัดการรายงานเรียบร้อยแล้ว"}

# --- 8. ประวัติการดำเนินงานของผู้ดูแลระบบ (Audit Logs) ---
@router.get("/audit-logs")
def list_audit_logs(limit: int = Query(100),
                    db: Session = Depends(get_db),
                    admin: User = Depends(require_admin)):
    """ ดึงประวัติ Audit Logs ของผู้ดูแลระบบ """
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "admin_id": l.admin_id,
            "admin_name": l.admin.name if l.admin else "Admin",
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "reason": l.reason,
            "created_at": to_thai_str(l.created_at),
        }
        for l in logs
    ]


# --- 9. การลบข้อมูลโดยผู้ดูแลระบบ (Admin Delete Endpoints) ---
@router.delete("/reviews/{review_id}")
def admin_delete_review(review_id: int,
                        db: Session = Depends(get_db),
                        admin: User = Depends(require_admin)):
    """ ผู้ดูแลระบบลบรีวิวที่ไม่เหมาะสมถาวร """
    rev = db.query(Review).filter(Review.id == review_id).first()
    if not rev:
        raise HTTPException(404, "ไม่พบรีวิวที่ต้องการลบ")

    company_name = rev.company.name if rev.company else "Unknown"
    db.query(Report).filter(Report.review_id == review_id).delete()
    db.delete(rev)
    db.add(AuditLog(
        admin_id=admin.id,
        action="delete_review",
        target_type="review",
        target_id=review_id,
        reason=f"Admin deleted review for {company_name}"
    ))
    db.commit()
    return {"message": "ลบรีวิวเรียบร้อยแล้ว"}

@router.delete("/posts/{post_id}")
def admin_delete_post(post_id: int,
                      db: Session = Depends(get_db),
                      admin: User = Depends(require_admin)):
    """ ผู้ดูแลระบบลบกระทู้ที่ไม่เหมาะสมถาวร """
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "ไม่พบกระทู้ที่ต้องการลบ")

    title = post.title
    db.query(Report).filter(Report.post_id == post_id).delete()
    db.delete(post)
    db.add(AuditLog(
        admin_id=admin.id,
        action="delete_post",
        target_type="post",
        target_id=post_id,
        reason=f"Admin deleted post: {title[:40]}"
    ))
    db.commit()
    return {"message": "ลบกระทู้เรียบร้อยแล้ว"}

@router.delete("/jobs/{job_id}")
def admin_delete_job(job_id: int,
                     db: Session = Depends(get_db),
                     admin: User = Depends(require_admin)):
    """ ผู้ดูแลระบบลบประกาศงานถาวร """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(404, "ไม่พบประกาศงานที่ต้องการลบ")

    title = job.title
    db.query(Report).filter(Report.job_id == job_id).delete()
    db.delete(job)
    db.add(AuditLog(
        admin_id=admin.id,
        action="delete_job",
        target_type="job",
        target_id=job_id,
        reason=f"Admin deleted job: {title[:40]}"
    ))
    db.commit()
    return {"message": "ลบประกาศงานเรียบร้อยแล้ว"}

@router.delete("/comments/{comment_id}")
def admin_delete_comment(comment_id: int,
                         db: Session = Depends(get_db),
                         admin: User = Depends(require_admin)):
    """ ผู้ดูแลระบบลบความคิดเห็นถาวร """
    comment = db.query(CommunityComment).filter(CommunityComment.id == comment_id).first()
    if not comment:
        raise HTTPException(404, "ไม่พบความคิดเห็นที่ต้องการลบ")

    db.query(Report).filter(Report.comment_id == comment_id).delete()
    db.delete(comment)
    db.add(AuditLog(
        admin_id=admin.id,
        action="delete_comment",
        target_type="comment",
        target_id=comment_id,
        reason="Admin deleted comment"
    ))
    db.commit()
    return {"message": "ลบความคิดเห็นเรียบร้อยแล้ว"}
