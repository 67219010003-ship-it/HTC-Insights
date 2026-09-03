from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Company, Review, ReviewStatus
from schemas.companies import CompanyCreate, CompanyPublic

router = APIRouter(tags=["companies"])

@router.get("/companies", response_model=list[CompanyPublic])
def list_companies(all: bool = False,
                   include_empty: bool = False,
                   q: str = None,
                   department: str = None,
                   limit: int = 100,
                   db: Session = Depends(get_db)):
    """ ค้นหาและแสดงรายการสถานประกอบการ พร้อมคำนวณคะแนนเฉลี่ยและจำนวนรีวิวที่ผ่านการอนุมัติแล้วเท่านั้น (ตรงตามระบบเดิม 100%) """
    avg_expr = func.avg(Review.score_overall)
    count_expr = func.count(Review.id)

    query = db.query(
        Company,
        avg_expr.label("avg_score"),
        count_expr.label("review_count"),
    ).outerjoin(
        Review,
        (Review.company_id == Company.id) & (Review.status == ReviewStatus.approved)
    ).group_by(Company.id)

    # กฎของระบบเดิม: หน้าสำรวจจะแสดงเฉพาะสถานที่ที่มีรีวิวอนุมัติแล้วเท่านั้น (having count > 0)
    if not all and not include_empty and not (q and q.strip()):
        query = query.having(count_expr > 0)

    if q and q.strip():
        search_term = q.strip()
        query = query.filter((Company.name.ilike(f"%{search_term}%")) | (Company.address.ilike(f"%{search_term}%")))

    if department and department != "ทั้งหมด" and department.strip():
        clean_dept = department.replace("แผนกวิชา", "").strip()
        dept_subquery = db.query(Review.company_id).filter(
            (Review.department == department.strip()) | (Review.department.ilike(f"%{clean_dept}%")),
            Review.status == ReviewStatus.approved
        ).distinct()
        query = query.filter(Company.id.in_(dept_subquery))

    rows = query.limit(limit).all()
    company_ids = [c.id for c, _, _ in rows]
    dept_map: dict[int, list[str]] = {}
    allowance_map: dict[int, float] = {}

    if company_ids:
        dept_rows = db.query(Review.company_id, Review.department).filter(
            Review.company_id.in_(company_ids),
            Review.status == ReviewStatus.approved,
            Review.department.isnot(None)
        ).distinct().all()
        for cid, d in dept_rows:
            if d:
                dept_map.setdefault(cid, []).append(d)

        allowance_rows = db.query(
            Review.company_id,
            func.avg(Review.daily_allowance).label("avg_allowance")
        ).filter(
            Review.company_id.in_(company_ids),
            Review.status == ReviewStatus.approved,
            Review.daily_allowance > 0
        ).group_by(Review.company_id).all()
        for cid, avg_a in allowance_rows:
            if avg_a is not None:
                allowance_map[cid] = round(float(avg_a), 1)

    results = []
    for c, avg_s, rev_c in rows:
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
            avg_score=round(avg_s, 1) if avg_s else None,
            review_count=rev_c or 0,
            avg_daily_allowance=allowance_map.get(c.id),
            departments=dept_map.get(c.id, []),
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
            "photo_urls": [p.url for p in r.photos],
            "photos": [{"id": p.id, "photo_url": p.url} for p in r.photos],
            "created_at": r.created_at.strftime("%Y-%m-%d") if r.created_at else "",
        })
    return results
