from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import date, timedelta
import os
from database import get_db
from models import Review, ReviewPhoto, Company, User, ReviewStatus, Gender, UserRole
from schemas.reviews import ReviewCreate, ReviewPublic
from dependencies import require_student
from auth import encrypt_identity
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
        author_name = None if r.is_anonymous else (r.user.name if r.user else "นักศึกษา HTC")
        author_dept = r.department or (r.user.department if r.user else "วิทยาลัยเทคนิคหาดใหญ่")
        photo_urls = [p.url for p in r.photos]
        result.append(ReviewPublic(
            id=r.id, company_id=r.company_id, user_id=r.user_id,
            gender=r.gender.value if r.gender else "prefer_not",
            department=r.department,
            daily_allowance=r.daily_allowance,
            has_transport=r.has_transport,
            work_start_time=r.work_start_time,
            work_end_time=r.work_end_time,
            score_overall=r.score_overall, score_work=r.score_work,
            score_env=r.score_env, score_mentor=r.score_mentor,
            score_welfare=r.score_welfare,
            text_work=r.text_work, text_pros=r.text_pros,
            text_cons=r.text_cons, text_advice=r.text_advice,
            is_anonymous=r.is_anonymous,
            author_name=author_name,
            author_department=None if r.is_anonymous else author_dept,
            photo_urls=photo_urls,
            status=r.status.value if r.status else "approved",
            created_at=to_thai_date(r.created_at),
        ))
    return result

