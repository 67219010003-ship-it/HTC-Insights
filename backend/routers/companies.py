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
