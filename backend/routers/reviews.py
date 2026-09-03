from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import date, timedelta
import os
from database import get_db
from models import Review, ReviewPhoto, Company, User, ReviewStatus, Gender, UserRole
from schemas.reviews import ReviewCreate, ReviewPublic
from dependencies import require_student, get_current_user
from services.cloudinary_service import upload_review_photo
from routers.notifications import create_notification

router = APIRouter(tags=["reviews"])

def to_thai_date(dt):
    if not dt:
        return None
    return (dt + timedelta(hours=7)).strftime("%Y-%m-%d")

def is_auto_approve() -> bool:
    """ ตรวจสอบว่าระบบเปิดโหมดอนุมัติรีวิวอัตโนมัติหรือไม่ """
    return os.getenv("AUTO_APPROVE_REVIEWS", "false").lower() in ("true", "1", "yes")

@router.get("/reviews", response_model=list[ReviewPublic])
def get_all_reviews(skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(require_student)):
    """ ดึงรายการรีวิวทั้งหมดที่ได้รับการอนุมัติแล้วในระบบ เรียงจากล่าสุด """
    reviews = db.query(Review).filter(
        Review.status == ReviewStatus.approved,
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in reviews:
        author_name = r.user.name if r.user else "นักศึกษา HTC"
        photo_urls = [p.url for p in r.photos]
        result.append(ReviewPublic(
            id=r.id, company_id=r.company_id, user_id=r.user_id,
            gender=r.gender.value if r.gender else "prefer_not",
            department=r.department,
            daily_allowance=r.daily_allowance,
            work_start_time=r.work_start_time,
            work_end_time=r.work_end_time,
            score_overall=r.score_overall, score_work=r.score_work,
            score_env=r.score_env, score_mentor=r.score_mentor,
            score_welfare=r.score_welfare,
            text_work=r.text_work, text_pros=r.text_pros,
            text_cons=r.text_cons, text_advice=r.text_advice,
            author_name=author_name,
            author_department=r.department,
            photo_urls=photo_urls,
            status=r.status.value if r.status else "approved",
            created_at=to_thai_date(r.created_at),
        ))
    return result

@router.post("/reviews", status_code=201)
def create_review(data: ReviewCreate,
                  current_user: User = Depends(require_student),
                  db: Session = Depends(get_db)):
    """ บันทึกรีวิวประสบการณ์ฝึกงานใหม่ของนักศึกษา พร้อมระบบจำกัด 1 รีวิว/คน """
    if not db.query(Company).filter(Company.id == data.company_id).first():
        raise HTTPException(404, "ไม่พบสถานประกอบการ")
    if len(data.text_work.strip()) < 30:
        raise HTTPException(400, "รายละเอียดลักษณะงานต้องมีอย่างน้อย 30 ตัวอักษร")
    if len(data.text_work) > 1000:
        raise HTTPException(400, "รายละเอียดลักษณะงานต้องไม่เกิน 1000 ตัวอักษร")
    if not data.text_pros or not data.text_pros.strip():
        raise HTTPException(400, "กรุณาระบุข้อดี/จุดเด่นของสถานที่ฝึกงาน")
    if not data.text_cons or not data.text_cons.strip():
        raise HTTPException(400, "กรุณาระบุข้อจำกัด/ข้อควรปรับปรุงของสถานที่ฝึกงาน")

    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(400, "คุณได้ส่งรีวิวสถานประกอบการในระบบแล้ว (จำกัด 1 ผู้ใช้ ต่อ 1 รีวิว)")

    gender_enum = Gender(data.gender) if data.gender in Gender.__members__ else Gender.prefer_not

    sub_scores = [s for s in [data.score_work, data.score_env, data.score_mentor, data.score_welfare] if s is not None]
    computed_overall = round(sum(sub_scores) / len(sub_scores), 1) if sub_scores else (data.score_overall or 5.0)

    review = Review(
        company_id=data.company_id,
        user_id=current_user.id,
        gender=gender_enum,
        period_start=data.period_start,
        period_end=data.period_end,
        department=data.department,
        daily_allowance=data.daily_allowance or 0,
        work_start_time=data.work_start_time,
        work_end_time=data.work_end_time,
        score_overall=computed_overall,
        score_work=data.score_work,
        score_env=data.score_env,
        score_mentor=data.score_mentor,
        score_welfare=data.score_welfare,
        text_work=data.text_work,
        text_pros=data.text_pros,
        text_cons=data.text_cons,
        text_advice=data.text_advice,
        status=ReviewStatus.approved if is_auto_approve() else ReviewStatus.pending,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    if review.status == ReviewStatus.pending:
        admins = db.query(User).filter(User.role == UserRole.admin).all()
        comp_obj = db.query(Company).filter(Company.id == data.company_id).first()
        comp_name = comp_obj.name if comp_obj else "สถานประกอบการ"
        for adm in admins:
            create_notification(
                db=db,
                user_id=adm.id,
                title="มีรีวิวใหม่รอการอนุมัติ",
                message=f"มีนักศึกษาส่งรีวิวสำหรับ '{comp_name}' รอการตรวจสอบจาก Admin",
                type="info",
                link="/admin"
            )
    
    msg = "ส่งรีวิวสำเร็จและอนุมัติแล้ว" if review.status == ReviewStatus.approved else "ส่งรีวิวสำเร็จ รอ Admin อนุมัติ"
    return {"message": msg, "review_id": review.id}

@router.post("/reviews/{review_id}/photos", status_code=201)
def upload_photos(
    review_id: int,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """ อัปโหลดรูปภาพประกอบรีวิวไปยัง Cloudinary (สูงสุด 2 รูปต่อรีวิว) """
    review = db.query(Review).filter(
        Review.id == review_id, Review.user_id == current_user.id
    ).first()
    if not review:
        raise HTTPException(404, "ไม่พบรีวิวหรือไม่มีสิทธิ์")
    
    current_photo_count = db.query(ReviewPhoto).filter(ReviewPhoto.review_id == review.id).count()
    if current_photo_count + len(files) > 2:
        raise HTTPException(400, f"แนบรูปได้สูงสุดรวมไม่เกิน 2 รูป (ปัจจุบันมีแล้ว {current_photo_count} รูป)")

    uploaded_urls = []
    for f in files:
        if f.content_type and not f.content_type.startswith("image/"):
            raise HTTPException(400, f"ไฟล์ {f.filename} ไม่ใช่รูปภาพ")
        try:
            content = f.file.read()
            if len(content) > 5 * 1024 * 1024:
                raise HTTPException(400, f"ไฟล์ {f.filename} มีขนาดเกิน 5MB")
            url = upload_review_photo(content, f.filename)
            rp = ReviewPhoto(review_id=review.id, url=url)
            db.add(rp)
            uploaded_urls.append(url)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"อัปโหลดรูปภาพไม่สำเร็จ: {str(e)}")

    db.commit()
    return {"message": f"อัปโหลดสำเร็จ {len(uploaded_urls)} รูป", "urls": uploaded_urls}

@router.delete("/reviews/{review_id}/photos")
def delete_review_photos(
    review_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """ ลบรูปภาพทั้งหมดที่แนบกับรีวิวนี้ """
    review = db.query(Review).filter(
        Review.id == review_id, Review.user_id == current_user.id
    ).first()
    if not review and current_user.role != UserRole.admin:
        raise HTTPException(404, "ไม่พบรีวิวหรือไม่มีสิทธิ์")

    db.query(ReviewPhoto).filter(ReviewPhoto.review_id == review_id).delete()
    db.commit()
    return {"message": "ลบรูปภาพทั้งหมดเรียบร้อยแล้ว"}

@router.get("/reviews/my")
def get_my_reviews(current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """ ดึงรายการรีวิวทั้งหมดของผู้ใช้งานปัจจุบัน """
    reviews = db.query(Review).filter(
        Review.user_id == current_user.id
    ).order_by(Review.created_at.desc()).all()
    
    result = []
    for r in reviews:
        author_name = current_user.name
        photo_urls = [p.url for p in r.photos]
        result.append({
            "id": r.id,
            "company_id": r.company_id,
            "company_name": r.company.name if r.company else "สถานประกอบการ",
            "gender": r.gender.value if r.gender else "prefer_not",
            "period_start": r.period_start.isoformat() if r.period_start else None,
            "period_end": r.period_end.isoformat() if r.period_end else None,
            "department": r.department,
            "daily_allowance": r.daily_allowance,
            "work_start_time": r.work_start_time,
            "work_end_time": r.work_end_time,
            "score_overall": r.score_overall,
            "score_work": r.score_work,
            "score_env": r.score_env,
            "score_mentor": r.score_mentor,
            "score_welfare": r.score_welfare,
            "text_work": r.text_work,
            "text_pros": r.text_pros,
            "text_cons": r.text_cons,
            "text_advice": r.text_advice,
            "author_name": author_name,
            "author_department": r.department,
            "photo_urls": photo_urls,
            "status": r.status.value if r.status else "pending",
            "rejection_reason": r.rejection_reason,
            "created_at": to_thai_date(r.created_at),
        })
    return result

@router.put("/reviews/{review_id}")
def update_review(review_id: int,
                  data: ReviewCreate,
                  current_user: User = Depends(require_student),
                  db: Session = Depends(get_db)):
    """ แก้ไขรีวิวเดิมของตนเอง และส่งให้ Admin ตรวจสอบใหม่ """
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id
    ).first()
    if not review:
        raise HTTPException(404, "ไม่พบรีวิวที่ต้องการแก้ไข")

    if not data.text_pros or not data.text_pros.strip():
        raise HTTPException(400, "กรุณาระบุข้อดี/จุดเด่น")
    if not data.text_cons or not data.text_cons.strip():
        raise HTTPException(400, "กรุณาระบุข้อควรปรับปรุง")

    gender_enum = Gender(data.gender) if data.gender in Gender.__members__ else Gender.prefer_not

    sub_scores = [s for s in [data.score_work, data.score_env, data.score_mentor, data.score_welfare] if s is not None]
    computed_overall = round(sum(sub_scores) / len(sub_scores), 1) if sub_scores else (data.score_overall or 5.0)

    review.company_id = data.company_id
    review.gender = gender_enum
    review.period_start = data.period_start
    review.period_end = data.period_end
    review.department = data.department
    review.daily_allowance = data.daily_allowance or 0
    review.work_start_time = data.work_start_time
    review.work_end_time = data.work_end_time
    review.score_overall = computed_overall
    review.score_work = data.score_work
    review.score_env = data.score_env
    review.score_mentor = data.score_mentor
    review.score_welfare = data.score_welfare
    review.text_work = data.text_work
    review.text_pros = data.text_pros
    review.text_cons = data.text_cons
    review.text_advice = data.text_advice
    review.status = ReviewStatus.approved if is_auto_approve() else ReviewStatus.pending
    review.rejection_reason = None

    db.commit()
    db.refresh(review)
    return {"message": "บันทึกการแก้ไขรีวิวสำเร็จ ส่งให้แอดมินตรวจสอบใหม่เรียบร้อยแล้ว", "review_id": review.id}

@router.delete("/reviews/{review_id}")
def delete_review(review_id: int,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """ ลบรีวิวของตนเอง หรือ Admin ลบรีวิวใดๆ """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "ไม่พบรีวิว")
    if review.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(403, "ไม่มีสิทธิ์ลบรีวิวนี้")

    db.query(ReviewPhoto).filter(ReviewPhoto.review_id == review_id).delete()
    db.delete(review)
    db.commit()
    return {"message": "ลบรีวิวเรียบร้อยแล้ว"}
