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
                    Company, Employer, PostType, Gender)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def create_test_admin():
    db = SessionLocal()
    admin = User(email="admin_test@htc.ac.th", password_hash="hash", name="Admin Test", role=UserRole.admin, is_verified=True)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token({"sub": admin.id, "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}
    return admin, headers

def create_test_student():
    db = SessionLocal()
    student = User(email="student_test@htc.ac.th", password_hash="hash", name="Student Test", role=UserRole.student, is_verified=True, department="เทคโนโลยีสารสนเทศ")
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
        score_overall=4.5,
        text_work="ทำงานเกี่ยวกับพัฒนาซอฟต์แวร์และดูแลระบบฐานข้อมูลของบริษัทอย่างละเอียด",
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
        score_overall=4.5,
        text_work="ทำงานเกี่ยวกับพัฒนาซอฟต์แวร์และดูแลระบบฐานข้อมูลของบริษัทอย่างละเอียด",
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

def test_reject_upgrade_request_without_reason_returns_400():
    admin, admin_headers = create_test_admin()
    student, _ = create_test_student()
    db = SessionLocal()
    req = UpgradeRequest(user_id=student.id, student_id="643010001", status=UpgradeRequestStatus.pending)
    db.add(req)
    db.commit()

    res = client.patch(f"/admin/upgrades/{req.id}", json={"status": "rejected", "rejection_reason": "   "}, headers=admin_headers)
    assert res.status_code == 400
    assert "ต้องระบุเหตุผลในการปฏิเสธ" in res.json()["detail"]

def test_reject_upgrade_request_with_valid_reason_saves_reason_and_creates_notification():
    admin, admin_headers = create_test_admin()
    student, _ = create_test_student()
    db = SessionLocal()
    req = UpgradeRequest(user_id=student.id, student_id="643010001", status=UpgradeRequestStatus.pending)
    db.add(req)
    db.commit()

    res = client.patch(f"/admin/upgrades/{req.id}", json={"status": "rejected", "rejection_reason": "รหัสนักศึกษาไม่ถูกต้อง"}, headers=admin_headers)
    assert res.status_code == 200

    db.refresh(req)
    assert req.status == UpgradeRequestStatus.rejected
    assert req.rejection_reason == "รหัสนักศึกษาไม่ถูกต้อง"

    notif = db.query(Notification).filter(Notification.user_id == student.id).first()
    assert notif is not None
    assert "รหัสนักศึกษาไม่ถูกต้อง" in notif.message

def test_admin_get_and_patch_posts():
    admin, admin_headers = create_test_admin()
    student, _ = create_test_student()
    db = SessionLocal()
    post = CommunityPost(user_id=student.id, type=PostType.qa, title="คำถามทดสอบ", content="เนื้อหาทดสอบ", status="pending")
    db.add(post)
    db.commit()

    # GET /admin/posts
    res = client.get("/admin/posts", headers=admin_headers)
    assert res.status_code == 200
    posts = res.json()
    assert len(posts) >= 1

    # PATCH /admin/posts/{id} rejection without reason
    res = client.patch(f"/admin/posts/{post.id}", json={"status": "rejected", "rejection_reason": ""}, headers=admin_headers)
    assert res.status_code == 400

    # PATCH /admin/posts/{id} rejection with reason
    res = client.patch(f"/admin/posts/{post.id}", json={"status": "rejected", "rejection_reason": "โพสต์ซ้ำซ้อน"}, headers=admin_headers)
    assert res.status_code == 200
    db.refresh(post)
    assert post.status == "rejected"
    assert post.rejection_reason == "โพสต์ซ้ำซ้อน"

    # PATCH /admin/posts/{id} approval
    res = client.patch(f"/admin/posts/{post.id}", json={"status": "approved"}, headers=admin_headers)
    assert res.status_code == 200
    db.refresh(post)
    assert post.status == "approved"

def test_admin_get_and_patch_jobs():
    admin, admin_headers = create_test_admin()
    db = SessionLocal()
    employer = Employer(email="emp@co.com", password_hash="hash", company_name="Emp Co", is_approved=True)
    db.add(employer)
    db.commit()
    job = JobPosting(employer_id=employer.id, title="Software Intern", status="pending", is_active=False)
    db.add(job)
    db.commit()

    # GET /admin/jobs
    res = client.get("/admin/jobs", headers=admin_headers)
    assert res.status_code == 200
    jobs = res.json()
    assert len(jobs) >= 1

    # PATCH /admin/jobs/{id} rejection without reason
    res = client.patch(f"/admin/jobs/{job.id}", json={"status": "rejected", "rejection_reason": ""}, headers=admin_headers)
    assert res.status_code == 400

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

def test_admin_get_and_patch_reports():
    admin, admin_headers = create_test_admin()
    student, _ = create_test_student()
    db = SessionLocal()
    report = Report(reporter_id=student.id, reason="Spam post", status="pending")
    db.add(report)
    db.commit()

    # GET /admin/reports
    res = client.get("/admin/reports", headers=admin_headers)
    assert res.status_code == 200
    reports = res.json()
    assert len(reports) >= 1

    # PATCH /admin/reports/{id}
    res = client.patch(f"/admin/reports/{report.id}", json={"status": "resolved"}, headers=admin_headers)
    assert res.status_code == 200
    db.refresh(report)
    assert report.status == "resolved"

def test_public_content_filtering():
    student, student_headers = create_test_student()
    db = SessionLocal()

    # Posts: 1 approved, 1 pending
    post1 = CommunityPost(user_id=student.id, type=PostType.qa, title="Approved Post", content="Approved Content", status="approved")
    post2 = CommunityPost(user_id=student.id, type=PostType.qa, title="Pending Post", content="Pending Content", status="pending")
    db.add_all([post1, post2])

    # Jobs: 1 approved, 1 pending
    emp = Employer(email="emp2@co.com", password_hash="hash", company_name="Emp 2 Co")
    db.add(emp)
    db.commit()
    job1 = JobPosting(employer_id=emp.id, title="Approved Job", status="approved", is_active=True)
    job2 = JobPosting(employer_id=emp.id, title="Pending Job", status="pending", is_active=False)
    db.add_all([job1, job2])

    # Reviews: 1 approved, 1 pending
    comp = Company(name="Comp 2")
    db.add(comp)
    db.commit()
    rev1 = Review(company_id=comp.id, user_id=student.id, gender=Gender.female, period_start=date(2025,1,1), period_end=date(2025,4,1), score_overall=5.0, text_work="Super great work experience at this awesome company!", status=ReviewStatus.approved)
    rev2 = Review(company_id=comp.id, user_id=student.id, gender=Gender.female, period_start=date(2025,1,1), period_end=date(2025,4,1), score_overall=5.0, text_work="Pending work experience at this awesome company!", status=ReviewStatus.pending)
    db.add_all([rev1, rev2])

    db.commit()

    # Test GET /community/posts
    res_posts = client.get("/community/posts", headers=student_headers)
    assert res_posts.status_code == 200
    posts_data = res_posts.json()
    post_titles = [p["title"] for p in posts_data]
    assert "Approved Post" in post_titles
    assert "Pending Post" not in post_titles

    # Test GET /jobs
    res_jobs = client.get("/jobs")
    assert res_jobs.status_code == 200
    jobs_data = res_jobs.json()
    job_titles = [j["title"] for j in jobs_data]
    assert "Approved Job" in job_titles
    assert "Pending Job" not in job_titles

    # Test GET /reviews
    res_revs = client.get("/reviews", headers=student_headers)
    assert res_revs.status_code == 200
    revs_data = res_revs.json()
    assert len(revs_data) == 1
    assert revs_data[0]["id"] == rev1.id
