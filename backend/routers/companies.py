from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Company, Review, ReviewStatus
from schemas.companies import CompanyCreate, CompanyPublic

router = APIRouter(tags=["companies"])

@router.get("/companies", response_model=list[CompanyPublic])
def list_companies(db: Session = Depends(get_db)):
    """ ดึงรายชื่อสถานประกอบการทั้งหมด พร้อมคำนวณคะแนนเฉลี่ยและจำนวนรีวิว """
    companies = db.query(Company).all()
    results = []
    for c in companies:
        rev_stats = db.query(
            func.avg(Review.score_overall).label("avg_score"),
            func.count(Review.id).label("rev_count")
        ).filter(
            Review.company_id == c.id,
            Review.status == ReviewStatus.approved
        ).first()

        results.append(CompanyPublic(
            id=c.id,
            name=c.name,
            address=c.address,
            industry=c.industry,
            lat=c.lat,
            lng=c.lng,
            phone=c.phone,
            website=c.website,
            cover_image_url=c.cover_image_url,
            avg_score=round(rev_stats.avg_score, 1) if rev_stats and rev_stats.avg_score else None,
            review_count=rev_stats.rev_count if rev_stats else 0,
            created_at=c.created_at.strftime("%Y-%m-%d") if c.created_at else None,
        ))
    return results

@router.get("/companies/{company_id}")
def get_company_detail(company_id: int, db: Session = Depends(get_db)):
    """ ดึงรายละเอียดสถานประกอบการพร้อมสถิติรีวิว """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "ไม่พบสถานประกอบการ")

    rev_stats = db.query(
        func.avg(Review.score_overall).label("avg_score"),
        func.count(Review.id).label("rev_count"),
        func.avg(Review.daily_allowance).label("avg_allowance")
    ).filter(
        Review.company_id == company.id,
        Review.status == ReviewStatus.approved
    ).first()

    return {
        "id": company.id,
        "name": company.name,
        "address": company.address,
        "industry": company.industry,
        "lat": company.lat,
        "lng": company.lng,
        "phone": company.phone,
        "website": company.website,
        "cover_image_url": company.cover_image_url,
        "avg_score": round(rev_stats.avg_score, 1) if rev_stats and rev_stats.avg_score else None,
        "review_count": rev_stats.rev_count if rev_stats else 0,
        "avg_daily_allowance": round(rev_stats.avg_allowance, 0) if rev_stats and rev_stats.avg_allowance else None,
        "created_at": company.created_at.strftime("%Y-%m-%d") if company.created_at else None,
    }

@router.post("/companies", status_code=201)
def create_company(data: CompanyCreate, db: Session = Depends(get_db)):
    """ เพิ่มหมุดสถานประกอบการใหม่ในระบบ """
    existing = db.query(Company).filter(Company.name == data.name).first()
    if existing:
        return {"message": "มีสถานประกอบการนี้อยู่แล้ว", "company_id": existing.id}

    comp = Company(
        name=data.name,
        address=data.address,
        industry=data.industry or "ทั่วไป",
        lat=data.lat,
        lng=data.lng,
        phone=data.phone,
        website=data.website,
        cover_image_url=data.cover_image_url,
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return {"message": "เพิ่มสถานประกอบการสำเร็จ", "company_id": comp.id}


@router.get("/companies/{company_id}/reviews")
def get_company_reviews(company_id: int, db: Session = Depends(get_db)):
    """ ดึงรายการรีวิวที่ผ่านการอนุมัติทั้งหมดของสถานประกอบการนั้นๆ """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "ไม่พบสถานประกอบการ")

    reviews = db.query(Review).filter(
        Review.company_id == company_id,
        Review.status == ReviewStatus.approved
    ).order_by(Review.created_at.desc()).all()

    results = []
    for r in reviews:
        author_name = "นักศึกษาไม่ระบุตัวตน" if r.is_anonymous else (r.user.name if r.user else "นักศึกษา")
        results.append({
            "id": r.id,
            "company_id": r.company_id,
            "company_name": company.name,
            "author_name": author_name,
            "gender": r.gender.value if r.gender else "prefer_not",
            "period_start": r.period_start.strftime("%Y-%m-%d") if r.period_start else "",
            "period_end": r.period_end.strftime("%Y-%m-%d") if r.period_end else "",
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
            "text_pros": r.text_pros or "",
            "text_cons": r.text_cons or "",
            "text_advice": r.text_advice or "",
            "is_anonymous": r.is_anonymous,
            "photos": [{"id": p.id, "photo_url": p.url} for p in r.photos],
            "created_at": r.created_at.strftime("%Y-%m-%d") if r.created_at else "",
        })
    return results