@router.post("/reviews", status_code=201)
def create_review(data: ReviewCreate,
                  current_user: User = Depends(require_student),
                  db: Session = Depends(get_db)):
    """ บันทึกรีวิวประสบการณ์ฝึกงานใหม่ของนักศึกษา พร้อมระบบจำกัด 1 รีวิว/บริษัท/ปีการศึกษา """
    if not db.query(Company).filter(Company.id == data.company_id).first():
        raise HTTPException(404, "ไม่พบสถานประกอบการ")
    if len(data.text_work.strip()) < 30:
        raise HTTPException(400, "รายละเอียดลักษณะงานต้องมีอย่างน้อย 30 ตัวอักษร")
    if len(data.text_work) > 1000:
        raise HTTPException(400, "รายละเอียดลักษณะงานต้องไม่เกิน 1000 ตัวอักษร")
    if data.text_pros and len(data.text_pros) > 500:
        raise HTTPException(400, "จุดเด่น/ข้อดีต้องไม่เกิน 500 ตัวอักษร")
    if data.text_cons and len(data.text_cons) > 500:
        raise HTTPException(400, "ข้อจำกัด/ข้อควรปรับปรุงต้องไม่เกิน 500 ตัวอักษร")
    if data.text_advice and len(data.text_advice) > 500:
        raise HTTPException(400, "คำแนะนำแก่น้องๆ ต้องไม่เกิน 500 ตัวอักษร")

    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(400, "คุณได้ส่งรีวิวสถานประกอบการในระบบแล้ว (จำกัด 1 ผู้ใช้ ต่อ 1 รีวิว)")

    gender_enum = Gender(data.gender) if data.gender in Gender.__members__ else Gender.prefer_not
    anon_enc = encrypt_identity(current_user.id) if data.is_anonymous else None

    sub_scores = [s for s in [data.score_work, data.score_env, data.score_mentor, data.score_welfare] if s is not None]
    computed_overall = round(sum(sub_scores) / len(sub_scores), 1) if sub_scores else (data.score_overall or 5.0)

    review = Review(
        company_id=data.company_id,
        user_id=current_user.id,
        gender=gender_enum,
        period_start=data.period_start,
        period_end=data.period_end,
        department=data.department,
        daily_allowance=data.daily_allowance,
        has_transport=data.has_transport,
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
        is_anonymous=data.is_anonymous,
        anon_identity_enc=anon_enc,
        status=ReviewStatus.approved if is_auto_approve() else ReviewStatus.pending,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # ส่งการแจ้งเตือนไปยัง Admin ทุกคนเมื่อมีรีวิวใหม่รอการอนุมัติ
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
    if len(files) < 1:
        raise HTTPException(400, "ต้องแนบรูปอย่างน้อย 1 รูป")

    urls = []
    for file in files:
        if file.content_type and not file.content_type.startswith("image/"):
            raise HTTPException(400, f"{file.filename} ต้องเป็นไฟล์รูปภาพ")
        content = file.file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(400, f"{file.filename} ขนาดไฟล์เกิน 5MB")
        url = upload_review_photo(content, file.filename)
        db.add(ReviewPhoto(review_id=review.id, url=url))
        urls.append(url)
    db.commit()
    return {"uploaded": len(urls), "urls": urls}

@router.delete("/reviews/{review_id}/photos")
def clear_review_photos(
    review_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """ ลบรูปภาพประกอบทั้งหมดของรีวิว (สำหรับการอัปโหลดใหม่ในโหมดแก้ไข) """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "ไม่พบรีวิว")
    if review.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(403, "ไม่มีสิทธิ์จัดการรูปภาพรีวิวนี้")
    
    db.query(ReviewPhoto).filter(ReviewPhoto.review_id == review.id).delete()
    db.commit()
    return {"message": "ลบรูปภาพประกอบรีวิวเรียบร้อยแล้ว"}

@router.get("/companies/{company_id}/reviews", response_model=list[ReviewPublic])
def get_company_reviews(company_id: int,
                         skip: int = 0, limit: int = 20,
                         db: Session = Depends(get_db),
                         current_user: User = Depends(require_student)):
    """ ดึงรายการรีวิวทั้งหมดของสถานประกอบการที่ระบุ (เฉพาะที่อนุมัติแล้ว) """
    reviews = db.query(Review).filter(
        Review.company_id == company_id,
        Review.status == ReviewStatus.approved,
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in reviews:
        author_name = None if r.is_anonymous else r.user.name
        author_dept = r.department or r.user.department
        photo_urls = [p.url for p in r.photos]
        result.append(ReviewPublic(
            id=r.id, company_id=r.company_id, user_id=r.user_id,
            gender=r.gender.value if r.gender else "prefer_not",
            department=r.department,
            daily_allowance=r.daily_allowance,
            has_transport=r.has_transport,
            work_start_time=r.work_start_time,
            work_end_time=r.work_end_time,
            score_overall=r.score_overall, score_work=r.score_work,
            score_env=r.score_env, score_mentor=r.score_mentor,
            score_welfare=r.score_welfare,
            text_work=r.text_work, text_pros=r.text_pros,
            text_cons=r.text_cons, text_advice=r.text_advice,
            is_anonymous=r.is_anonymous,
            author_name=author_name,
            author_department=None if r.is_anonymous else author_dept,
            photo_urls=photo_urls,
            status=r.status.value if r.status else "approved",
            created_at=to_thai_date(r.created_at),
        ))
    return result

@router.get("/reviews/my", response_model=list[ReviewPublic])
def get_my_reviews(current_user: User = Depends(require_student),
                   db: Session = Depends(get_db)):
    """ ดึงประวัติรีวิวทั้งหมดที่ตนเองเคยเขียนไว้ """
    reviews = db.query(Review).filter(Review.user_id == current_user.id).order_by(Review.created_at.desc()).all()
    result = []
    for r in reviews:
        result.append(ReviewPublic(
            id=r.id, company_id=r.company_id, user_id=r.user_id,
            gender=r.gender.value if r.gender else "prefer_not",
            department=r.department,
            daily_allowance=r.daily_allowance,
            has_transport=r.has_transport,
            work_start_time=r.work_start_time,
            work_end_time=r.work_end_time,
            score_overall=r.score_overall, score_work=r.score_work,
            score_env=r.score_env, score_mentor=r.score_mentor,
            score_welfare=r.score_welfare,
            text_work=r.text_work, text_pros=r.text_pros,
            text_cons=r.text_cons, text_advice=r.text_advice,
            is_anonymous=r.is_anonymous,
            author_name=current_user.name,
            author_department=r.department or current_user.department,
            photo_urls=[p.url for p in r.photos],
            status=r.status.value if r.status else "pending",
            created_at=to_thai_date(r.created_at),
        ))
    return result

@router.put("/reviews/{review_id}")
def update_review(
    review_id: int,
    data: ReviewCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """ แก้ไขข้อมูลรีวิวของตนเอง (การแก้ไขจะส่งกลับไปรอ Admin อนุมัติใหม่) """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "ไม่พบรีวิวในระบบ")
    if review.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(403, "ไม่มีสิทธิ์แก้ไขรีวิวนี้เนื่องจากไม่ใช่เจ้าของรีวิว")

    if len(data.text_work) < 50:
        raise HTTPException(400, "รายละเอียดลักษณะงานต้องมีอย่างน้อย 50 ตัวอักษร")
    if len(data.text_work) > 1000:
        raise HTTPException(400, "รายละเอียดลักษณะงานต้องไม่เกิน 1000 ตัวอักษร")
    if data.text_pros and len(data.text_pros) > 500:
        raise HTTPException(400, "จุดเด่น/ข้อดีต้องไม่เกิน 500 ตัวอักษร")
    if data.text_cons and len(data.text_cons) > 500:
        raise HTTPException(400, "ข้อจำกัด/ข้อควรปรับปรุงต้องไม่เกิน 500 ตัวอักษร")
    if data.text_advice and len(data.text_advice) > 500:
        raise HTTPException(400, "คำแนะนำแก่น้องๆ ต้องไม่เกิน 500 ตัวอักษร")

    gender_enum = Gender(data.gender) if data.gender in Gender.__members__ else Gender.prefer_not
    anon_enc = encrypt_identity(current_user.id) if data.is_anonymous else None

    sub_scores = [s for s in [data.score_work, data.score_env, data.score_mentor, data.score_welfare] if s is not None]
    computed_overall = round(sum(sub_scores) / len(sub_scores), 1) if sub_scores else (data.score_overall or 5.0)

    review.department = data.department
    review.gender = gender_enum
    review.period_start = data.period_start
    review.period_end = data.period_end
    review.daily_allowance = data.daily_allowance
    review.has_transport = data.has_transport
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
    review.is_anonymous = data.is_anonymous
    review.anon_identity_enc = anon_enc
    auto_appr = is_auto_approve()
    review.status = ReviewStatus.approved if auto_appr else ReviewStatus.pending

    db.commit()
    db.refresh(review)
    return {"message": "แก้ไขรีวิวเรียบร้อยแล้ว" if auto_appr else "แก้ไขรีวิวเรียบร้อยแล้ว (รอผู้ดูแลระบบอนุมัติใหม่)"}

@router.delete("/reviews/{review_id}")
def delete_review(
    review_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """ ลบรีวิวของตนเอง พร้อมลบรูปภาพประกอบทั้งหมด """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "ไม่พบรีวิวในระบบ")
    if review.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(403, "ไม่มีสิทธิ์ลบรีวิวนี้เนื่องจากไม่ใช่เจ้าของรีวิว")
    
    db.query(ReviewPhoto).filter(ReviewPhoto.review_id == review.id).delete()
    db.delete(review)
    db.commit()
    return {"message": "ลบรีวิวเรียบร้อยแล้ว"}
