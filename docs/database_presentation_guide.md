# คู่มือการนำเสนอฐานข้อมูล MySQL บน phpMyAdmin สำหรับการพรีเซนต์
## โครงการ HTC Insight (วิทยาลัยเทคนิคหาดใหญ่)

---

## 🎯 จุดเด่นของฐานข้อมูลที่ควรชี้ให้กรรมการชม (Highlight Features)

1. **การออกแบบฐานข้อมูลตามหลักการ Normalization (3NF)**:
   - มีการแยก Entity ชัดเจน 13 ตาราง มี Primary Key และ Foreign Key เชื่อมโยงกันอย่างสมบูรณ์แบบ
   - มีการใช้ `ON DELETE CASCADE` และ `ON DELETE SET NULL` เพื่อรักษาความถูกต้องของข้อมูล (Referential Integrity)

2. **การรักษาความปลอดภัยของข้อมูลรีวิวและการเข้ารหัส (Data Security & Cryptography)**:
   - **รหัสผ่านผู้ใช้ (`password_hash`)**: เข้ารหัสด้วยอัลกอริทึม **PBKDF2-SHA256** ป้องกันการดักจับรหัสผ่าน 100%
   - **การเขียนรีวิวและโพสต์แบบนิรนาม (`anon_identity_enc`)**: ตัวตนที่แท้จริงของผู้ใช้จะถูกเข้ารหัสลับด้วย **Fernet Symmetric Encryption** ข้อมูลใน MySQL จะแสดงเป็น Ciphertext ปลอดภัยจากการถูกแฮกหรือส่องดูโดยตรง

3. **ระบบตรวจสอบย้อนกลับเพื่อความโปร่งใส (`audit_logs`)**:
   - ทุกครั้งที่แอดมินอนุมัติ/ปฏิเสธ หรือกดถอดรหัสตัวตน (Reveal Identity) ระบบจะบันทึก Log ลงใน MySQL ทันทีพร้อมระบุเวลาและเหตุผล

---

## 🖥️ ขั้นตอนการเปิดโชว์บน phpMyAdmin ทีละสเต็ป (Step-by-Step Demo Flow)

### สเต็ปที่ 1: โชว์ภาพรวมฐานข้อมูลและแผนภาพ Designer (ER Diagram View)
1. เปิดเบราว์เซอร์ไปที่ `http://localhost/phpmyadmin`
2. คลิกเลือกฐานข้อมูล **`htc_insights`** ที่แถบเมนูด้านซ้าย
3. คลิกแท็บ **"Designer" (ตัวออกแบบ)** ที่เมนูด้านบนขวา
4. **พูดอธิบาย**:
   > *"ระบบ HTC Insight มีการออกแบบฐานข้อมูลทั้งหมด 13 ตาราง โดยมี `users` เป็นแกนกลาง เชื่อมโยงกับ `reviews`, `community_posts`, `job_postings` และมีตาราง `audit_logs` สำหรับกำกับดูแลความปลอดภัยครับ"*

---

### สเต็ปที่ 2: โชว์ตาราง `users` และการเข้ารหัสรหัสผ่าน
1. คลิกที่ตาราง **`users`** -> คลิกแท็บ **"Browse" (เปิดดู)**
2. ชี้ให้กรรมการดูคอลัมน์:
   - `email`: อีเมลวิทยาลัย `@htc.ac.th`
   - `password_hash`: รหัสผ่านที่ถูกแฮชเป็นชุดตัวอักษรนิรภัย
   - `level`: ระดับชั้น ปวช. / ปวส. (แสดงผลข้อความภาษาไทยได้เต็มคำ ไม่ถูกตัด)

---

### สเต็ปที่ 3: โชว์ตาราง `reviews` และการเข้ารหัสตัวตนนศ. (`anon_identity_enc`)
1. คลิกที่ตาราง **`reviews`** -> คลิกแท็บ **"Browse"**
2. ชี้ให้กรรมการดูรีวิวที่มี `is_anonymous = 1`:
   - คอลัมน์ `anon_identity_enc` จะเก็บสตริงยาวๆ เช่น `gAAAAABqdLE1Ye2C...`
   - **พูดอธิบาย**:
     > *"สำหรับนักศึกษาที่เลือกเขียนรีวิวแบบไม่เปิดเผยตัวตน ระบบจะทำการ Encrypt ข้อมูลผู้เขียนลงในฟิลด์ `anon_identity_enc` ทำให้ไม่มีใครสามารถอ่านชื่อได้โดยตรงจากฐานข้อมูล และหากแอดมินจำเป็นต้องตรวจสอบ จะต้องกรอกเหตุผลและถูกบันทึกประวัติลงใน `audit_logs` เสมอครับ"*

---

### สเต็ปที่ 4: โชว์ตาราง `job_postings` และ `community_posts`
1. คลิกที่ตาราง **`job_postings`**: แสดงตำแหน่งงานฝึกงานที่เปิดรับ มีการผูกกับ `company_id` เพื่อไปแสดงหมุดบนแผนที่ Interactive Map
2. คลิกที่ตาราง **`community_posts`**, **`community_comments`**, **`community_likes`**: แสดงกระทู้ถาม-ตอบและแบ่งปันประสบการณ์ที่แยกสัดส่วนชัดเจน

---

## 🔍 คำสั่ง SQL ตัวอย่างสำหรับเปิดรันโชว์กรรมการ (Sample Queries)

### 1. ดูคะแนนเฉลี่ยและจำนวนรีวิวของแต่ละสถานประกอบการ
```sql
SELECT 
    c.name AS company_name,
    c.industry,
    COUNT(r.id) AS total_reviews,
    ROUND(AVG(r.score_overall), 2) AS average_score,
    ROUND(AVG(r.daily_allowance), 0) AS avg_allowance_baht
FROM companies c
LEFT JOIN reviews r ON c.id = r.company_id AND r.status = 'approved'
GROUP BY c.id, c.name, c.industry
ORDER BY average_score DESC;
```

### 2. ตรวจสอบประวัติการทำงานของแอดมิน (Audit Trail)
```sql
SELECT 
    a.id,
    u.name AS admin_name,
    a.action,
    a.target_type,
    a.target_id,
    a.reason,
    a.created_at
FROM audit_logs a
JOIN users u ON a.admin_id = u.id
ORDER BY a.created_at DESC;
```
