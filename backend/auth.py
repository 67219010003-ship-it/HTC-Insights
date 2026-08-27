import os
import base64
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext
from cryptography.fernet import Fernet

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "htc-insights-secret-key-32-characters-min-safe-jwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    secret = os.getenv("SECRET_KEY", SECRET_KEY)
    return jwt.encode(to_encode, secret, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    secret = os.getenv("SECRET_KEY", SECRET_KEY)
    return jwt.decode(token, secret, algorithms=[ALGORITHM])

def _get_fernet() -> Fernet:
    secret = os.getenv("SECRET_KEY", SECRET_KEY)
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)

def encrypt_identity(user_id: int) -> str:
    f = _get_fernet()
    return f.encrypt(str(user_id).encode()).decode()

def decrypt_identity(token: str) -> int:
    f = _get_fernet()
    return int(f.decrypt(token.encode()).decode())
