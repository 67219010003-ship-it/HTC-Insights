# เอกสารแผนภาพความสัมพันธ์ข้อมูล (ERD) และพจนานุกรมข้อมูล (Data Dictionary)
## โครงการระบบสารสนเทศเพื่อการฝึกงานและประเมินสถานประกอบการ (HTC Insight)
**วิทยาลัยเทคนิคหาดใหญ่ (Hatyai Technical College)**

---

## 1. แผนภาพความสัมพันธ์ของข้อมูล (Entity Relationship Diagram - ERD)

แผนภาพแสดงโครงสร้าง 13 ตาราง และความสัมพันธ์ระหว่าง Entity ทั้งหมดในระบบ HTC Insight:

```mermaid
erDiagram
    users ||--o{ reviews : "writes (1:N)"
    users ||--o{ community_posts : "creates (1:N)"
    users ||--o{ community_comments : "comments (1:N)"
    users ||--o{ community_likes : "likes (1:N)"
    users ||--o{ notifications : "receives (1:N)"
    users ||--o{ reports : "reports (1:N)"
    users ||--o{ audit_logs : "performed_by (1:N)"
    users ||--o{ upgrade_requests : "submits (1:N)"

    employers ||--o{ companies : "manages (1:N)"
    employers ||--o{ job_postings : "posts (1:N)"

    companies ||--o{ reviews : "has (1:N)"
    companies ||--o{ job_postings : "locates (1:N)"

    reviews ||--o{ review_photos : "contains (1:N)"
    reviews ||--o{ reports : "reported_in (1:N)"

    community_posts ||--o{ community_comments : "contains (1:N)"
    community_posts ||--o{ community_likes : "receives (1:N)"
    community_posts ||--o{ reports : "reported_in (1:N)"

    community_comments ||--o{ community_comments : "replies_to (1:N)"
    community_comments ||--o{ community_likes : "receives (1:N)"

    users {
        int id PK "รหัสผู้ใช้"
        varchar email UK "อีเมลเข้าสู่ระบบ"
        varchar password_hash "รหัสผ่านแฮช PBKDF2"
        varchar name "ชื่อ-นามสกุล"
        enum role "student | admin | external"
        varchar department "แผนกวิชา"
        varchar level "ระดับการศึกษา (ปวช./ปวส.)"
        boolean is_verified "สถานะยืนยันตัวตน นศ."
        varchar avatar_url "ลิงก์รูปโปรไฟล์"
        boolean is_super_admin "สิทธิ์แอดมินสูงสุด"
        datetime created_at "วันที่สมัครสมาชิก"
    }

    employers {
        int id PK "รหัสสถานประกอบการ"
        varchar email UK "อีเมลสถานประกอบการ"
        varchar password_hash "รหัสผ่านแฮช"
        varchar company_name "ชื่อสถานประกอบการ"
        text address "ที่อยู่"
        varchar industry "หมวดหมู่อุตสาหกรรม"
        varchar logo_url "ลิงก์โลโก้"
        boolean is_approved "สถานะการอนุมัติบัญชี"
        datetime created_at "วันที่ลงทะเบียน"
    }

    companies {
        int id PK "รหัสสถานที่ฝึกงาน"
        varchar name "ชื่อสถานที่/บริษัท"
        text address "ที่อยู่ตั้งบนแผนที่"
        varchar industry "ประเภทธุรกิจ"
        float lat "พิกัด Latitude"
        float lng "พิกัด Longitude"
        varchar phone "เบอร์โทรศัพท์"
        varchar website "เว็บไซต์"
        varchar cover_image_url "รูปปกบริษัท"
        text description "คำอธิบายบริษัท"
        boolean is_verified "รับรองสถานประกอบการ"
        int employer_id FK "รหัสผู้ประกอบการที่ดูแล"
        datetime created_at "วันที่เพิ่มข้อมูล"
    }

    reviews {
        int id PK "รหัสรีวิว"
        int company_id FK "รหัสบริษัทที่ถูกรีวิว"
        int user_id FK "รหัสผู้เขียนรีวิว"
        enum gender "male | female | prefer_not"
        date period_start "วันที่เริ่มฝึกงาน"
        date period_end "วันที่สิ้นสุดฝึกงาน"
        varchar department "แผนกวิชา"
        int daily_allowance "เบี้ยเลี้ยงรายวัน (บาท)"
        boolean has_accommodation "มีที่พักให้"
        boolean has_transport "มีรถรับส่ง/เดินทางสะดวก"
        varchar work_start_time "เวลาเริ่มงาน"
        varchar work_end_time "เวลาเลิกงาน"
        float score_overall "คะแนนรวม (1.0-5.0)"
        float score_work "คะแนนลักษณะงาน"
        float score_env "คะแนนสภาพแวดล้อม"
        float score_mentor "คะแนนพี่เลี้ยง"
        float score_welfare "คะแนนสวัสดิการ"
        text text_work "รายละเอียดงานจริง"
        text text_pros "ข้อดี"
        text text_cons "ข้อควรระวัง/ปรับปรุง"
        text text_advice "คำแนะนำสำหรับรุ่นน้อง"
        boolean is_anonymous "เขียนแบบนิรนาม"
        varchar anon_identity_enc "ข้อมูลตัวตนเข้ารหัสลับ Fernet"
        enum status "pending | approved | rejected"
        text rejection_reason "เหตุผลปฏิเสธ"
        datetime created_at "วันที่เขียนรีวิว"
    }

    review_photos {
        int id PK "รหัสรูปภาพ"
        int review_id FK "รหัสรีวิว"
        varchar url "URL รูปภาพบน Cloudinary"
        datetime created_at "วันที่อัปโหลด"
    }

    job_postings {
        int id PK "รหัสประกาศงาน"
        int employer_id FK "รหัสผู้ประกอบการ"
        int company_id FK "รหัสสถานที่ฝึกงาน"
        varchar title "ชื่อตำแหน่งงานฝึกงาน"
        varchar department "แผนกวิชาที่รับ"
        text description "รายละเอียดงาน/คุณสมบัติ"
        int daily_allowance "เบี้ยเลี้ยงรายวัน"
        varchar location "สถานที่ปฏิบัติงาน"
        date deadline "วันปิดรับสมัคร"
        boolean is_active "สถานะเปิดรับสมัคร"
        varchar status "pending | approved | rejected"
        text rejection_reason "เหตุผลปฏิเสธ"
        datetime created_at "วันที่สร้างประกาศ"
    }

    community_posts {
        int id PK "รหัสกระทู้"
        int user_id FK "รหัสผู้ตั้งกระทู้"
        enum type "experience | qa | tips | team"
        varchar department "แผนกวิชา"
        varchar title "หัวข้อกระทู้"
        text content "เนื้อหากระทู้"
        boolean is_anonymous "โพสต์แบบนิรนาม"
        varchar anon_identity_enc "ตัวตนเข้ารหัสลับ"
        boolean is_pinned "ปักหมุดกระทู้สำคัญ"
        varchar status "pending | approved | rejected"
        text rejection_reason "เหตุผลปฏิเสธ"
        datetime created_at "วันที่ตั้งกระทู้"
    }

    community_comments {
        int id PK "รหัสความคิดเห็น"
        int post_id FK "รหัสกระทู้"
        int user_id FK "รหัสผู้แสดงความเห็น"
        int parent_id FK "รหัสคอมเมนต์แม่ (Nested)"
        text content "เนื้อหาความคิดเห็น"
        boolean is_anonymous "คอมเมนต์นิรนาม"
        varchar anon_identity_enc "ตัวตนเข้ารหัสลับ"
        boolean is_best_answer "คำตอบที่ดีที่สุด"
        datetime created_at "วันที่แสดงความเห็น"
    }

    community_likes {
        int id PK "รหัสการกดไลก์"
        int user_id FK "รหัสผู้กดถูกใจ"
        int post_id FK "รหัสกระทู้ที่ถูกไลก์"
        int comment_id FK "รหัสคอมเมนต์ที่ถูกไลก์"
        datetime created_at "วันที่กดไลก์"
    }

    notifications {
        int id PK "รหัสแจ้งเตือน"
        int user_id FK "รหัสผู้รับการแจ้งเตือน"
        varchar title "หัวข้อแจ้งเตือน"
        text message "ข้อความแจ้งเตือน"
        varchar type "info | success | warning | error"
        boolean is_read "สถานะเปิดอ่าน"
        varchar link "ลิงก์ปลายทาง"
        datetime created_at "เวลาที่แจ้งเตือน"
    }

    reports {
        int id PK "รหัสรายงานความผิด"
        int reporter_id FK "รหัสผู้ส่งรายงาน"
        int post_id FK "รหัสกระทู้ที่มีปัญหา"
        int review_id FK "รหัสรีวิวที่มีปัญหา"
        int comment_id FK "รหัสคอมเมนต์ที่มีปัญหา"
        int job_id FK "รหัสตำแหน่งงานที่มีปัญหา"
        int company_id FK "รหัสสถานที่ที่มีปัญหา"
        text reason "เหตุผลการรายงาน"
        varchar status "pending | resolved | dismissed"
        datetime created_at "วันที่รายงาน"
    }

    audit_logs {
        int id PK "รหัสบันทึกประวัติ"
        int admin_id FK "รหัสแอดมินที่ดำเนินการ"
        varchar action "การกระทำ เช่น approve_review"
        varchar target_type "post | review | user | report"
        int target_id "ID ของเป้าหมาย"
        text reason "เหตุผลการดำเนินการ"
        datetime created_at "เวลาที่บันทึก Log"
    }

    upgrade_requests {
        int id PK "รหัสคำขอยืนยันสิทธิ์"
        int user_id FK "รหัสผู้ใช้"
        varchar student_id "รหัสนักศึกษา"
        varchar department "แผนกวิชา"
        varchar phone "เบอร์โทรศัพท์ติดต่อ"
        text reason "เหตุผลคำขอ"
        enum status "pending | approved | rejected"
        text rejection_reason "เหตุผลที่ปฏิเสธ"
        varchar card_image_url "URL รูปบัตร นศ."
        datetime created_at "วันที่ยื่นคำขอ"
        datetime updated_at "วันที่แก้ไขล่าสุด"
    }
```

