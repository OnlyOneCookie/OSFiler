"""
Security module.

This module provides functions for password hashing, verification, and
JWT token generation and validation for authentication.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

from backend.core.config import get_settings

# Configure logger
logger = logging.getLogger(__name__)

# Get security settings
security_settings = get_settings("security")
SECRET_KEY = security_settings["secret_key"]
ALGORITHM = security_settings["algorithm"]
ACCESS_TOKEN_EXPIRE_MINUTES = security_settings["access_token_expire_minutes"]

# Setup password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    
    Args:
        plain_password (str): The plain-text password.
        hashed_password (str): The hashed password.
        
    Returns:
        bool: True if the password matches the hash, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Generate a hash for a password.
    
    Args:
        password (str): The plain-text password.
        
    Returns:
        str: The hashed password.
    """
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data (Dict[str, Any]): The data to encode in the token.
        expires_delta (Optional[timedelta]): The token expiration time.
            If None, defaults to ACCESS_TOKEN_EXPIRE_MINUTES from settings.
            
    Returns:
        str: The encoded JWT token.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create access token"
        )

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode a JWT token.
    
    Args:
        token (str): The JWT token to decode.
        
    Returns:
        Dict[str, Any]: The decoded token data.
        
    Raises:
        HTTPException: If the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        logger.warning("Invalid token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    Get the current authenticated user from a JWT token.
    
    Args:
        token (str): The JWT token from the request.
        
    Returns:
        Dict[str, Any]: The user data from the token.
        
    Raises:
        HTTPException: If authentication fails.
    """
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        if user_id is None:
            logger.warning("Token missing 'sub' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token content",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return {
            "id": user_id, 
            "username": payload.get("username"),
            "is_admin": payload.get("is_admin", False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_current_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def generate_password_reset_token(email: str) -> str:
    """
    Generate a password reset token.
    
    Args:
        email (str): The user's email address.
        
    Returns:
        str: The password reset token.
    """
    delta = timedelta(hours=1)  # Password reset tokens valid for 1 hour
    return create_access_token(
        data={"sub": email, "type": "password_reset"},
        expires_delta=delta
    )

def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify a password reset token.
    
    Args:
        token (str): The password reset token.
        
    Returns:
        Optional[str]: The user's email if token is valid, None otherwise.
    """
    try:
        payload = decode_token(token)
        
        if payload.get("type") != "password_reset":
            logger.warning("Invalid token type for password reset")
            return None
            
        return payload.get("sub")
        
    except HTTPException:
        return None
    except Exception as e:
        logger.error(f"Error in verify_password_reset_token: {str(e)}")
        return None

def hash_username(username: str) -> str:
    """
    Create a deterministic hash for a username.
    
    This is useful for creating identifiers for username lookups
    without exposing the actual username.
    
    Args:
        username (str): The username to hash.
        
    Returns:
        str: The hashed username.
    """
    # Use a simple hash approach for usernames
    # This is not for security, just for creating deterministic IDs
    import hashlib
    return hashlib.md5(username.lower().encode()).hexdigest()

def create_api_key(user_id: str, name: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create an API key for programmatic access.
    
    Args:
        user_id (str): The ID of the user.
        name (str): A name/description for the API key.
        expires_delta (Optional[timedelta]): The key expiration time.
            If None, creates a key valid for 1 year.
            
    Returns:
        str: The API key.
    """
    if expires_delta is None:
        # Default to 1 year
        expires_delta = timedelta(days=365)
        
    data = {
        "sub": user_id,
        "type": "api_key",
        "name": name,
    }
    
    return create_access_token(data=data, expires_delta=expires_delta)

def is_valid_api_key(api_key: str) -> bool:
    """
    Check if an API key is valid.
    
    Args:
        api_key (str): The API key to check.
        
    Returns:
        bool: True if the API key is valid, False otherwise.
    """
    try:
        payload = decode_token(api_key)
        return payload.get("type") == "api_key"
    except:
        return False

async def get_current_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get the current authenticated user and verify they have admin privileges.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
        
    Returns:
        Dict[str, Any]: The user data, if the user is an admin.
        
    Raises:
        HTTPException: If the user is not an admin.
    """
    if not current_user.get("is_admin", False):
        logger.warning(f"Non-admin user {current_user.get('username')} attempted to access admin endpoint")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required for this action",
        )
    
    return current_user