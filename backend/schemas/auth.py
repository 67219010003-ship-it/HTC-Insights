from pydantic import BaseModel, EmailStr, field_validator

class StudentRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    department: str
    level: str  # "pvc" or "pvs"

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
    email: EmailStr
    password: str = "default_password123"
    company_name: str
    address: str
    industry: str = "ทั่วไป"
    contact_person: str | None = None
    phone: str | None = None
    line_id: str | None = None
    website: str | None = None
    departments: list[str] | None = None
    daily_allowance: str | None = None
    benefits: str | None = None
    notes: str | None = None
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
