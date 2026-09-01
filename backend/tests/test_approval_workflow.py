import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["TESTING"] = "1"

import pytest
from datetime import date
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from auth import create_access_token
from models import (User, UserRole, Notification, Report, Review, ReviewStatus,
                    UpgradeRequest, UpgradeRequestStatus, JobPosting, CommunityPost,
                    Company, PostType, Gender)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def create_test_admin():
    db = SessionLocal()
    admin = User(email="admin_test@htc.ac.th", name="Admin Test", role=UserRole.admin, is_active=True)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token({"sub": admin.id, "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}
    return admin, headers

def create_test_student():
    db = SessionLocal()
    student = User(email="student_test@htc.ac.th", name="Student Test", role=UserRole.student, is_active=True)
    db.add(student)
    db.commit()
    db.refresh(student)
    token = create_access_token({"sub": student.id, "role": "student"})
    headers = {"Authorization": f"Bearer {token}"}
    return student, headers

def test_reject_review_without_reason_returns_400():
    admin, admin_headers = create_test_admin()
    student, _ = create_test_student()
    db = SessionLocal()
    company = Company(name="Test Co")
    db.add(company)
    db.commit()
    
    review = Review(
        company_id=company.id,
        user_id=student.id,
        gender=Gender.male,
        period_start=date(2025, 1, 1),
        period_end=date(2025, 4, 1),
        department="เทคโนโลยีสารสนเทศ",
        score_overall=4.5,
        text_work="ทำงานเกี่ยวกับพัฒนาซอฟต์แวร์และดูแลระบบฐานข้อมูลของบริษัทอย่างละเอียด",
        text_pros="ข้อดีคือบรรยากาศดี",
        text_cons="ข้อเสียคืองานหนัก",
        status=ReviewStatus.pending,
    )
    db.add(review)
    db.commit()

    # Reject without reason or empty reason
    res = client.patch(f"/admin/reviews/{review.id}", json={"status": "rejected", "rejection_reason": ""}, headers=admin_headers)
    assert res.status_code == 400
    assert "ต้องระบุเหตุผลในการปฏิเสธ" in res.json()["detail"]

def test_reject_review_with_valid_reason_saves_reason_and_creates_notification():
    admin, admin_headers = create_test_admin()
    student, _ = create_test_student()
    db = SessionLocal()
    company = Company(name="Test Co")
    db.add(company)
    db.commit()
    
    review = Review(
        company_id=company.id,
        user_id=student.id,
        gender=Gender.male,
        period_start=date(2025, 1, 1),
        period_end=date(2025, 4, 1),
        department="เทคโนโลยีสารสนเทศ",
        score_overall=4.5,
        text_work="ทำงานเกี่ยวกับพัฒนาซอฟต์แวร์และดูแลระบบฐานข้อมูลของบริษัทอย่างละเอียด",
        text_pros="ข้อดีคือบรรยากาศดี",
        text_cons="ข้อเสียคืองานหนัก",
        status=ReviewStatus.pending,
    )
    db.add(review)
    db.commit()

    res = client.patch(f"/admin/reviews/{review.id}", json={"status": "rejected", "rejection_reason": "ข้อความไม่เหมาะสม"}, headers=admin_headers)
    assert res.status_code == 200

    db.refresh(review)
    assert review.status == ReviewStatus.rejected
    assert review.rejection_reason == "ข้อความไม่เหมาะสม"

    notif = db.query(Notification).filter(Notification.user_id == student.id).first()
    assert notif is not None
    assert "ข้อความไม่เหมาะสม" in notif.message

def test_admin_get_and_patch_jobs():
    admin, admin_headers = create_test_admin()
    student, _ = create_test_student()
    db = SessionLocal()
    comp = Company(name="Emp Co")
    db.add(comp)
    db.commit()
    job = JobPosting(user_id=student.id, company_id=comp.id, title="Software Intern", status="pending", is_active=False)
    db.add(job)
    db.commit()

    # GET /admin/jobs
    res = client.get("/admin/jobs", headers=admin_headers)
    assert res.status_code == 200
    jobs = res.json()
    assert len(jobs) >= 1

    # PATCH /admin/jobs/{id} rejection with reason
    res = client.patch(f"/admin/jobs/{job.id}", json={"status": "rejected", "rejection_reason": "รายละเอียดไม่ชัดเจน"}, headers=admin_headers)
    assert res.status_code == 200
    db.refresh(job)
    assert job.status == "rejected"
    assert job.is_active is False
    assert job.rejection_reason == "รายละเอียดไม่ชัดเจน"

    # PATCH /admin/jobs/{id} approval
    res = client.patch(f"/admin/jobs/{job.id}", json={"status": "approved"}, headers=admin_headers)
    assert res.status_code == 200
    db.refresh(job)
    assert job.status == "approved"
    assert job.is_active is True

def test_user_cannot_create_multiple_reviews():
    student, student_headers = create_test_student()
    db = SessionLocal()
    comp1 = Company(name="Company A", address="Hatyai")
    comp2 = Company(name="Company B", address="Hatyai")
    db.add_all([comp1, comp2])
    db.commit()

    review_payload_1 = {
        "company_id": comp1.id,
        "department": "แผนกวิชาช่างอิเล็กทรอนิกส์",
        "gender": "male",
        "period_start": "2025-05-01",
        "period_end": "2025-08-31",
        "score_overall": 5,
        "score_work": 5,
        "score_env": 5,
        "score_mentor": 5,
        "score_welfare": 5,
        "text_work": "ลักษณะงานที่ปฏิบัติจริงมีความท้าทายและได้เรียนรู้งานจริงมาก 12345",
        "text_pros": "พี่เลี้ยงใจดี สอนงานดีมาก",
        "text_cons": "ที่จอดรถน้อยไปหน่อย",
        "is_anonymous": False,
    }
    res1 = client.post("/reviews", json=review_payload_1, headers=student_headers)
    assert res1.status_code == 201

    # Attempting second review must fail
    review_payload_2 = {
        "company_id": comp2.id,
        "department": "แผนกวิชาช่างอิเล็กทรอนิกส์",
        "gender": "male",
        "period_start": "2025-05-01",
        "period_end": "2025-08-31",
        "score_overall": 4,
        "score_work": 4,
        "score_env": 4,
        "score_mentor": 4,
        "score_welfare": 4,
        "text_work": "ลักษณะงานที่ปฏิบัติจริงมีความท้าทายและได้เรียนรู้งานจริงมาก 67890",
        "text_pros": "เพื่อนร่วมงานดี",
        "text_cons": "เบี้ยเลี้ยงน้อย",
        "is_anonymous": False,
    }
    res2 = client.post("/reviews", json=review_payload_2, headers=student_headers)
    assert res2.status_code == 400
    assert "จำกัด 1 ผู้ใช้ ต่อ 1 รีวิว" in res2.json()["detail"]
