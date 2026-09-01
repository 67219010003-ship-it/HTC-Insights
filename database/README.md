# 📊 แผนภาพฐานข้อมูล HTC Insight (Current ER Diagram)

ไฟล์ภาพและเวกเตอร์ของ ER Diagram ปัจจุบันได้รับการบันทึกไว้ในโฟลเดอร์ดังนี้:

## 📁 ตำแหน่งไฟล์ที่บันทึก
1. **โฟลเดอร์ database/**
   - [database/erd_diagram.png](file:///c:/Users/accmi/Documents/OLD%20E/HTC%20Insight/database/erd_diagram.png) : ภาพความละเอียดสูง (High-Resolution 1904x1907 px)
   - [database/erd_diagram.svg](file:///c:/Users/accmi/Documents/OLD%20E/HTC%20Insight/database/erd_diagram.svg) : ไฟล์เวกเตอร์ SVG (ขยายได้ไม่แตก คมชัด 100%)

2. **โฟลเดอร์ docs/**
   - [docs/erd_diagram.png](file:///c:/Users/accmi/Documents/OLD%20E/HTC%20Insight/docs/erd_diagram.png) : สำเนาภาพสำหรับแนบเล่มรายงาน/เอกสาร
   - [docs/erd_diagram.svg](file:///c:/Users/accmi/Documents/OLD%20E/HTC%20Insight/docs/erd_diagram.svg) : สำเนาเวกเตอร์ SVG

---

## 🗄️ โครงสร้างฐานข้อมูล (12 ตาราง)

### 1. หมวดบัญชีผู้ใช้และความปลอดภัย (Authentication & User Management)
- **users**: ตารางบัญชีผู้ใช้งาน (Google OAuth Only) สิทธิ์ student / admin / external
- **upgrade_requests**: ตารางคำร้องขอยืนยันตัวตนนศ. วท.หาดใหญ่ พร้อมแนบหลักฐาน
- **udit_logs**: ตารางบันทึกประวัติการกระทำและการตัดสินใจของ Admin

### 2. หมวดสถานประกอบการและรีวิว (Companies & Internship Reviews)
- **companies**: พิกัดแผนที่ (Leaflet) และข้อมูลสถานที่ฝึกงาน
- **
eviews**: รีวิวประสบการณ์ฝึกงาน เกณฑ์คะแนน 5 ด้าน และระบบตัวตนนศ.นิรนาม
- **
eview_photos**: รูปภาพบรรยากาศการฝึกงานที่แนบกับรีวิว

### 3. หมวดประกาศรับสมัครงานฝึกงาน (Job Postings)
- **job_postings**: ประกาศเปิดรับนักศึกษาฝึกงาน เชื่อมกับผู้ลงประกาศ (users)

### 4. หมวดคอมมูนิตี้เว็บบอร์ด (Community Board)
- **community_posts**: กระทู้คอมมูนิตี้แลกเปลี่ยนความคิดเห็น
- **community_comments**: ความคิดเห็นในกระทู้ (รองรับการตอบกลับซ้อนคันและ Best Answer)
- **community_likes**: การกดถูกใจกระทู้และความคิดเห็น

### 5. หมวดการแจ้งเตือนและการรายงาน (Notifications & Moderation)
- **
otifications**: ระบบการแจ้งเตือนผู้ใช้
- **
eports**: ระบบรายงานเนื้อหาที่ไม่เหมาะสม (ครอบคลุม กระทู้, รีวิว, คอมเมนต์, งาน, บริษัท)
