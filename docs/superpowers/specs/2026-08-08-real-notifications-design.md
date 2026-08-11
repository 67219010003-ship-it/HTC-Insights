# Design Spec: Real Notification System (ระบบการแจ้งเตือนจริง)

## Context & Objectives
ระบบ HTC Insights เดิมใช้ข้อมูลแจ้งเตือน Mockup ใน `Navbar.tsx`
การปรับปรุงครั้งนี้คือการเชื่อมระบบการแจ้งเตือนกับฐานข้อมูลจริง (MySQL) และให้ระบบส่งการแจ้งเตือนเมื่อเกิดเหตุการณ์สำคัญในระบบ พร้อมแสดง **เหตุผลการปฏิเสธ (Rejection Reason)** อย่างชัดเจนกรณีที่รีวิวหรือคำขอยืนยันสิทธิ์ถูกปฏิเสธโดย Admin

---

## 1. Database Schema (`notifications`)

เพิ่ม Model `Notification` ใน `backend/models.py`:

```python
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # "success", "info", "warning", "error"
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
```

---

## 2. Backend Router (`backend/routers/notifications.py`)

### API Endpoints:
1. `GET /notifications`
   - ดึงรายการแจ้งเตือนของผู้ใช้ปัจจุบัน (`user_id = current_user.id`) เรียงจากใหม่ไปเก่า (`created_at DESC`)
2. `PATCH /notifications/read-all`
   - ปรับสถานะ `is_read = True` ให้กับการแจ้งเตือนทั้งหมดของผู้ใช้ปัจจุบัน
3. `PATCH /notifications/{id}/read`
   - ปรับสถานะ `is_read = True` สำหรับการแจ้งเตือนชิ้นเดียว

---

## 3. Notification Triggers (การสร้างแจ้งเตือนอัตโนมัติ)

ฟังก์ชัน Helper `create_notification(db, user_id, title, message, type, link)` จะถูกเรียกในกรณีต่างๆ:

1. **เมื่อ Admin ปฏิเสธรีวิว** (`backend/routers/admin.py`):
   - `title`: "รีวิวถูกปฏิเสธการอนุมัติ"
   - `message`: `เหตุผลที่ปฏิเสธ: {reason}` (แสดงสาเหตุที่ Admin ระบุ)
   - `type`: "warning"
   - `link`: "/profile"

2. **เมื่อ Admin อนุมัติรีวิว** (`backend/routers/admin.py`):
   - `title`: "รีวิวได้รับการอนุมัติเรียบร้อย"
   - `message`: "รีวิวสถานที่ฝึกงานของคุณได้รับการอนุมัติและเผยแพร่แล้ว"
   - `type`: "success"
   - `link`: "/insights"

3. **เมื่อ Admin ปฏิเสธคำขอยืนยันสิทธิ์นักศึกษา**:
   - `title`: "คำขอยืนยันสิทธิ์นักศึกษาถูกปฏิเสธ"
   - `message`: `สาเหตุที่ปฏิเสธ: {reason}`
   - `type`: "error"
   - `link`: "/profile"

4. **เมื่อ Admin อนุมัติคำขอยืนยันสิทธิ์นักศึกษา**:
   - `title`: "สิทธิ์นักศึกษาได้รับการอนุมัติแล้ว"
   - `message`: "บัญชีของคุณได้รับการอัปเกรดเป็นนักศึกษาประเภทสมบูรณ์แล้ว"
   - `type`: "success"
   - `link`: "/profile"

5. **เมื่อมีผู้ตอบความคิดเห็นในกระทู้ Community** (`backend/routers/community.py`):
   - `title`: "มีคำตอบใหม่ในกระทู้ของคุณ"
   - `message`: `{commenter_name} ได้แสดงความคิดเห็นในกระทู้ '{post_title}'`
   - `type`: "info"
   - `link`: `/community`

---

## 4. Frontend Integration (`Navbar.tsx`)

1. **การดึงข้อมูล**:
   - `Navbar.tsx` จะยิง `GET /notifications` เมื่อผู้ใช้เข้าสู่ระบบ
   - คำนวณ `unreadCount` จาก `notifications.filter(n => !n.isRead).length`
2. **การแสดงผล**:
   - เมนูป๊อปอัปแจ้งเตือนแสดง Title, Message (รวมถึงสาเหตุที่ถูกปฏิเสธ), สัญลักษณ์ประเภทการแจ้งเตือน (ไอคอนสีเขียว/เหลือง/แดง) และเวลา
   - ปรับปุ่ม "ทำเครื่องหมายว่าอ่านแล้วทั้งหมด" ให้เรียก `PATCH /notifications/read-all`
