import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from auth import create_access_token, encrypt_identity, decrypt_identity

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_student_register_non_htc_email():
    response = client.post("/auth/register/student", json={
        "email": "student@gmail.com",
        "password": "password123",
        "name": "ทดสอบ",
        "department": "ช่างอิเล็กทรอนิกส์",
        "level": "pvs"
    })
    assert response.status_code == 422
    assert "htc.ac.th" in str(response.content)

def test_student_register_success():
    response = client.post("/auth/register/student", json={
        "email": "student01@htc.ac.th",
        "password": "password123",
        "name": "นาย กิตติศักดิ์ ช.",
        "department": "ช่างอิเล็กทรอนิกส์",
        "level": "pvs"
    })
    assert response.status_code == 201
    assert "verify_token" in response.json()

def test_employer_blocked_from_community():
    # Create employer token
    employer_token = create_access_token({"sub": 999, "role": "employer"})
    headers = {"Authorization": f"Bearer {employer_token}"}
    response = client.get("/community/posts", headers=headers)
    assert response.status_code == 403
    assert "Student access required" in response.json()["detail"]

def test_anonymous_encryption():
    user_id = 12345
    encrypted = encrypt_identity(user_id)
    assert encrypted != str(user_id)
    decrypted = decrypt_identity(encrypted)
    assert decrypted == user_id

def test_google_auth_success():
    response = client.post("/auth/google", json={"id_token": "dummy_token"})
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["role"] == "student"

def test_external_user_blocked_from_reviews_and_companies():
    # Create external user in DB
    db = SessionLocal()
    from models import User, UserRole
    ext_user = User(
        email="external@gmail.com",
        password_hash="hash",
        name="External User",
        role=UserRole.external,
        is_verified=True
    )
    db.add(ext_user)
    db.commit()
    db.refresh(ext_user)

    external_token = create_access_token({"sub": ext_user.id, "role": "external"})
    headers = {"Authorization": f"Bearer {external_token}"}
    
    # Check reviews
    res1 = client.get("/reviews", headers=headers)
    assert res1.status_code == 403
    
    # Check companies
    res2 = client.get("/companies", headers=headers)
    assert res2.status_code == 403

def test_jobs_public_access():
    # Unauthenticated public request
    res = client.get("/jobs")
    assert res.status_code == 200

def test_get_me_success():
    res_google = client.post("/auth/google", json={"id_token": "dummy_token"})
    token = res_google.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    res_me = client.get("/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "student01@htc.ac.th"
    assert res_me.json()["role"] == "student"


