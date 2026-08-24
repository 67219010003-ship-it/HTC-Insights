from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List
from database import get_db
from models import Company, Review, ReviewStatus, User
from schemas.companies import CompanyCard, CompanyDetail, CompanyCreate
from dependencies import require_student

router = APIRouter(prefix="/companies", tags=["companies"])

@router.get("", response_model=list[CompanyCard])
def list_companies(
    q: str = Query(None),
    department: str = Query(None),
    scores: List[int] = Query(None),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """ ค้นหาและแสดงรายการสถานประกอบการ พร้อมคำนวณคะแนนเฉลี่ยและจำนวนรีวิว """
    avg_expr = func.avg(Review.score_overall)

    query = db.query(
        Company,
        avg_expr.label("avg_score"),
        func.count(Review.id).label("review_count"),
        func.avg(Review.daily_allowance).label("avg_daily_allowance"),
    ).outerjoin(Review, (Review.company_id == Company.id) &
                        (Review.status == ReviewStatus.approved)
    ).group_by(Company.id).having(
        (func.count(Review.id) > 0) | (Company.is_verified == True)
    )

    if q and isinstance(q, str) and q.strip():
        q_strip = q.strip()
        q_clean = q_strip.replace(" ", "").replace(".", "").replace("-", "").replace("(", "").replace(")", "")
        clean_col = func.replace(Company.name, " ", "")
        clean_col = func.replace(clean_col, ".", "")
        clean_col = func.replace(clean_col, "-", "")
        clean_col = func.replace(clean_col, "(", "")
        clean_col = func.replace(clean_col, ")", "")

        q_dept_subquery = db.query(Review.company_id).filter(
            Review.status == ReviewStatus.approved,
            Review.department.ilike(f"%{q_strip}%")
        )

        query = query.filter(
            clean_col.ilike(f"%{q_clean}%") |
            Company.industry.ilike(f"%{q_strip}%") |
            Company.address.ilike(f"%{q_strip}%") |
            Company.description.ilike(f"%{q_strip}%") |
            Company.id.in_(q_dept_subquery)
        )
    if department and isinstance(department, str) and department.strip():
        dept_clean = department.replace("แผนกวิชา", "").strip()
        dept_subquery = db.query(Review.company_id).filter(
            Review.status == ReviewStatus.approved,
            Review.department.ilike(f"%{dept_clean}%")
        )
        query = query.filter(Company.id.in_(dept_subquery))

    if scores:
        band_clauses = []
        for s in scores:
            if s == 5:
                band_clauses.append(avg_expr >= 5.0)
            else:
                band_clauses.append((avg_expr >= float(s)) & (avg_expr < float(s + 1)))
        query = query.having(or_(*band_clauses))

    results = query.offset(skip).limit(limit).all()
    cards = []
    for company, avg_score, review_count, avg_allowance in results:
        dept_rows = db.query(Review.department).filter(
            Review.company_id == company.id,
            Review.status == ReviewStatus.approved,
            Review.department.isnot(None)
        ).distinct().all()
        depts = [d[0] for d in dept_rows if d[0]]

        card = CompanyCard(
            id=company.id, name=company.name,
            address=company.address, industry=company.industry,
            is_verified=company.is_verified,
            avg_score=round(avg_score, 1) if avg_score else None,
            review_count=review_count or 0,
            avg_daily_allowance=round(avg_allowance, 0) if avg_allowance else None,
            phone=company.phone,
            website=company.website,
            cover_image_url=company.cover_image_url,
            description=company.description,
            departments=depts,
        )
        cards.append(card)
    return cards

@router.post("", status_code=201)
def create_company(
    data: CompanyCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """ เพิ่มข้อมูลสถานประกอบการใหม่เข้าสู่ระบบฐานข้อมูล """
    existing = db.query(Company).filter(Company.name.ilike(data.name)).first()
    if existing:
        updated = False
        if not existing.cover_image_url and data.cover_image_url:
            existing.cover_image_url = data.cover_image_url
            updated = True
        if not existing.phone and data.phone:
            existing.phone = data.phone
            updated = True
        if not existing.website and data.website:
            existing.website = data.website
            updated = True
        if not existing.lat and data.lat:
            existing.lat = data.lat
            updated = True
        if not existing.lng and data.lng:
            existing.lng = data.lng
            updated = True
        if updated:
            db.commit()
        return {"message": "มีบริษัทนี้ในระบบแล้ว", "company_id": existing.id}
    comp = Company(
        name=data.name,
        address=data.address,
        industry=data.industry,
        lat=data.lat,
        lng=data.lng,
        phone=data.phone,
        website=data.website,
        cover_image_url=data.cover_image_url,
        description=data.description,
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return {"message": "เพิ่มสถานประกอบการเรียบร้อยแล้ว", "company_id": comp.id}

@router.get("/{company_id}", response_model=CompanyDetail)
def get_company(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_student)):
    """ ดึงรายละเอียดข้อมูลสถานประกอบการ พร้อมพิกัด แผนที่ และสถิติต่างๆ """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "ไม่พบสถานประกอบการ")
    avg_score = db.query(func.avg(Review.score_overall)).filter(
        Review.company_id == company_id,
        Review.status == ReviewStatus.approved
    ).scalar()
    review_count = db.query(func.count(Review.id)).filter(
        Review.company_id == company_id,
        Review.status == ReviewStatus.approved
    ).scalar()
    avg_allowance = db.query(func.avg(Review.daily_allowance)).filter(
        Review.company_id == company_id,
        Review.status == ReviewStatus.approved
    ).scalar()
    return CompanyDetail(
        id=company.id, name=company.name, address=company.address,
        industry=company.industry, is_verified=company.is_verified,
        lat=company.lat, lng=company.lng,
        phone=company.phone,
        website=company.website,
        cover_image_url=company.cover_image_url,
        description=company.description,
        avg_score=round(avg_score, 1) if avg_score else None,
        review_count=review_count or 0,
        avg_daily_allowance=round(avg_allowance, 0) if avg_allowance else None,
    )
