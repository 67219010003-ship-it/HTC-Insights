from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from database import get_db
from models import (Review, Employer, ReviewStatus, AuditLog, User, UserRole,
                    JobPosting, CommunityPost, CommunityComment, Report,
                    UpgradeRequest, UpgradeRequestStatus)
from dependencies import require_admin, require_super_admin
from auth import decrypt_identity
from routers.notifications import create_notification

router = APIRouter(prefix="/admin", tags=["admin"])

# --- Stats Dashboard ---
@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
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
            "pending_reports": pending_reports,
        },
        "upgrades": {
            "pending": pending_upgrades,
        }
    }

# --- Reviews Management ---
@router.get("/reviews/pending")
@router.get("/reviews")
def list_reviews(status: str = Query(None),
                 db: Session = Depends(get_db),
                 admin: User = Depends(require_admin)):
    query = db.query(Review)
    if status and status in ReviewStatus.__members__:
        query = query.filter(Review.status == ReviewStatus(status))
    elif status == "pending" or not status:
        # Default for /reviews/pending endpoint
        query = query.filter(Review.status == ReviewStatus.pending)
        
    reviews = query.order_by(Review.created_at.desc()).all()
    result = []
    for r in reviews:
        result.append({
            "id": r.id,
            "company_id": r.company_id,
            "company_name": r.company.name if r.company else "Unknown",
            "real_author": r.user.name if r.user else "Unknown",
            "real_email": r.user.email if r.user else "Unknown",
            "is_anonymous": r.is_anonymous,
            "score_overall": r.score_overall,
            "text_work": r.text_work,
            "text_pros": r.text_pros,
            "text_cons": r.text_cons,
            "status": r.status.value if r.status else "pending",
            "rejection_reason": r.rejection_reason,
            "photo_urls": [p.url for p in r.photos],
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else None,
        })
    return result

@router.patch("/reviews/{review_id}")
def update_review_status(review_id: int, payload: dict = Body(...),
                         db: Session = Depends(get_db),
                         admin: User = Depends(require_admin)):
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

@router.get("/anonymous-reveal/{review_id}")
def reveal_anonymous(review_id: int, reason: str,
                     db: Session = Depends(get_db),
                     admin: User = Depends(require_admin)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review or not review.is_anonymous:
        raise HTTPException(404, "ไม่พบรีวิว anonymous")
    real_user_id = decrypt_identity(review.anon_identity_enc)
    user = db.query(User).filter(User.id == real_user_id).first()
    db.add(AuditLog(admin_id=admin.id, action="reveal_anonymous",
                    target_type="review", target_id=review_id, reason=reason))
    db.commit()
    return {"real_name": user.name if user else "Unknown", "real_email": user.email if user else "Unknown"}

# --- Posts Management ---
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
            "type": p.type.value if p.type else "qa",
            "department": p.department,
            "title": p.title,
            "content": p.content,
            "status": p.status or "pending",
            "rejection_reason": p.rejection_reason,
            "is_pinned": p.is_pinned,
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else None,
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

# --- User Management ---
@router.get("/users")
def list_users(role: str = Query(None), q: str = Query(None),
               db: Session = Depends(get_db),
               admin: User = Depends(require_admin)):
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
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else None,
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
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "ไม่พบผู้ใช้")
    if target_user.is_super_admin:
        raise HTTPException(403, "ไม่สามารถระงับบัญชี Super Admin ได้")
        
    reason = payload.get("reason", "ระงับการใช้งานโดย Admin")
    target_user.is_verified = not target_user.is_verified  # Toggle active status
    status_str = "ระงับการใช้งาน" if not target_user.is_verified else "เปิดใช้งาน"
    db.add(AuditLog(admin_id=admin.id, action="toggle_ban_user",
                    target_type="user", target_id=user_id, reason=reason))
    db.commit()
    return {"message": f"{status_str}บัญชีผู้ใช้สำเร็จ"}

