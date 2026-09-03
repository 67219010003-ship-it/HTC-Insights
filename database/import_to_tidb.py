import csv
import os
import sys
import re
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding="utf-8")
csv.field_size_limit(2147483647)

workspace = r"c:\Users\accmi\Documents\OLD E\HTC Insight"
clean_dir = os.path.join(workspace, "database", "clean_csv")
sys.path.insert(0, os.path.join(workspace, "backend"))

# Load environment
load_dotenv(os.path.join(workspace, "backend", ".env"))
load_dotenv(os.path.join(workspace, ".env"))

raw_db_url = os.getenv("DATABASE_URL", "")
raw_db_url = raw_db_url.strip().strip("'\"").strip()

if "?" in raw_db_url:
    base_url = raw_db_url.split("?")[0]
else:
    base_url = raw_db_url

if base_url.startswith("mysql://"):
    base_url = "mysql+pymysql://" + base_url[len("mysql://"):]

if "tidbcloud.com" in base_url and re.search(r":4000/?(?=\?|$)", base_url):
    base_url = re.sub(r":4000/?(?=\?|$)", r":4000/test", base_url)

print(f"🔗 กำลังเชื่อมต่อไปยัง TiDB Cloud: {base_url.split('@')[-1]}...")

import ssl
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

connect_args = {"ssl": ssl_ctx, "charset": "utf8mb4"}

try:
    from models import Base
    engine = create_engine(base_url, connect_args=connect_args, pool_pre_ping=True)
    with engine.connect() as conn:
        print("✅ เชื่อมต่อ TiDB Cloud สำเร็จ!\n")
        
        # Disable foreign key checks for clean recreation
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        conn.commit()

        # 1. Recreate all 12 tables using SQLAlchemy Metadata
        print("🔨 1. กำลังสร้างตารางทั้ง 12 ตาราง...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("✅ สร้างโครงสร้างตาราง 12 ตารางเรียบร้อยแล้ว!\n")

        # 2. Import CSV data in order of foreign key dependency
        table_order = [
            ("users", "users.csv"),
            ("companies", "companies.csv"),
            ("reviews", "reviews.csv"),
            ("review_photos", "review_photos.csv"),
            ("job_postings", "job_postings.csv"),
            ("community_posts", "community_posts.csv"),
            ("community_comments", "community_comments.csv"),
            ("community_likes", "community_likes.csv"),
            ("notifications", "notifications.csv"),
            ("reports", "reports.csv"),
            ("audit_logs", "audit_logs.csv"),
            ("upgrade_requests", "upgrade_requests.csv"),
        ]

        print("📥 2. กำลังนำเข้าข้อมูลจริงจาก clean_csv เข้าสู่ TiDB Cloud...")
        for tbl_name, fname in table_order:
            fpath = os.path.join(clean_dir, fname)
            if not os.path.exists(fpath):
                print(f"  ⚠️ ไม่พบไฟล์ {fname}, ข้าม...")
                continue
                
            with open(fpath, mode="r", encoding="utf-8-sig", errors="replace") as fp:
                reader = csv.DictReader(fp)
                rows = list(reader)
                if not rows:
                    print(f"  ℹ️ ตาราง `{tbl_name}`: ไม่มีแถวข้อมูล")
                    continue
                
                headers = reader.fieldnames
                cols_str = ", ".join([f"`{h}`" for h in headers])
                params_str = ", ".join([f":{h}" for h in headers])
                insert_sql = text(f"INSERT INTO `{tbl_name}` ({cols_str}) VALUES ({params_str})")
                
                cleaned_rows = []
                for r in rows:
                    row_dict = {}
                    for k, v in r.items():
                        if v.strip() == "" or v == "None":
                            row_dict[k] = None
                        else:
                            row_dict[k] = v
                    cleaned_rows.append(row_dict)
                    
                conn.execute(insert_sql, cleaned_rows)
                conn.commit()
                print(f"  ✓ นำเข้าตาราง `{tbl_name}` สำเร็จ ({len(cleaned_rows)} แถว)")

        # Re-enable foreign key checks
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()

        print("\n🎉 นำเข้าข้อมูลขึ้น TiDB Cloud เสร็จสมบูรณ์ 100% พร้อมใช้งาน!")

except Exception as e:
    print(f"\n❌ เกิดข้อผิดพลาด: {e}")
    import traceback
    traceback.print_exc()
