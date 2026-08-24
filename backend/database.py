from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import os

load_dotenv()

# กำหนด URL ของฐานข้อมูล MySQL จาก environment variables
raw_db_url = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/htc_insights")
if raw_db_url.startswith("mysql://"):
    DATABASE_URL = raw_db_url.replace("mysql://", "mysql+pymysql://", 1)
else:
    DATABASE_URL = raw_db_url

def create_db_engine():
    """ สร้าง SQLAlchemy Engine สำหรับการเชื่อมต่อฐานข้อมูล (รองรับทั้ง SQLite สำหรับการทดสอบ และ MySQL) """
    if os.getenv("TESTING") == "1":
        return create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    
    # Auto-detect cloud SSL requirements (e.g. TiDB Cloud / Aiven)
    connect_args = {}
    if "tidbcloud.com" in DATABASE_URL or "ssl" in DATABASE_URL.lower():
        ca_path = "/etc/ssl/certs/ca-certificates.crt"
        if os.path.exists(ca_path):
            connect_args["ssl"] = {"ca": ca_path}
        else:
            connect_args["ssl"] = {}

    # เชื่อมต่อตรงกับฐานข้อมูล MySQL ของระบบจริง
    return create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

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
