import bcrypt
import re
import secrets
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "badminton-secret-key-v2-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
BCRYPT_COST_FACTOR = 12

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)


def generate_session_token() -> str:
    return secrets.token_hex(16)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    payload = data.copy()
    payload["type"] = "access"
    payload["exp"] = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    payload["type"] = "refresh"
    payload["exp"] = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def verify_refresh_token(token: str) -> dict | None:
    payload = decode_token(token)
    if payload and payload.get("type") == "refresh":
        return payload
    return None


def hash_password(password: str) -> str:
    password_bytes = password.encode()[:72]
    salt = bcrypt.gensalt(rounds=BCRYPT_COST_FACTOR)
    return bcrypt.hashpw(password_bytes, salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode()[:72], hashed.encode())
    except Exception:
        return False


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    return True, ""


def create_token(data: dict) -> str:
    """Legacy token creation."""
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        return None
    payload = decode_token(token)
    if payload and payload.get("type") == "access":
        return payload
    return None


def require_auth(token: str = Depends(oauth2_scheme)):
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_admin(token: str = Depends(oauth2_scheme)):
    user = get_current_user(token)
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user
