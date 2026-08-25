from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import os

load_dotenv()

# กำหนด URL ของฐานข้อมูล MySQL จาก environment variables
raw_db_url = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/htc_insights")
raw_db_url = raw_db_url.strip().strip("'\"").strip()

if raw_db_url.startswith("mysql://"):
    raw_db_url = "mysql+pymysql://" + raw_db_url[len("mysql://"):]

# Ensure default database name '/test' is present for TiDB Cloud Serverless
if "tidbcloud.com" in raw_db_url:
    import re
    # If there is no database name between port 4000 and ? or end of string
    if re.search(r":4000/?(?=\?|$)", raw_db_url):
        raw_db_url = re.sub(r":4000/?(?=\?|$)", r":4000/test", raw_db_url)

DATABASE_URL = raw_db_url

def create_db_engine():
    """ สร้าง SQLAlchemy Engine สำหรับการเชื่อมต่อฐานข้อมูล (รองรับทั้ง SQLite และ MySQL) """
    if os.getenv("TESTING") == "1":
        return create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    
    if DATABASE_URL.startswith("sqlite"):
        return create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
        )

    # Auto-detect cloud SSL requirements (e.g. TiDB Cloud / Aiven)
    connect_args = {}
    if "tidbcloud.com" in DATABASE_URL or "ssl" in DATABASE_URL.lower():
        ca_path = "/etc/ssl/certs/ca-certificates.crt"
        if os.path.exists(ca_path):
            connect_args["ssl"] = {"ca": ca_path}
        else:
            connect_args["ssl"] = {}

    try:
        eng = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        print(f"[Database Warning] MySQL connection failed. Falling back to local SQLite database (sqlite:///./htc_insights.db)")
        return create_engine(
            "sqlite:///./htc_insights.db",
            connect_args={"check_same_thread": False},
        )

# สร้าง Engine และ Session Factory สำหรับจัดการธุรกรรมฐานข้อมูล
engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    """ คลาสฐานสำหรับประกาศโมเดลตารางฐานข้อมูลทั้งหมด """
    pass

def get_db():
    """ Dependency injection สำหรับสร้างและปิด Session ของฐานข้อมูลในแต่ละ Request อัตโนมัติ """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