# --- Job Posting Approval ---
@router.get("/jobs/pending")
@router.get("/jobs")
def list_admin_jobs(status: str = Query(None),
                    db: Session = Depends(get_db),
                    admin: User = Depends(require_admin)):
    query = db.query(JobPosting)
    if status:
        query = query.filter(JobPosting.status == status)
    jobs = query.order_by(JobPosting.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "employer_id": j.employer_id,
            "employer_name": j.employer.company_name if j.employer else "Unknown",
            "department": j.department,
            "description": j.description,
            "daily_allowance": j.daily_allowance,
            "location": j.location,
            "is_active": j.is_active,
            "status": j.status or "pending",
            "rejection_reason": j.rejection_reason,
            "created_at": j.created_at.strftime("%Y-%m-%d %H:%M") if j.created_at else None,
        }
        for j in jobs
    ]

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

@router.patch("/jobs/{job_id}/approve")
def approve_job(job_id: int, db: Session = Depends(get_db),
                admin: User = Depends(require_admin)):
    return update_job_status(job_id, {"status": "approved"}, db, admin)

@router.patch("/jobs/{job_id}/reject")
def reject_job(job_id: int, payload: dict = Body(default={}),
               db: Session = Depends(get_db),
               admin: User = Depends(require_admin)):
    payload["status"] = "rejected"
    return update_job_status(job_id, payload, db, admin)

# --- Student Upgrade Requests ---
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
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else None,
        }
        for r in reqs
    ]

@router.patch("/upgrades/{req_id}")
@router.patch("/upgrade-requests/{req_id}")
def update_upgrade_request_status(req_id: int, payload: dict = Body(...),
                                  db: Session = Depends(get_db),
                                  admin: User = Depends(require_admin)):
    req = db.query(UpgradeRequest).filter(UpgradeRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "ไม่พบคำขออนุมัติสิทธิ์")
    
    status_str = payload.get("status")
    reason = payload.get("rejection_reason") or payload.get("reason")
    
    if status_str == "rejected" or status_str == UpgradeRequestStatus.rejected.value:
        if not reason or not str(reason).strip():
            raise HTTPException(400, "ต้องระบุเหตุผลในการปฏิเสธ")
        req.status = UpgradeRequestStatus.rejected
        req.rejection_reason = str(reason).strip()
        
        create_notification(
            db=db,
            user_id=req.user_id,
            title="คำขออนุมัติสิทธิ์ถูกปฏิเสธ",
            message=f"คำขออนุมัติสิทธิ์นักศึกษาของคุณถูกปฏิเสธเนื่องจาก: {str(reason).strip()}",
            type="warning",
            link="/"
        )
        db.add(AuditLog(admin_id=admin.id, action="reject_student_upgrade",
                        target_type="upgrade_request", target_id=req_id, reason=str(reason).strip()))
        db.commit()
        return {"message": "ปฏิเสธคำขออนุมัติสิทธิ์สำเร็จ"}

    elif status_str == "approved" or status_str == UpgradeRequestStatus.approved.value:
        req.status = UpgradeRequestStatus.approved
        req.rejection_reason = None
        if req.user:
            req.user.role = UserRole.student
            if req.department:
                req.user.department = req.department
        
        create_notification(
            db=db,
            user_id=req.user_id,
            title="คำขออนุมัติสิทธิ์ได้รับการอนุมัติ",
            message="คุณได้รับการอนุมัติสิทธิ์เป็นนักศึกษาเรียบร้อยแล้ว",
            type="info",
            link="/"
        )
        db.add(AuditLog(admin_id=admin.id, action="approve_student_upgrade",
                        target_type="upgrade_request", target_id=req_id))
        db.commit()
        return {"message": "อนุมัติเปลี่ยนสิทธิ์เป็นนักศึกษาสำเร็จ"}
    else:
        raise HTTPException(400, "สถานะไม่ถูกต้อง")

