import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["TESTING"] = "1"

import pytest
from datetime import date
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from models import User, UserRole, Company, Review, ReviewStatus, Gender

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_list_companies_includes_departments_and_allowance():
    with SessionLocal() as db:
        user = User(email="test@htc.ac.th", name="Student", role=UserRole.student)
        db.add(user)
        db.commit()
        db.refresh(user)

        c1 = Company(name="Company Tech A", address="หาดใหญ่ สงขลา")
        c2 = Company(name="Company Weld B", address="เมือง สงขลา")
        db.add_all([c1, c2])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)

        # Review for c1 (IT)
        r1 = Review(
            company_id=c1.id,
            user_id=user.id,
            gender=Gender.male,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 4, 1),
            department="แผนกวิชาเทคโนโลยีสารสนเทศ",
            daily_allowance=300,
            score_overall=4.5,
            text_work="Good",
            status=ReviewStatus.approved
        )
        # Review for c2 (Welding)
        r2 = Review(
            company_id=c2.id,
            user_id=user.id,
            gender=Gender.female,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 4, 1),
            department="แผนกวิชาช่างเชื่อมโลหะ",
            daily_allowance=200,
            score_overall=5.0,
            text_work="Excellent",
            status=ReviewStatus.approved
        )
        db.add_all([r1, r2])
        db.commit()

    res = client.get("/companies")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2

    c1_data = next((c for c in data if c["name"] == "Company Tech A"), None)
    assert c1_data is not None
    assert "departments" in c1_data
    assert "แผนกวิชาเทคโนโลยีสารสนเทศ" in c1_data["departments"]
    assert c1_data.get("avg_daily_allowance") == 300.0

    c2_data = next((c for c in data if c["name"] == "Company Weld B"), None)
    assert c2_data is not None
    assert "departments" in c2_data
    assert "แผนกวิชาช่างเชื่อมโลหะ" in c2_data["departments"]
    assert c2_data.get("avg_daily_allowance") == 200.0

def test_list_companies_filter_by_department():
    with SessionLocal() as db:
        user = User(email="test@htc.ac.th", name="Student", role=UserRole.student)
        db.add(user)
        db.commit()
        db.refresh(user)

        c1 = Company(name="Company Tech A", address="หาดใหญ่")
        c2 = Company(name="Company Weld B", address="สงขลา")
        db.add_all([c1, c2])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)

        r1 = Review(
            company_id=c1.id,
            user_id=user.id,
            gender=Gender.male,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 4, 1),
            department="แผนกวิชาเทคโนโลยีสารสนเทศ",
            score_overall=4.0,
            text_work="Good",
            status=ReviewStatus.approved
        )
        r2 = Review(
            company_id=c2.id,
            user_id=user.id,
            gender=Gender.female,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 4, 1),
            department="แผนกวิชาช่างเชื่อมโลหะ",
            score_overall=5.0,
            text_work="Great",
            status=ReviewStatus.approved
        )
        db.add_all([r1, r2])
        db.commit()

    # Filter by exact department name
    res1 = client.get("/companies?department=แผนกวิชาเทคโนโลยีสารสนเทศ")
    assert res1.status_code == 200
    names1 = [c["name"] for c in res1.json()]
    assert names1 == ["Company Tech A"]

    # Filter by department without 'แผนกวิชา' prefix
    res2 = client.get("/companies?department=ช่างเชื่อมโลหะ")
    assert res2.status_code == 200
    names2 = [c["name"] for c in res2.json()]
    assert names2 == ["Company Weld B"]
