from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

from database import engine, Base
import models
from routers import auth, companies, reviews, admin, jobs, community, notifications, reports

load_dotenv()

# Automatic lightweight migration for existing MySQL database tables
def run_migrations():
    with engine.connect() as conn:
        from sqlalchemy import text
        statements = [
            'ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE',
            'ALTER TABLE users ADD COLUMN avatar_url TEXT NULL',
            'ALTER TABLE users MODIFY COLUMN avatar_url TEXT NULL',
            'ALTER TABLE users MODIFY COLUMN role ENUM(\'student\', \'admin\', \'external\') DEFAULT \'student\'',
            'ALTER TABLE companies ADD COLUMN cover_image_url TEXT NULL',
            'ALTER TABLE companies ADD COLUMN description TEXT NULL',
            'ALTER TABLE employers ADD COLUMN logo_url TEXT NULL',
            'ALTER TABLE employers ADD COLUMN is_approved BOOLEAN DEFAULT FALSE',
            'ALTER TABLE reviews ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE community_posts ADD COLUMN status VARCHAR(20) DEFAULT \'pending\'',
            'ALTER TABLE community_posts ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE job_postings ADD COLUMN status VARCHAR(20) DEFAULT \'pending\'',
            'ALTER TABLE job_postings ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE upgrade_requests ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE upgrade_requests ADD COLUMN card_image_url LONGTEXT NULL',
            'ALTER TABLE upgrade_requests MODIFY COLUMN card_image_url LONGTEXT NULL',
            'ALTER TABLE review_photos MODIFY COLUMN url LONGTEXT NOT NULL',
            'ALTER TABLE reports ADD COLUMN job_id INT NULL',
            'ALTER TABLE reports ADD COLUMN company_id INT NULL',
            'ALTER TABLE reports ADD COLUMN comment_id INT NULL',
            'ALTER TABLE community_comments ADD COLUMN status VARCHAR(20) DEFAULT \'pending\'',
            'ALTER TABLE community_comments ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE reviews DROP COLUMN is_anonymous',
            'ALTER TABLE reviews DROP COLUMN anon_identity_enc',
            'ALTER TABLE community_posts DROP COLUMN is_anonymous',
            'ALTER TABLE community_posts DROP COLUMN anon_identity_enc',
            'ALTER TABLE community_comments DROP COLUMN is_anonymous',
            'ALTER TABLE community_comments DROP COLUMN anon_identity_enc',
        ]
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass
        conn.commit()

try:
    run_migrations()
except Exception:
    pass

# Create tables if not using Alembic CLI
Base.metadata.create_all(bind=engine)

app = FastAPI(title="HTC Insights API", version="1.0.0")

# CORS Configuration for Local and Cloud (Vercel / Render / Custom Domains)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
if allowed_origins_env:
    origins.extend([o.strip() for o in allowed_origins_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.onrender\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(jobs.router)
app.include_router(community.router)
app.include_router(notifications.router)
app.include_router(reports.router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """ Global exception handler — ทำให้ทุก unhandled exception ส่ง JSON response ที่มี CORS headers อยู่เสมอ """
    import traceback
    traceback.print_exc()
    origin = request.headers.get("origin", "")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
    return JSONResponse(
        status_code=500,
        content={"detail": "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาติดต่อผู้ดูแลระบบ"},
        headers=headers,
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "HTC Insights API"}
