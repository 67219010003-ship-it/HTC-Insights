from pydantic import BaseModel, EmailStr, Field, field_validator
import re

class StudentRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100, description="รหัสผ่านอย่างน้อย 8 ตัวอักษร")
    name: str = Field(..., min_length=2, max_length=100, description="ชื่อ-นามสกุล 2-100 ตัวอักษร")
    department: str = Field(..., min_length=2, max_length=100)
    level: str = Field(..., pattern=r"^(pvc|pvs|btech)$", description="ระดับชั้น pvc, pvs หรือ btech")

    @field_validator("email")
    @classmethod
    def must_be_htc_email(cls, v):
        if not v.endswith("@htc.ac.th"):
            raise ValueError("ต้องใช้อีเมล @htc.ac.th เท่านั้น")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
        return v

class EmployerRegister(BaseModel):
    email: EmailStr | None = None
    contact_email: EmailStr | None = None
    password: str = Field("default_password123", min_length=8, max_length=100)
    company_name: str = Field(..., min_length=3, max_length=150, description="ชื่อสถานประกอบการ 3-150 ตัวอักษร")
    address: str = Field(..., min_length=5, max_length=300, description="ที่อยู่ 5-300 ตัวอักษร")
    industry: str = Field("ทั่วไป", max_length=100)
    contact_person: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=30)
    line_id: str | None = Field(None, max_length=100)
    website: str | None = Field(None, max_length=200)
    departments: list[str] | None = None
    daily_allowance: str | None = Field(None, max_length=50)
    benefits: str | None = Field(None, max_length=300)
    notes: str | None = Field(None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # "student" or "employer"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
