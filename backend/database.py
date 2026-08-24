from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import os

load_dotenv()

# กำหนด URL ของฐานข้อมูล MySQL จาก environment variables (ค่าเริ่มต้นคือ root:@localhost/htc_insights)
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/htc_insights")

def create_db_engine():
    """ สร้าง SQLAlchemy Engine สำหรับการเชื่อมต่อฐานข้อมูล (รองรับทั้ง SQLite สำหรับการทดสอบ และ MySQL) """
    if os.getenv("TESTING") == "1":
        return create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    
    # เชื่อมต่อตรงกับฐานข้อมูล MySQL ของระบบจริง
    return create_engine(DATABASE_URL, pool_pre_ping=True)

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
