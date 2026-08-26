from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
from models import (CommunityPost, CommunityComment, CommunityLike,
                    Report, PostType, User, UserRole)
from schemas.community import PostCreate, CommentCreate, CommentUpdate, ReportCreate
from dependencies import require_student
from auth import encrypt_identity
from routers.notifications import create_notification

router = APIRouter(prefix="/community", tags=["community"])

def to_thai_str(dt, fmt="%Y-%m-%d %H:%M"):
    if not dt:
        return None
    return (dt + timedelta(hours=7)).strftime(fmt)

@router.get("/posts")
def list_posts(department: str = None, type: str = None,
               sort: str = "latest", skip: int = 0, limit: int = 20,
               db: Session = Depends(get_db),
               current_user: User = Depends(require_student)):
    """ ดึงรายการกระทู้ชุมชน (Community Posts) ที่ผ่านการอนุมัติแล้ว พร้อมตัวกรองตามแผนก/ประเภท/ยอดนิยม """
    query = db.query(CommunityPost).filter(CommunityPost.status == "approved")
    if department and department != "ทั้งหมด":
        query = query.filter(CommunityPost.department == department)
    if type:
        query = query.filter(CommunityPost.type == type)
    if sort == "popular":
        from sqlalchemy import func
        query = query.outerjoin(CommunityLike).group_by(
            CommunityPost.id).order_by(func.count(CommunityLike.id).desc())
    else:
        query = query.order_by(CommunityPost.is_pinned.desc(), CommunityPost.created_at.desc())
    posts = query.offset(skip).limit(limit).all()
    return [_format_post(p) for p in posts]

@router.get("/posts/my")
@router.get("/my-posts")
def get_my_posts(db: Session = Depends(get_db), current_user: User = Depends(require_student)):
    """ ดึงประวัติกระทู้ทั้งหมดที่ตนเองเคยสร้าง (ทั้ง pending, approved, rejected) """
    posts = db.query(CommunityPost).filter(
        CommunityPost.user_id == current_user.id
    ).order_by(CommunityPost.created_at.desc()).all()
    return [_format_post(p) for p in posts]

