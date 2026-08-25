from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import (CommunityPost, CommunityComment, CommunityLike,
                    Report, PostType, User, UserRole)
from schemas.community import PostCreate, CommentCreate, ReportCreate
from dependencies import require_student
from auth import encrypt_identity
from routers.notifications import create_notification

router = APIRouter(prefix="/community", tags=["community"])

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
    """ สร้างกระทู้ถาม-ตอบ หรือแชร์ประสบการณ์ใหม่ (ส่งรอ Admin อนุมัติ) """
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

@router.get("/posts/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(require_student)):
    """ ดึงรายละเอียดกระทู้ พร้อมรายการความคิดเห็น (Comments) ทั้งหมด """
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "ไม่พบโพสต์")
    return {**_format_post(post), "comments": [_format_comment(c) for c in post.comments]}

@router.post("/posts/{post_id}/comments", status_code=201)
def add_comment(post_id: int, data: CommentCreate,
                current_user: User = Depends(require_student),
                db: Session = Depends(get_db)):
    """ เพิ่มความคิดเห็นในกระทู้ หรือตอบกลับความคิดเห็นย่อย """
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "ไม่พบโพสต์")
    anon_enc = encrypt_identity(current_user.id) if data.is_anonymous else None
    comment = CommunityComment(
        post_id=post_id, user_id=current_user.id,
        parent_id=data.parent_id, content=data.content,
        is_anonymous=data.is_anonymous, anon_identity_enc=anon_enc,
    )
    db.add(comment)
    db.commit()
    return {"message": "คอมเมนต์สำเร็จ"}

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
    if post.user_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ลบกระทู้นี้")
    db.delete(post)
    db.commit()
    return {"message": "ลบกระทู้เรียบร้อยแล้ว"}

def _format_post(post: CommunityPost) -> dict:
    """ ฟังก์ชันแปลงข้อมูลกระทู้ให้อยู่ในรูปแบบ JSON พร้อมซ่อนชื่อเมื่อเลือก Anonymous """
    return {
        "id": post.id, "type": post.type.value if post.type else None,
        "department": post.department, "title": post.title,
        "content": post.content, "is_anonymous": post.is_anonymous,
        "author_name": None if post.is_anonymous else post.user.name,
        "author_department": None if post.is_anonymous else post.user.department,
        "like_count": len(post.likes),
        "comment_count": len(post.comments),
        "is_pinned": post.is_pinned,
        "status": post.status or "pending",
        "rejection_reason": post.rejection_reason,
        "created_at": post.created_at.strftime("%Y-%m-%d %H:%M") if post.created_at else None,
    }

def _format_comment(comment: CommunityComment) -> dict:
    """ ฟังก์ชันแปลงข้อมูลความคิดเห็นให้อยู่ในรูปแบบ JSON """
    return {
        "id": comment.id, "content": comment.content,
        "is_anonymous": comment.is_anonymous,
        "author_name": None if comment.is_anonymous else comment.user.name,
        "parent_id": comment.parent_id,
        "is_best_answer": comment.is_best_answer,
        "like_count": len(comment.likes),
        "created_at": comment.created_at.strftime("%Y-%m-%d %H:%M") if comment.created_at else None,
    }
