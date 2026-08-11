import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["TESTING"] = "1"

import pytest
from datetime import date
from database import Base, engine, SessionLocal
from models import (
    User,
    CommunityPost,
    JobPosting,
    Review,
    UpgradeRequest,
    Notification,
    Report,
)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_community_post_status_and_rejection_reason():
    db = SessionLocal()
    post = CommunityPost(
        user_id=1,
        type="qa",
        title="Test Post",
        content="Test Content",
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    assert hasattr(post, "status")
    assert post.status == "pending"
    assert hasattr(post, "rejection_reason")
    assert post.rejection_reason is None

def test_job_posting_status_and_rejection_reason():
    db = SessionLocal()
    job = JobPosting(
        employer_id=1,
        title="Software Engineer",
        description="Write code",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    assert hasattr(job, "status")
    assert job.status == "pending"
    assert hasattr(job, "rejection_reason")
    assert job.rejection_reason is None

def test_review_rejection_reason():
    db = SessionLocal()
    review = Review(
        company_id=1,
        user_id=1,
        gender="male",
        period_start=date(2026, 1, 1),
        period_end=date(2026, 6, 1),
        score_overall=5.0,
        text_work="Great",
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    assert hasattr(review, "rejection_reason")
    assert review.rejection_reason is None

def test_upgrade_request_rejection_reason():
    db = SessionLocal()
    req = UpgradeRequest(
        user_id=1,
        student_id="65300001",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    assert hasattr(req, "rejection_reason")
    assert req.rejection_reason is None

def test_notification_model():
    db = SessionLocal()
    notif = Notification(
        user_id=1,
        title="Notification Title",
        message="Notification Message",
        link="/community/1",
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    assert hasattr(notif, "id")
    assert notif.user_id == 1
    assert notif.title == "Notification Title"
    assert notif.message == "Notification Message"
    assert hasattr(notif, "type")
    assert notif.type == "info"
    assert hasattr(notif, "is_read")
    assert notif.is_read is False
    assert notif.link == "/community/1"
    assert hasattr(notif, "created_at")

def test_report_model():
    db = SessionLocal()
    report = Report(
        reporter_id=1,
        post_id=10,
        review_id=20,
        comment_id=30,
        job_id=40,
        company_id=50,
        reason="Inappropriate content",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    assert hasattr(report, "reporter_id")
    assert report.reporter_id == 1
    assert hasattr(report, "post_id")
    assert report.post_id == 10
    assert hasattr(report, "review_id")
    assert report.review_id == 20
    assert hasattr(report, "comment_id")
    assert report.comment_id == 30
    assert hasattr(report, "job_id")
    assert report.job_id == 40
    assert hasattr(report, "company_id")
    assert report.company_id == 50
    assert hasattr(report, "reason")
    assert report.reason == "Inappropriate content"
    assert hasattr(report, "status")
    assert report.status == "pending"
    assert hasattr(report, "created_at")