@router.patch("/upgrade-requests/{req_id}/approve")
def approve_upgrade_request(req_id: int, db: Session = Depends(get_db),
                            admin: User = Depends(require_admin)):
    return update_upgrade_request_status(req_id, {"status": "approved"}, db, admin)

@router.patch("/upgrade-requests/{req_id}/reject")
def reject_upgrade_request(req_id: int, payload: dict = Body(default={}),
                           db: Session = Depends(get_db),
                           admin: User = Depends(require_admin)):
    payload["status"] = "rejected"
    return update_upgrade_request_status(req_id, payload, db, admin)

# --- Universal Reports Moderation ---
@router.get("/reports")
@router.get("/community/reports")
def list_reports(status: str = Query(None),
                 db: Session = Depends(get_db),
                 admin: User = Depends(require_admin)):
    query = db.query(Report)
    if status:
        query = query.filter(Report.status == status)
    reports = query.order_by(Report.created_at.desc()).all()
    result = []
    for rep in reports:
        item = {
            "id": rep.id,
            "reporter_name": rep.reporter.name if hasattr(rep, "reporter") and rep.reporter else "Unknown",
            "reason": rep.reason,
            "status": rep.status or "pending",
            "post_id": rep.post_id,
            "review_id": rep.review_id,
            "comment_id": rep.comment_id,
            "job_id": rep.job_id,
            "company_id": rep.company_id,
            "created_at": rep.created_at.strftime("%Y-%m-%d %H:%M") if rep.created_at else None,
        }
        if rep.post_id:
            p = db.query(CommunityPost).filter(CommunityPost.id == rep.post_id).first()
            if p:
                item["post_title"] = p.title
                item["post_content"] = p.content
        result.append(item)
    return result

@router.patch("/reports/{report_id}")
@router.patch("/community/reports/{report_id}/resolve")
def update_report_status(report_id: int, payload: dict = Body(default={}),
                         db: Session = Depends(get_db),
                         admin: User = Depends(require_admin)):
    rep = db.query(Report).filter(Report.id == report_id).first()
    if not rep:
        raise HTTPException(404, "ไม่พบรายงาน")
    
    action = payload.get("action")
    new_status = payload.get("status", "resolved")
    
    if action == "delete_post" and rep.post_id:
        p = db.query(CommunityPost).filter(CommunityPost.id == rep.post_id).first()
        if p:
            db.delete(p)
            
    rep.status = new_status
    db.add(AuditLog(admin_id=admin.id, action=f"update_report_{new_status}",
                    target_type="report", target_id=report_id))
    db.commit()
    return {"message": "จัดการรายงานสำเร็จ"}

# --- Employers Approval ---
@router.get("/employers/pending")
def list_pending_employers(db: Session = Depends(get_db),
                           admin: User = Depends(require_admin)):
    return db.query(Employer).filter(Employer.is_approved == False).all()

@router.patch("/employers/{employer_id}/approve")
def approve_employer(employer_id: int, db: Session = Depends(get_db),
                     admin: User = Depends(require_admin)):
    emp = db.query(Employer).filter(Employer.id == employer_id).first()
    if not emp:
        raise HTTPException(404, "ไม่พบสถานประกอบการ")
    emp.is_approved = True
    db.add(AuditLog(admin_id=admin.id, action="approve_employer",
                    target_type="employer", target_id=employer_id))
    db.commit()
    return {"message": "อนุมัติสถานประกอบการสำเร็จ"}

# --- Audit Logs ---
@router.get("/logs")
def list_audit_logs(db: Session = Depends(get_db),
                    admin: User = Depends(require_admin)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    result = []
    for l in logs:
        adm = db.query(User).filter(User.id == l.admin_id).first()
        result.append({
            "id": l.id,
            "admin_name": adm.name if adm else f"Admin #{l.admin_id}",
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "reason": l.reason,
            "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else None,
        })
    return result
