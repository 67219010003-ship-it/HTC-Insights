from sqlalchemy import (Column, Integer, String, Text, Boolean, Float,
                        DateTime, ForeignKey, Enum, Date)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum

class UserRole(str, enum.Enum):
    """ บทบาทประเภทของผู้ใช้งานระบบ """
    student = "student"
    admin = "admin"
    external = "external"

class Gender(str, enum.Enum):
    """ เพศสภาพ """
    male = "male"
    female = "female"
    prefer_not = "prefer_not"

class ReviewStatus(str, enum.Enum):
    """ สถานะการตรวจสอบและอนุมัติรีวิว """
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class UpgradeRequestStatus(str, enum.Enum):
    """ สถานะคำขอยืนยันสิทธิ์นักศึกษา """
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class PostType(str, enum.Enum):
    """ ประเภทของกระทู้ชุมชน """
    experience = "experience"
    qa = "qa"
    tips = "tips"
    team = "team"

class User(Base):
    """ ตารางเก็บข้อมูลบัญชีผู้ใช้งานระบบ (นักศึกษา, ผู้ดูแลระบบ, บุคคลภายนอก) """
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student)
    is_super_admin = Column(Boolean, default=False)
    department = Column(String(100))
    level = Column(String(255))
    is_verified = Column(Boolean, default=False)
    verify_token = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    reviews = relationship("Review", back_populates="user")
    community_posts = relationship("CommunityPost", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class Employer(Base):
    """ ตารางเก็บข้อมูลบัญชีตัวแทนสถานประกอบการ """
    __tablename__ = "employers"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=False)
    address = Column(Text)
    industry = Column(String(100))
    logo_url = Column(String(500))
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    postings = relationship("JobPosting", back_populates="employer")

class Company(Base):
    """ ตารางเก็บหมุดและข้อมูลสถานที่/บริษัทฝึกงาน """
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    address = Column(Text)
    industry = Column(String(100))
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)
    employer_id = Column(Integer, ForeignKey("employers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    reviews = relationship("Review", back_populates="company")

class Review(Base):
    """ ตารางเก็บข้อมูลรีวิวประสบการณ์ฝึกงานของนักศึกษา """
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gender = Column(Enum(Gender), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    department = Column(String(100))
    daily_allowance = Column(Integer)
    has_accommodation = Column(Boolean, default=False)
    has_transport = Column(Boolean, default=False)
    work_start_time = Column(String(50), nullable=True)
    work_end_time = Column(String(50), nullable=True)
    score_overall = Column(Float, nullable=False)
    score_work = Column(Float)
    score_env = Column(Float)
    score_mentor = Column(Float)
    score_welfare = Column(Float)
    text_work = Column(Text, nullable=False)
    text_pros = Column(Text)
    text_cons = Column(Text)
    text_advice = Column(Text)
    is_anonymous = Column(Boolean, default=False)
    anon_identity_enc = Column(String(500), nullable=True)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.pending)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="reviews")
    company = relationship("Company", back_populates="reviews")
    photos = relationship("ReviewPhoto", back_populates="review")

class ReviewPhoto(Base):
    """ ตารางเก็บรูปภาพประกอบรีวิว (แนบกับรีวิวการฝึกงาน) """
    __tablename__ = "review_photos"
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False)
    url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    review = relationship("Review", back_populates="photos")

class JobPosting(Base):
    """ ตารางเก็บข้อมูลการประกาศงานรับสมัครนักศึกษาฝึกงาน """
    __tablename__ = "job_postings"
    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("employers.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    title = Column(String(255), nullable=False)
    department = Column(String(100))
    description = Column(Text)
    daily_allowance = Column(Integer)
    location = Column(String(255))
    deadline = Column(Date)
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="pending")
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    employer = relationship("Employer", back_populates="postings")

class CommunityPost(Base):
    """ ตารางเก็บข้อมูลกระทู้เว็บบอร์ดคอมมูนิตี้แลกเปลี่ยนความคิดเห็น """
    __tablename__ = "community_posts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(PostType), nullable=False)
    department = Column(String(100))
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_anonymous = Column(Boolean, default=False)
    anon_identity_enc = Column(String(500), nullable=True)
    is_pinned = Column(Boolean, default=False)
    status = Column(String(20), default="pending")
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="community_posts")
    comments = relationship("CommunityComment", back_populates="post")
    likes = relationship("CommunityLike", back_populates="post")

class CommunityComment(Base):
    """ ตารางความคิดเห็นใต้กระทู้ในคอมมูนิตี้ """
    __tablename__ = "community_comments"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("community_comments.id"), nullable=True)
    content = Column(Text, nullable=False)
    is_anonymous = Column(Boolean, default=False)
    anon_identity_enc = Column(String(500), nullable=True)
    is_best_answer = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    post = relationship("CommunityPost", back_populates="comments")
    likes = relationship("CommunityLike", back_populates="comment")

class CommunityLike(Base):
    """ ตารางการกดถูกใจ (Like) กระทู้หรือความคิดเห็น """
    __tablename__ = "community_likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=True)
    comment_id = Column(Integer, ForeignKey("community_comments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    post = relationship("CommunityPost", back_populates="likes")
    comment = relationship("CommunityComment", back_populates="likes")

class Notification(Base):
    """ ตารางการแจ้งเตือนระบบสำหรับบัญชีผู้ใช้งาน """
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    link = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class Report(Base):
    """ ตารางเก็บบันทึกคำร้องเรียน/รายงานเนื้อหาที่ไม่เหมาะสม """
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=True)
    comment_id = Column(Integer, ForeignKey("community_comments.id"), nullable=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    """ ตารางบันทึกประวัติการตัดสินใจและการทำงานของผู้ดูแลระบบ (Admin Audit Logs) """
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50))
    target_id = Column(Integer)
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    admin = relationship("User")

class UpgradeRequest(Base):
    """ ตารางคำร้องขอรับหลักฐานเพื่อยืนยันสิทธิ์นักศึกษา วท.หาดใหญ่ """
    __tablename__ = "upgrade_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(String(50), nullable=False)
    department = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(Enum(UpgradeRequestStatus), default=UpgradeRequestStatus.pending)
    rejection_reason = Column(Text, nullable=True)
    card_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