---

## 2. พจนานุกรมข้อมูลรายตาราง (Data Dictionary)

### 📌 ตารางที่ 1: `users` (ตารางข้อมูลผู้ใช้งาน)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสประจำตัวผู้ใช้ (Primary Key) |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | - | อีเมลสำหรับเข้าสู่ระบบ |
| `password_hash` | `VARCHAR(255)` | NOT NULL | - | รหัสผ่านที่เข้ารหัสด้วย PBKDF2-SHA256 |
| `name` | `VARCHAR(255)` | NOT NULL | - | ชื่อ-นามสกุล ของผู้ใช้งาน |
| `role` | `ENUM` | NOT NULL | `'student'` | สิทธิ์ผู้ใช้ (`student`, `admin`, `external`) |
| `department` | `VARCHAR(100)` | NULL | NULL | แผนกวิชาที่ศึกษาหรือสังกัด |
| `level` | `VARCHAR(100)` | NULL | NULL | ระดับชั้น เช่น ปวช., ปวส. |
| `is_verified` | `TINYINT(1)` | NOT NULL | `0` | ยืนยันตัวตน นศ. แล้วหรือยัง |
| `avatar_url` | `VARCHAR(500)` | NULL | NULL | URL รูปภาพประจำตัว |
| `is_super_admin` | `TINYINT(1)` | NOT NULL | `0` | สิทธิ์ผู้ดูแลระบบระดับสูงสุด |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่ลงทะเบียนเข้าใช้งาน |

