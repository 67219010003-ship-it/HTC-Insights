from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
            'ALTER TABLE reviews ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE community_posts ADD COLUMN status VARCHAR(20) DEFAULT \'pending\'',
            'ALTER TABLE community_posts ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE job_postings ADD COLUMN status VARCHAR(20) DEFAULT \'pending\'',
            'ALTER TABLE job_postings ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE upgrade_requests ADD COLUMN rejection_reason TEXT NULL',
            'ALTER TABLE upgrade_requests ADD COLUMN card_image_url VARCHAR(500) NULL',
            'ALTER TABLE reports ADD COLUMN job_id INT NULL',
            'ALTER TABLE reports ADD COLUMN company_id INT NULL',
            'ALTER TABLE reports ADD COLUMN comment_id INT NULL',
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

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "HTC Insights API"}