@router.post("/posts", status_code=201)
def create_post(data: PostCreate,
                current_user: User = Depends(require_student),
                db: Session = Depends(get_db)):
    """ สร้างกระทู้ถาม-ตอบ หรือแชร์ประสบการณ์ใหม่ (จำกัด 6 กระทู้ต่อคน, ส่งรอ Admin อนุมัติ) """
    # จำกัด 1 บัญชีผู้ใช้โพสต์กระทู้ได้ไม่เกิน 6 กระทู้
    post_count = db.query(CommunityPost).filter(CommunityPost.user_id == current_user.id).count()
    if post_count >= 6:
        raise HTTPException(
            status_code=400,
            detail="คุณได้สร้างกระทู้ครบโควตาแล้ว (จำกัดสูงสุด 6 กระทู้ต่อ 1 บัญชีผู้ใช้) หากต้องการตั้งกระทู้ใหม่ กรุณาลบกระทู้เดิมที่ไม่จำเป็นออกก่อนในหน้าโปรไฟล์"
        )

    post_type_enum = PostType(data.type) if data.type in PostType.__members__ else PostType.experience
    anon_enc = encrypt_identity(current_user.id) if data.is_anonymous else None
    post = CommunityPost(
        user_id=current_user.id,
        type=post_type_enum,
        department=data.department or current_user.department,
        title=data.title,
        content=data.content,
        is_anonymous=data.is_anonymous,
        anon_identity_enc=anon_enc,
        status="pending",
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    admins = db.query(User).filter(User.role == UserRole.admin).all()
    for adm in admins:
        create_notification(
            db=db,
            user_id=adm.id,
            title="มีโพสต์ใหม่ใน Community รอการอนุมัติ",
            message=f"มีโพสต์ใหม่ '{post.title[:35]}' จากนักศึกษา รอการตรวจสอบจาก Admin",
            type="info",
            link="/admin",
        )

    return {"message": "โพสต์สำเร็จ (อยู่ระหว่างรอผู้ดูแลระบบอนุมัติ)", "post_id": post.id}

@router.get("/comments/my")
@router.get("/my-comments")
def get_my_comments(db: Session = Depends(get_db), current_user: User = Depends(require_student)):
    """ ดึงประวัติความคิดเห็นทั้งหมดที่ตนเองเคยเขียนในทุกกระทู้ """
    comments = db.query(CommunityComment).filter(
        CommunityComment.user_id == current_user.id
    ).order_by(CommunityComment.created_at.desc()).all()
    
    results = []
    for c in comments:
        res = _format_comment(c)
        res["post_title"] = c.post.title if c.post else "กระทู้ที่ถูกลบ"
        results.append(res)
    return results

@router.get("/posts/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(require_student)):
    """ ดึงรายละเอียดกระทู้ พร้อมรายการความคิดเห็นที่ผ่านการอนุมัติแล้วเท่านั้น และข้อมูลความคิดเห็นของผู้ใช้ปัจจุบัน (ถ้ามี) """
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "ไม่พบโพสต์")
    
    # ดึงเฉพาะความคิดเห็นที่ผ่านการอนุมัติแล้วเท่านั้นสำหรับรายการแสดงผลสาธารณะ
    approved_comments = [c for c in post.comments if c.status == "approved"]
    
    # ค้นหาความคิดเห็นของผู้ใช้งานปัจจุบันในกระทู้นี้ (ไม่ว่าจะสถานะใด)
    my_comment_obj = next((c for c in post.comments if c.user_id == current_user.id), None)
    my_comment = _format_comment(my_comment_obj) if my_comment_obj else None
        
    return {
        **_format_post(post),
        "comments": [_format_comment(c) for c in approved_comments],
        "my_comment": my_comment,
        "has_commented": my_comment is not None,
    }

@router.post("/posts/{post_id}/comments", status_code=201)
def add_comment(post_id: int, data: CommentCreate,
                current_user: User = Depends(require_student),
                db: Session = Depends(get_db)):
    """ เพิ่มความคิดเห็นในกระทู้ (จำกัด 1 บัญชี ต่อ 1 ความคิดเห็นต่อกระทู้ และส่งรอ Admin อนุมัติ) """
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "ไม่พบโพสต์")
    
    # ตรวจสอบว่าเคยแสดงความคิดเห็นในกระทู้นี้แล้วหรือไม่
    existing_comment = db.query(CommunityComment).filter(
        CommunityComment.post_id == post_id,
        CommunityComment.user_id == current_user.id
    ).first()
    if existing_comment:
        raise HTTPException(
            status_code=400,
            detail="คุณได้แสดงความคิดเห็นในกระทู้นี้แล้ว (จำกัด 1 บัญชีผู้ใช้ ต่อ 1 ความคิดเห็นต่อกระทู้ ท่านสามารถแก้ไขความคิดเห็นเดิมได้)"
        )
    
    anon_enc = encrypt_identity(current_user.id) if data.is_anonymous else None
    comment = CommunityComment(
        post_id=post_id,
        user_id=current_user.id,
        parent_id=data.parent_id,
        content=data.content,
        is_anonymous=data.is_anonymous,
        anon_identity_enc=anon_enc,
        status="pending",
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # แจ้งเตือน Admin เมื่อมีความคิดเห็นใหม่รออนุมัติ
    admins = db.query(User).filter(User.role == UserRole.admin).all()
    for adm in admins:
        create_notification(
            db=db,
            user_id=adm.id,
            title="มีความคิดเห็นใหม่ใน Community รอการอนุมัติ",
            message=f"มีความคิดเห็นใหม่ในกระทู้ '{post.title[:30]}' รอการตรวจสอบจาก Admin",
            type="info",
            link="/admin",
        )

    return {"message": "ส่งความคิดเห็นเรียบร้อยแล้ว (อยู่ระหว่างรอผู้ดูแลระบบตรวจสอบอนุมัติ)", "comment_id": comment.id}

@router.post("/posts/{post_id}/like")
def toggle_like(post_id: int, current_user: User = Depends(require_student),
                db: Session = Depends(get_db)):
    """ กดถูกใจ (Like) หรือยกเลิกการกดถูกใจกระทู้ """
    existing = db.query(CommunityLike).filter(
        CommunityLike.user_id == current_user.id,
        CommunityLike.post_id == post_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False}
    db.add(CommunityLike(user_id=current_user.id, post_id=post_id))
    db.commit()
    return {"liked": True}

@router.post("/reports", status_code=201)
def submit_report(data: ReportCreate,
                  current_user: User = Depends(require_student),
                  db: Session = Depends(get_db)):
    """ ส่งรายงานเนื้อหาไม่เหมาะสม (Report) ไปยัง Admin เพื่อตรวจสอบ """
    db.add(Report(reporter_id=current_user.id,
                  post_id=data.post_id, review_id=data.review_id,
                  reason=data.reason))
    db.commit()
    return {"message": "รายงานสำเร็จ Admin จะตรวจสอบ"}

@router.delete("/posts/{post_id}")
def delete_my_post(post_id: int, current_user: User = Depends(require_student),
                   db: Session = Depends(get_db)):
    """ ลบกระทู้ของตนเอง """
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="ไม่พบกระทู้ที่ต้องการลบ")
    if post.user_id != current_user.id and current_user.role != UserRole.admin and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ลบกระทู้นี้")
    db.delete(post)
    db.commit()
    return {"message": "ลบกระทู้เรียบร้อยแล้ว"}