---

### 📌 ตารางที่ 2: `employers` (ตารางข้อมูลบัญชีสถานประกอบการ)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสบัญชีผู้ประกอบการ |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | - | อีเมลสำหรับเข้าสู่ระบบของสถานประกอบการ |
| `password_hash` | `VARCHAR(255)` | NOT NULL | - | รหัสผ่านแฮช |
| `company_name` | `VARCHAR(255)` | NOT NULL | - | ชื่อสถานประกอบการ / บริษัท |
| `address` | `TEXT` | NULL | NULL | ที่ตั้งสถานประกอบการ |
| `industry` | `VARCHAR(100)` | NULL | NULL | ประเภทธุรกิจ เช่น เทคโนโลยีสารสนเทศ |
| `logo_url` | `VARCHAR(500)` | NULL | NULL | URL โลโก้สถานประกอบการ |
| `is_approved` | `TINYINT(1)` | NOT NULL | `0` | อนุมัติการเปิดบัญชีโดยแอดมินแล้วหรือยัง |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่ลงทะเบียน |

---

### 📌 ตารางที่ 3: `companies` (ตารางข้อมูลสถานที่และพิกัดแผนที่)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสสถานที่ฝึกงาน |
| `name` | `VARCHAR(255)` | NOT NULL, INDEX | - | ชื่อบริษัท / หน่วยงาน |
| `address` | `TEXT` | NULL | NULL | ที่อยู่สำหรับแสดงบนการ์ดและแผนที่ |
| `industry` | `VARCHAR(100)` | NULL | NULL | ประเภทธุรกิจ |
| `lat` | `FLOAT` | NULL | NULL | พิกัดละติจูด (Latitude) |
| `lng` | `FLOAT` | NULL | NULL | พิกัดลองจิจูด (Longitude) |
| `phone` | `VARCHAR(50)` | NULL | NULL | เบอร์โทรศัพท์ติดต่อ |
| `website` | `VARCHAR(500)` | NULL | NULL | เว็บไซต์บริษัท |
| `cover_image_url` | `VARCHAR(500)` | NULL | NULL | รูปภาพหน้าสถานประกอบการ |
| `description` | `TEXT` | NULL | NULL | คำอธิบายลักษณะการดำเนินงานของบริษัท |
| `is_verified` | `TINYINT(1)` | NOT NULL | `0` | สถานะได้รับการรับรองจากวิทยาลัย |
| `employer_id` | `INT(11)` | FK -> `employers(id)` | NULL | รหัสผู้ดูแลสถานประกอบการ |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่เพิ่มเข้าระบบ |

