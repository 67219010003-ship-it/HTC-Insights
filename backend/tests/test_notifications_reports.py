import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["TESTING"] = "1"

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from auth import create_access_token
from models import User, UserRole, Notification, Report
from routers.notifications import create_notification

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_create_notification_helper():
    db = SessionLocal()
    user = User(email="notif_user@htc.ac.th", name="Notif User", role=UserRole.student, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    notif = create_notification(
        db=db,
        user_id=user.id,
        title="Test Notif",
        message="Message Body",
        type="warning",
        link="/test-link"
    )

    assert notif.id is not None
    assert notif.user_id == user.id
    assert notif.title == "Test Notif"
    assert notif.message == "Message Body"
    assert notif.type == "warning"
    assert notif.link == "/test-link"
    assert notif.is_read is False

def test_get_notifications_ordered_by_created_at_desc():
    db = SessionLocal()
    user = User(email="notif_user2@htc.ac.th", name="Notif User 2", role=UserRole.student, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    n1 = Notification(user_id=user.id, title="Older", message="Msg 1", created_at=datetime.utcnow() - timedelta(hours=2))
    n2 = Notification(user_id=user.id, title="Newer", message="Msg 2", created_at=datetime.utcnow())
    db.add_all([n1, n2])
    db.commit()

    token = create_access_token({"sub": user.id, "role": "student"})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["title"] == "Newer"
    assert data[1]["title"] == "Older"

def test_patch_notifications_read_all():
    db = SessionLocal()
    user = User(email="notif_user3@htc.ac.th", name="Notif User 3", role=UserRole.student, is_active=True)
    db.add(user)
    db.commit()

    n1 = Notification(user_id=user.id, title="N1", message="M1", is_read=False)
    n2 = Notification(user_id=user.id, title="N2", message="M2", is_read=False)
    db.add_all([n1, n2])
    db.commit()

    token = create_access_token({"sub": user.id, "role": "student"})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.patch("/notifications/read-all", headers=headers)
    assert res.status_code == 200

    db.refresh(n1)
    db.refresh(n2)
    assert n1.is_read is True
    assert n2.is_read is True
