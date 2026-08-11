# Design Spec: System-wide Content Approval, Rejection Reason Modal, Universal Reporting & Unified Admin Dashboard

## Context & Objectives
ระบบ HTC Insights ปรับปรุงกระบวนการอนุมัติเนื้อหาใหม่ทั้งหมด ให้ทุกเนื้อหา (รีวิว, โพสต์ Community, ประกาศงาน Jobs, คำขอยืนยันสิทธิ์นักศึกษา) ต้องผ่านการอนุมัติจาก Admin ก่อนเผยแพร่สาธารณะ 
รวมถึงเพิ่มระบบรายงานเนื้อหาครอบคลุมทุกส่วน (รีวิว, โพสต์, ความคิดเห็น, ประกาศงาน, สถานประกอบการ), เพิ่มป๊อปอัปบังคับใส่เหตุผลเมื่อปฏิเสธ, คืนคอลัมน์ Super Admin และออกแบบหน้า Admin Center (`/admin`) ใหม่เป็นแบบ Unified Dashboard รวมทุกอย่างในหน้าเดียว

---

## 1. Data Schema Updates (`backend/models.py`)

### 1.1 `CommunityPost`
- เพิ่ม `status` = `Column(String(20), default="pending")` ("pending", "approved", "rejected")
- เพิ่ม `rejection_reason` = `Column(Text, nullable=True)`

### 1.2 `JobPosting`
- เพิ่ม `status` = `Column(String(20), default="pending")` ("pending", "approved", "rejected")
- เพิ่ม `rejection_reason` = `Column(Text, nullable=True)`

### 1.3 `Review`
- เพิ่ม `rejection_reason` = `Column(Text, nullable=True)`

### 1.4 `UpgradeRequest`
- เพิ่ม `rejection_reason` = `Column(Text, nullable=True)`

### 1.5 `Report` (Universal Reporting Table)
```python
class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=True)
    comment_id = Column(Integer, ForeignKey("community_comments.id"), nullable=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending") # "pending", "resolved", "dismissed"
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## 2. Universal Reporting System (ระบบรายงานทุกส่วน)

### 2.1 API Endpoint (`POST /reports`)
- เอนด์พอยท์สร้างรายงานเนื้อหาไม่เหมาะสม รองรับการส่ง:
  - `review_id` (รายงานรีวิว)
  - `post_id` (รายงานโพสต์ Community)
  - `comment_id` (รายงานความคิดเห็น)
  - `job_id` (รายงานประกาศงาน)
  - `company_id` (รายงานข้อมูลบริษัท/สถานประกอบการ)
  - `reason` (สาเหตุที่รายงาน)

### 2.2 Frontend UI Report Buttons & `ReportModal.tsx`
- สร้างคอมโพเนนต์ `ReportModal.tsx` ป๊อปอัปให้เลือก/ระบุสาเหตุการรายงาน ("ข้อมูลเป็นเท็จ", "สแปม/โฆษณา", "ข้อความไม่เหมาะสม/คุกคาม", "อื่นๆ")
- ติดตั้งปุ่ม **"รายงาน"** ในทุกจุดสำคัญ:
  1. การ์ดรีวิว (`/insights/[id]`)
  2. การ์ดโพสต์และกล่องความคิดเห็น (`/community`)
  3. หน้ารายละเอียดงาน (`/jobs`)
  4. หน้าข้อมูลบริษัท (`/insights`)

---

## 3. Mandatory Rejection Reason Modal (ป๊อปอัปบังคับระบุเหตุผลเมื่อปฏิเสธ)

สร้างคอมโพเนนต์ `RejectReasonModal.tsx` ใน Frontend:
- เมื่อ Admin กดปุ่ม **"ปฏิเสธ"** รายการใดๆ (รีวิว, โพสต์, ประกาศงาน, สิทธิ์นักศึกษา) ระบบจะเปิด Modal ขึ้นมา
- ช่องข้อความ "ระบุเหตุผลในการปฏิเสธ" (Mandatory Textarea)
- ปุ่ม "ยืนยันการปฏิเสธ" จะถูก Disable จนกว่าจะมีข้อความระบุเหตุผล
- เมื่อยืนยัน ระบบจะยิง API ไปอัปเดตสถานะเป็น `rejected` พร้อมบันทึก `rejection_reason` และส่ง Notification ไปยังผู้ใช้งาน

---

## 4. Single-Page Unified Admin Dashboard (`/admin/page.tsx`)

ปรับปรุงหน้า `/admin` ให้เป็น Dashboard สรุปข้อมูล 5 หมวดหมู่หลักในหน้าเดียว:

1. **Header & Quick Summary Bar**:
   - แสดงการ์ดสถิติจำนวนรายการที่รอดำเนินการทั้ง 5 หมวดหมู่ (Pending Reviews, Pending Posts, Pending Jobs, Pending Upgrades, Pending Reports)

2. **Section 1: คำขออนุมัติรีวิว (Pending Reviews - 3 รายการล่าสุด)**
   - แสดงชื่อสถานประกอบการ ผู้รีวิว คะแนน วันเวลา -> ปุ่ม [อนุมัติ] | [ปฏิเสธ (ระบุเหตุผล)] -> ลิงก์ "ดูรีวิวทั้งหมด →" (`/admin/reviews`)

3. **Section 2: คำขออนุมัติโพสต์ Community (Pending Posts - 3 รายการล่าสุด)**
   - แสดงหัวข้อกระทู้ แผนก ผู้โพสต์ เนื้อหาโดยย่อ -> ปุ่ม [อนุมัติ] | [ปฏิเสธ (ระบุเหตุผล)] -> ลิงก์ "ดูโพสต์ทั้งหมด →" (`/admin/posts`)

4. **Section 3: คำขออนุมัติประกาศงาน Jobs (Pending Job Postings - 3 รายการล่าสุด)**
   - แสดงชื่อตำแหน่งงาน สถานประกอบการ เบี้ยเลี้ยง -> ปุ่ม [อนุมัติ] | [ปฏิเสธ (ระบุเหตุผล)] -> ลิงก์ "ดูประกาศงานทั้งหมด →" (`/admin/jobs`)

5. **Section 4: คำขอยืนยันสิทธิ์นักศึกษา (Pending Upgrade Requests - 3 รายการล่าสุด)**
   - แสดงชื่อนักศึกษา รหัสนักศึกษา แผนกวิชา -> ปุ่ม [อนุมัติ] | [ปฏิเสธ (ระบุเหตุผล)] -> ลิงก์ "ดูคำขอทั้งหมด →" (`/admin/upgrades`)

6. **Section 5: การรายงานเนื้อหาไม่เหมาะสม (Pending Reports - 3 รายการล่าสุด)**
   - แสดงประเภทเนื้อหาที่ถูกรายงาน เหตุผล ผู้รายงาน -> ปุ่ม [จัดการ/ลบเนื้อหา] | [ยกเลิกรายงาน] -> ลิงก์ "ดูรายงานทั้งหมด →" (`/admin/reports`)

---

## 5. Restore Super Admin Column (`/admin/users`)

- คืนคอลัมน์ **Super Admin** ในหน้า [`frontend/app/admin/users/page.tsx`](file:///e:/HTC%20Insight/frontend/app/admin/users/page.tsx)
- แสดงป้าย/ปุ่มสลับสิทธิ์ `👑 Super Admin` หรือ `ปกติ` สำหรับการจัดการสิทธิ์ระดับสูง