---

### 📌 ตารางที่ 4: `reviews` (ตารางบันทึกการรีวิวฝึกงาน)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสรีวิว |
| `company_id` | `INT(11)` | FK -> `companies(id)` | - | สถานประกอบการที่ถูกรีวิว |
| `user_id` | `INT(11)` | FK -> `users(id)` | - | นักศึกษาผู้เขียนรีวิว |
| `gender` | `ENUM` | NOT NULL | `'prefer_not'` | เพศของผู้รีวิว |
| `period_start` | `DATE` | NOT NULL | - | วันที่เริ่มฝึกงาน |
| `period_end` | `DATE` | NOT NULL | - | วันที่สิ้นสุดการฝึกงาน |
| `department` | `VARCHAR(100)` | NULL | NULL | แผนกวิชาขณะฝึกงาน |
| `daily_allowance` | `INT(11)` | NULL | `0` | เบี้ยเลี้ยงรายวัน (บาท/วัน) |
| `has_accommodation` | `TINYINT(1)` | NOT NULL | `0` | มีที่พักให้ (1=มี, 0=ไม่มี) |
| `has_transport` | `TINYINT(1)` | NOT NULL | `0` | มีรถรับส่ง/เดินทางสะดวก |
| `work_start_time` | `VARCHAR(50)` | NULL | `'08:30'` | เวลาเริ่มทำงาน |
| `work_end_time` | `VARCHAR(50)` | NULL | `'17:00'` | เวลาเลิกงาน |
| `score_overall` | `FLOAT` | NOT NULL | - | คะแนนประเมินภาพรวม (1.0–5.0) |
| `score_work` | `FLOAT` | NULL | NULL | คะแนนลักษณะงาน |
| `score_env` | `FLOAT` | NULL | NULL | คะแนนสภาพแวดล้อมในที่ทำงาน |
| `score_mentor` | `FLOAT` | NULL | NULL | คะแนนการดูแลของพี่เลี้ยง |
| `score_welfare` | `FLOAT` | NULL | NULL | คะแนนสวัสดิการและเบี้ยเลี้ยง |
| `text_work` | `TEXT` | NOT NULL | - | อธิบายลักษณะงานที่ได้รับมอบหมายจริง |
| `text_pros` | `TEXT` | NULL | NULL | ข้อดีและจุดเด่น |
| `text_cons` | `TEXT` | NULL | NULL | ข้อควรระวังและสิ่งที่ควรปรับปรุง |
| `text_advice` | `TEXT` | NULL | NULL | คำแนะนำสำหรับรุ่นน้องที่จะมาฝึกงาน |
| `is_anonymous` | `TINYINT(1)` | NOT NULL | `0` | รีวิวแบบไม่เปิดเผยตัวตน (1=ใช่) |
| `anon_identity_enc` | `VARCHAR(500)` | NULL | NULL | ข้อมูลตัวตนผู้เขียนที่เข้ารหัส Fernet |
| `status` | `ENUM` | NOT NULL | `'pending'` | สถานะ (`pending`, `approved`, `rejected`) |
| `rejection_reason` | `TEXT` | NULL | NULL | เหตุผลการปฏิเสธของแอดมิน |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่บันทึกรีวิว |