@router.put("/comments/{comment_id}")
def update_comment(comment_id: int, data: CommentUpdate,
                   current_user: User = Depends(require_student),
                   db: Session = Depends(get_db)):
    """ แก้ไขความคิดเห็นของตนเอง (อนุญาตเฉพาะเจ้าของความคิดเห็นเท่านั้น) """
    comment = db.query(CommunityComment).filter(CommunityComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="ไม่พบความคิดเห็น")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์แก้ไขความคิดเห็นของผู้อื่น")
    comment.content = data.content
    db.commit()
    return {"message": "แก้ไขความคิดเห็นเรียบร้อยแล้ว"}

@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int,
                   current_user: User = Depends(require_student),
                   db: Session = Depends(get_db)):
    """ ลบความคิดเห็นของตนเอง หรือ Admin ลบความคิดเห็นเพื่อการดูแลระบบ """
    comment = db.query(CommunityComment).filter(CommunityComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="ไม่พบความคิดเห็น")
    if comment.user_id != current_user.id and current_user.role != UserRole.admin and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ลบความคิดเห็นนี้")
    
    # ลบไลก์และรายงานที่เกี่ยวข้องกับคอมเมนต์นี้
    db.query(CommunityLike).filter(CommunityLike.comment_id == comment_id).delete()
    db.query(Report).filter(Report.comment_id == comment_id).delete()
    db.delete(comment)
    db.commit()
    return {"message": "ลบความคิดเห็นเรียบร้อยแล้ว"}

def _format_post(post: CommunityPost) -> dict:
    """ ฟังก์ชันแปลงข้อมูลกระทู้ให้อยู่ในรูปแบบ JSON พร้อมซ่อนชื่อเมื่อเลือก Anonymous """
    return {
        "id": post.id, "type": post.type.value if post.type else None,
        "department": post.department, "title": post.title,
        "content": post.content, "is_anonymous": post.is_anonymous,
        "user_id": post.user_id,
        "author_name": None if post.is_anonymous else post.user.name,
        "author_department": None if post.is_anonymous else post.user.department,
        "like_count": len(post.likes),
        "comment_count": len(post.comments),
        "is_pinned": post.is_pinned,
        "status": post.status or "pending",
        "rejection_reason": post.rejection_reason,
        "created_at": to_thai_str(post.created_at),
    }

def _format_comment(comment: CommunityComment) -> dict:
    """ ฟังก์ชันแปลงข้อมูลความคิดเห็นให้อยู่ในรูปแบบ JSON """
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "is_anonymous": comment.is_anonymous,
        "author_name": None if comment.is_anonymous else (comment.user.name if comment.user else "นักศึกษา"),
        "parent_id": comment.parent_id,
        "is_best_answer": comment.is_best_answer,
        "status": comment.status or "pending",
        "rejection_reason": comment.rejection_reason,
        "like_count": len(comment.likes) if comment.likes else 0,
        "created_at": to_thai_str(comment.created_at),
    }

