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
    from database import SessionLocal
    from models import CommunityPost
    db = SessionLocal()
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    p.status = "approved"
    db.commit()

    # Add comment
    comm_res = client.post(f"/community/posts/{post_id}/comments", json={
        "content": "ความคิดเห็นทดสอบเดิม",
        "is_anonymous": False
    }, headers=headers)
    assert comm_res.status_code == 201

    # Get thread
    thread_res = client.get(f"/community/posts/{post_id}", headers=headers)
    assert thread_res.status_code == 200
    comments = thread_res.json()["comments"]
    assert len(comments) == 1
    comment_id = comments[0]["id"]
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
        "content": "เนื้อหากระทู้ทดสอบที่มีความยาวเกินสิบตัวอักษรแน่นอน",
        "is_anonymous": False
    }, headers=headers)
    assert post_res.status_code == 201, f"Failed post creation: {post_res.json()}"
    post_id = post_res.json()["post_id"]

    # Approve post in DB for full accessibility
    from database import SessionLocal
    from models import CommunityPost
    db = SessionLocal()
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    p.status = "approved"
    db.commit()

    # 1. First comment succeeds
    comm1 = client.post(f"/community/posts/{post_id}/comments", json={
        "content": "ความคิดเห็นแรกของฉัน",
        "is_anonymous": False
    }, headers=headers)
    assert comm1.status_code == 201

    # 2. Second comment by same user fails (1 comment limit)
    comm2 = client.post(f"/community/posts/{post_id}/comments", json={
        "content": "พยายามพิมพ์ความคิดเห็นที่สอง",
        "is_anonymous": False
    }, headers=headers)
    assert comm2.status_code == 400
    assert "จำกัด 1 บัญชีผู้ใช้ ต่อ 1 ความคิดเห็น" in comm2.json()["detail"]

    # 3. Check my comments endpoint
    my_comm_res = client.get("/community/my-comments", headers=headers)
    assert my_comm_res.status_code == 200
    assert len(my_comm_res.json()) >= 1
    assert my_comm_res.json()[0]["post_title"] == "หัวข้อทดสอบกระทู้จำกัดคอมเมนต์"

def test_one_posting_limit_for_external_employer():
    payload = {
        "company_name": "บจก. เทสต์จำกัด 1 บัญชี",
        "email": "testemployer@company.com",
        "phone": "000-000-0000",
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

def test_six_posts_limit_per_student():
    res_google = client.post("/auth/google", json={"id_token": "dummy_token"})
    token = res_google.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Delete existing posts for this test user first
    from database import SessionLocal
    from models import CommunityPost, User
    db = SessionLocal()
    u = db.query(User).filter(User.email == "student01@htc.ac.th").first()
    if u:
        db.query(CommunityPost).filter(CommunityPost.user_id == u.id).delete()
        db.commit()

    # Create 6 posts successfully
    for i in range(6):
        res = client.post("/community/posts", json={
            "type": "qa",
            "title": f"กระทู้ทดสอบที่ {i+1} สำหรับตรวจสอบโควตา",
            "content": f"เนื้อหากระทู้ทดสอบโควตาความยาวเกินสิบตัวอักษรแน่นอนกระทู้ที่ {i+1}",
        }, headers=headers)
        assert res.status_code == 201, f"Post {i+1} failed: {res.json()}"

    # 7th post must be blocked (400 limit exceeded)
    res_blocked = client.post("/community/posts", json={
        "type": "qa",
        "title": "กระทู้ที่ 7 ที่ควรจะถูกบล็อกโควตา",
        "content": "เนื้อหากระทู้ที่เกินโควตากำหนดหกกระทู้ต่อคน",
    }, headers=headers)
    assert res_blocked.status_code == 400
    assert "จำกัดสูงสุด 6 กระทู้ต่อ 1 บัญชีผู้ใช้" in res_blocked.json()["detail"]

def test_my_upgrade_request_crud():
    res_google = client.post("/auth/google", json={"id_token": "dummy_token"})
    token = res_google.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Clean previous requests for test user
    from database import SessionLocal
    from models import UpgradeRequest, User
    db = SessionLocal()
    u = db.query(User).filter(User.email == "student01@htc.ac.th").first()
    if u:
        db.query(UpgradeRequest).filter(UpgradeRequest.user_id == u.id).delete()
        db.commit()

    # 2. Get when no request
    res_empty = client.get("/auth/my-upgrade-request", headers=headers)
    assert res_empty.status_code == 200
    assert res_empty.json()["has_request"] is False

    # 3. Create request
    create_payload = {
        "student_id": "67219010001",
        "department": "แผนกวิชาเทคโนโลยีสารสนเทศ",
        "phone": "000-000-0000",
        "reason": "ขอปรับสิทธิ์นักศึกษา",
        "card_image_url": "https://example.com/card.jpg"
    }
    res_create = client.post("/auth/request-student-verification", json=create_payload, headers=headers)
    assert res_create.status_code == 200

    # 4. Get after created
    res_get = client.get("/auth/my-upgrade-request", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["has_request"] is True
    assert res_get.json()["request"]["student_id"] == "67219010001"
    assert res_get.json()["request"]["status"] == "pending"

    # 5. Update request
    update_payload = {
        "student_id": "67219010002",
        "department": "แผนกวิชาช่างไฟฟ้ากำลัง",
        "phone": "089-876-5432",
        "reason": "แก้ไขเหตุผลการยื่นคำร้อง",
        "card_image_url": "https://example.com/card_new.jpg"
    }
    res_update = client.put("/auth/my-upgrade-request", json=update_payload, headers=headers)
    assert res_update.status_code == 200
    assert res_update.json()["request"]["student_id"] == "67219010002"
    assert res_update.json()["request"]["department"] == "แผนกวิชาช่างไฟฟ้ากำลัง"

    # 6. Delete request
    res_delete = client.delete("/auth/my-upgrade-request", headers=headers)
    assert res_delete.status_code == 200

    # 7. Check deleted
    res_after_del = client.get("/auth/my-upgrade-request", headers=headers)
    assert res_after_del.status_code == 200
    assert res_after_del.json()["has_request"] is False