---

### 📌 ตารางที่ 5: `job_postings` (ตารางประกาศรับสมัครงานฝึกงาน)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสประกาศงาน |
| `employer_id` | `INT(11)` | FK -> `employers(id)` | - | ผู้ประกอบการที่ลงประกาศ |
| `company_id` | `INT(11)` | FK -> `companies(id)` | NULL | บริษัทที่ฝึกงาน (สำหรับปักหมุด) |
| `title` | `VARCHAR(255)` | NOT NULL | - | ชื่อตำแหน่งงานฝึกงาน |
| `department` | `VARCHAR(100)` | NULL | NULL | แผนกวิชาที่เปิดรับ |
| `description` | `TEXT` | NULL | NULL | รายละเอียดหน้าที่และคุณสมบัติ |
| `daily_allowance` | `INT(11)` | NULL | `0` | เบี้ยเลี้ยงรายวัน (บาท) |
| `location` | `VARCHAR(255)` | NULL | NULL | สถานที่ปฏิบัติงาน |
| `deadline` | `DATE` | NULL | NULL | วันปิดรับสมัคร |
| `is_active` | `TINYINT(1)` | NOT NULL | `1` | เปิดรับสมัครอยู่หรือไม่ |
| `status` | `VARCHAR(20)` | NOT NULL | `'pending'` | สถานะการอนุมัติประกาศ |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่สร้างประกาศ |

---

### 📌 ตารางที่ 6, 7, 8: กลุ่มตารางคอมมูนิตี้ (`community_posts`, `community_comments`, `community_likes`)

#### `community_posts` (ตารางกระทู้เว็บบอร์ด)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสกระทู้ |
| `user_id` | `INT(11)` | FK -> `users(id)` | - | ผู้ตั้งกระทู้ |
| `type` | `ENUM` | NOT NULL | - | ประเภทกระทู้ (`experience`, `qa`, `tips`, `team`) |
| `department` | `VARCHAR(100)` | NULL | NULL | หมวดหมู่แผนกวิชา |
| `title` | `VARCHAR(255)` | NOT NULL | - | หัวข้อกระทู้ |
| `content` | `TEXT` | NOT NULL | - | เนื้อหากระทู้ |
| `is_anonymous` | `TINYINT(1)` | NOT NULL | `0` | โพสต์แบบนิรนามหรือไม่ |
| `anon_identity_enc` | `VARCHAR(500)` | NULL | NULL | ตัวตนผู้เขียนที่เข้ารหัสลับ |
| `is_pinned` | `TINYINT(1)` | NOT NULL | `0` | ปักหมุดกระทู้สำคัญบนสุด |
| `status` | `VARCHAR(20)` | NOT NULL | `'pending'` | สถานะอนุมัติ (`pending`, `approved`, `rejected`) |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่โพสต์กระทู้ |

#### `community_comments` (ตารางความคิดเห็นในกระทู้)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสความคิดเห็น |
| `post_id` | `INT(11)` | FK -> `community_posts(id)` | - | กระทู้ที่แสดงความเห็น |
| `user_id` | `INT(11)` | FK -> `users(id)` | - | ผู้แสดงความคิดเห็น |
| `parent_id` | `INT(11)` | FK -> `community_comments(id)` | NULL | รหัสคอมเมนต์แม่ (สำหรับการตอบกลับ Nested) |
| `content` | `TEXT` | NOT NULL | - | ข้อความความคิดเห็น |
| `is_anonymous` | `TINYINT(1)` | NOT NULL | `0` | แสดงความคิดเห็นแบบนิรนาม |
| `is_best_answer` | `TINYINT(1)` | NOT NULL | `0` | คำตอบที่ได้รับเลือกเป็น Best Answer |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่แสดงความคิดเห็น |

