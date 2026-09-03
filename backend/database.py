from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import os
import ssl
import re

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv()

raw_db_url = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/htc_insights")
raw_db_url = raw_db_url.strip().strip("'\"").strip()

# Strip any ssl query parameters for PyMySQL
if "?" in raw_db_url:
    base_url = raw_db_url.split("?")[0]
else:
    base_url = raw_db_url

if base_url.startswith("mysql://"):
    base_url = "mysql+pymysql://" + base_url[len("mysql://"):]

if "tidbcloud.com" in base_url and re.search(r":4000/?(?=\?|$)", base_url):
    base_url = re.sub(r":4000/?(?=\?|$)", r":4000/test", base_url)

DATABASE_URL = base_url

def create_db_engine():
    """ สร้าง SQLAlchemy Engine สำหรับการเชื่อมต่อฐานข้อมูล """
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

    connect_args = {}
    if "tidbcloud.com" in DATABASE_URL or "ssl" in DATABASE_URL.lower():
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx

    connect_args["charset"] = "utf8mb4"

    try:
        eng = create_engine(
            DATABASE_URL,
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_recycle=300,
        )
        with eng.connect() as conn:
            pass
        print(f"[OK] Database connected to TiDB/MySQL: {DATABASE_URL.split('@')[-1]}")
        return eng
    except Exception as e:
        print(f"[Database Error] TiDB/MySQL connection failed: {e}")
        print(f"[Database Warning] Falling back to local SQLite database (sqlite:///./htc_insights.db)")
        return create_engine(
            "sqlite:///./htc_insights.db",
            connect_args={"check_same_thread": False},
        )

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
