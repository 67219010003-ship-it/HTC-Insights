import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from auth import create_access_token, encrypt_identity, decrypt_identity
from models import User, UserRole, CommunityPost, CommunityComment, Company, Review

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

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

def test_external_user_blocked_from_reviews():
    # Create external user in DB
    with SessionLocal() as db:
        ext_user = User(
            email="external@gmail.com",
            name="External User",
            role=UserRole.external,
            is_active=True
        )
        db.add(ext_user)
        db.commit()
        db.refresh(ext_user)
        ext_user_id = ext_user.id

    external_token = create_access_token({"sub": ext_user_id, "role": "external"})
    headers = {"Authorization": f"Bearer {external_token}"}
    
    # Check reviews
    res1 = client.get("/reviews", headers=headers)
    assert res1.status_code == 403

def test_jobs_public_access():
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

def test_comment_edit_and_delete():
    # Login student
    res_google = client.post("/auth/google", json={"id_token": "dummy_token"})
    token = res_google.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_res = client.post("/community/posts", json={
        "type": "experience",
        "title": "หัวข้อทดสอบการคอมเมนต์",
        "content": "เนื้อหากระทู้ทดสอบยาวๆ เพื่อความถูกต้อง",
    }, headers=headers)
    post_id = post_res.json()["post_id"]

    # Approve post in DB for viewing
    with SessionLocal() as db:
        p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
        p.status = "approved"
        db.commit()

    # Add comment
    comm_res = client.post(f"/community/posts/{post_id}/comments", json={
        "content": "ความคิดเห็นทดสอบเดิม"
    }, headers=headers)
    assert comm_res.status_code == 201
    comment_id = comm_res.json()["comment_id"]

    # Approve comment in DB
    with SessionLocal() as db:
        c = db.query(CommunityComment).filter(CommunityComment.id == comment_id).first()
        c.status = "approved"
        db.commit()

    # Get thread
    thread_res = client.get(f"/community/posts/{post_id}", headers=headers)
    assert thread_res.status_code == 200
    comments = thread_res.json()["comments"]
    assert len(comments) == 1
    assert comments[0]["user_id"] is not None

    # Update comment
    upd_res = client.put(f"/community/comments/{comment_id}", json={
        "content": "ความคิดเห็นที่ได้รับการแก้ไขใหม่แล้ว"
    }, headers=headers)
    assert upd_res.status_code == 200

    # Delete comment
    del_res = client.delete(f"/community/comments/{comment_id}", headers=headers)
    assert del_res.status_code == 200

def test_one_comment_per_post_limit_and_admin_approval():
    res_google = client.post("/auth/google", json={"id_token": "dummy_token"})
    token = res_google.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_res = client.post("/community/posts", json={
        "type": "qa",
        "title": "หัวข้อทดสอบกระทู้จำกัดคอมเมนต์",
        "content": "เนื้อหากระทู้ทดสอบที่มีความยาวเกินสิบตัวอักษรแน่นอน"
    }, headers=headers)
    assert post_res.status_code == 201
    post_id = post_res.json()["post_id"]

    # Approve post in DB
    with SessionLocal() as db:
        p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
        p.status = "approved"
        db.commit()

    # 1. First comment succeeds
    comm1 = client.post(f"/community/posts/{post_id}/comments", json={
        "content": "ความคิดเห็นแรกของฉัน"
    }, headers=headers)
    assert comm1.status_code == 201

    # 2. Second comment by same user fails (1 comment limit)
    comm2 = client.post(f"/community/posts/{post_id}/comments", json={
        "content": "พยายามพิมพ์ความคิดเห็นที่สอง"
    }, headers=headers)
    assert comm2.status_code == 400
    assert "จำกัด 1 บัญชีผู้ใช้ ต่อ 1 ความคิดเห็น" in comm2.json()["detail"]

def test_one_posting_limit_for_external_employer():
    payload = {
        "company_name": "บจก. เทสต์จำกัด 1 บัญชี",
        "email": "testemployer@company.com",
        "phone": "080-000-0000",
        "address": "123 หาดใหญ่ สงขลา",
        "contact_person": "คุณสมชาย",
        "daily_allowance": "450",
    }
    res1 = client.post("/auth/register/employer", json=payload)
    assert res1.status_code == 201

    # Try creating second posting with same email
    res2 = client.post("/auth/register/employer", json=payload)
    assert res2.status_code == 400
    assert "1 บัญชีสามารถลงประกาศ" in res2.json()["detail"]

def test_logged_in_user_post_job_and_get_my_postings():
    # Login as external user
    with SessionLocal() as db:
        user = User(
            email="poster_user@gmail.com",
            name="Poster User",
            role=UserRole.external,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        uid = user.id

    token = create_access_token({"sub": uid, "role": "external", "email": "poster_user@gmail.com"})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "company_name": "บจก. โพสต์เก็ตมายจ็อบส์",
        "email": "poster_user@gmail.com",
        "contact_email": "hr_contact@company.ac",
        "phone": "089-111-2222",
        "address": "456 หาดใหญ่ สงขลา",
        "contact_person": "คุณวิชัย",
        "daily_allowance": "500",
    }
    reg_res = client.post("/auth/register/employer", json=payload, headers=headers)
    assert reg_res.status_code == 201

    # Fetch /jobs/my-postings
    my_jobs_res = client.get("/jobs/my-postings", headers=headers)
    assert my_jobs_res.status_code == 200
    job_list = my_jobs_res.json()
    assert len(job_list) == 1
    assert job_list[0]["company_name"] == "บจก. โพสต์เก็ตมายจ็อบส์"
    assert job_list[0]["poster_email"] == "poster_user@gmail.com"
    assert job_list[0]["status"] == "pending"

def test_global_exception_handler_cors():
    @app.get("/test-internal-error")
    def trigger_error():
        raise RuntimeError("Simulated crash")

    err_client = TestClient(app, raise_server_exceptions=False)
    response = err_client.get("/test-internal-error", headers={"Origin": "https://htc-insights.vercel.app"})
    assert response.status_code == 500
    assert response.headers.get("access-control-allow-origin") == "https://htc-insights.vercel.app"
    assert response.headers.get("access-control-allow-credentials") == "true"