#### `community_likes` (ตารางการกดถูกใจ)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสการกดไลก์ |
| `user_id` | `INT(11)` | FK -> `users(id)` | - | ผู้กดถูกใจ |
| `post_id` | `INT(11)` | FK -> `community_posts(id)` | NULL | กระทู้ที่ถูกกดไลก์ (ถ้าไลก์กระทู้) |
| `comment_id` | `INT(11)` | FK -> `community_comments(id)` | NULL | ความคิดเห็นที่ถูกกดไลก์ (ถ้าไลก์คอมเมนต์) |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่กดไลก์ |

---

### 📌 ตารางที่ 9: `reports` (ตารางรายงานความไม่เหมาะสม)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสรายงาน |
| `reporter_id` | `INT(11)` | FK -> `users(id)` | - | ผู้ใช้ที่กดรายงาน |
| `post_id` | `INT(11)` | FK -> `community_posts(id)` | NULL | กระทู้ที่มีปัญหา |
| `review_id` | `INT(11)` | FK -> `reviews(id)` | NULL | รีวิวที่มีปัญหา |
| `comment_id` | `INT(11)` | FK -> `community_comments(id)` | NULL | ความคิดเห็นที่มีปัญหา |
| `job_id` | `INT(11)` | FK -> `job_postings(id)` | NULL | ตำแหน่งงานที่มีปัญหา |
| `company_id` | `INT(11)` | FK -> `companies(id)` | NULL | บริษัทที่มีปัญหา |
| `reason` | `TEXT` | NOT NULL | - | สาเหตุการรายงาน เช่น สแปม, หมิ่นประมาท |
| `status` | `VARCHAR(20)` | NOT NULL | `'pending'` | สถานะ (`pending`, `resolved`, `dismissed`) |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่ส่งรายงาน |

---

### 📌 ตารางที่ 10: `audit_logs` (ตารางบันทึกประวัติแอดมิน)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสประวัติการทำงาน |
| `admin_id` | `INT(11)` | FK -> `users(id)` | - | แอดมินผู้ดำเนินการ |
| `action` | `VARCHAR(100)` | NOT NULL | - | การกระทำ เช่น `approve_post`, `reveal_anonymous` |
| `target_type` | `VARCHAR(50)` | NULL | NULL | ชนิดข้อมูลเป้าหมาย (`post`, `review`, `user`) |
| `target_id` | `INT(11)` | NULL | NULL | รหัสของข้อมูลเป้าหมาย |
| `reason` | `TEXT` | NULL | NULL | เหตุผลประกอบการดำเนินการ |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | เวลาที่เกิดเหตุการณ์ |

---

### 📌 ตารางที่ 11: `upgrade_requests` (ตารางคำขอยืนยันสิทธิ์นักศึกษา)
| คอลัมน์ | ชนิดข้อมูล | Constraints | ค่าเริ่มต้น | คำอธิบายภาษาไทย |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT(11)` | PK, AUTO_INCREMENT | - | รหัสคำขอ |
| `user_id` | `INT(11)` | FK -> `users(id)` | - | นักศึกษาผู้ยื่นคำขอ |
| `student_id` | `VARCHAR(50)` | NOT NULL | - | รหัสนักศึกษา เช่น 65309010001 |
| `department` | `VARCHAR(100)` | NULL | NULL | แผนกวิชา |
| `phone` | `VARCHAR(50)` | NULL | NULL | เบอร์โทรศัพท์ |
| `reason` | `TEXT` | NULL | NULL | เหตุผลความจำเป็นในการขอสิทธิ์ |
| `card_image_url` | `VARCHAR(500)` | NULL | NULL | ลิงก์รูปถ่ายบัตรนักศึกษา |
| `status` | `ENUM` | NOT NULL | `'pending'` | สถานะ (`pending`, `approved`, `rejected`) |
| `created_at` | `DATETIME` | NOT NULL | `CURRENT_TIMESTAMP` | วันที่ส่งคำขอ |
