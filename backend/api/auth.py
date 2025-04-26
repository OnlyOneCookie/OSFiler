"""
Authentication API endpoints.

This module provides API endpoints for user authentication, including
login, logout, and registration.
"""

import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, EmailStr, validator

from backend.core.security import get_current_user, verify_password
from backend.models import User

# Configure logger
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix="/auth", tags=["authentication"])

# Admin user dependency
async def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Dependency that checks if the current user is an admin.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The current user if they are an admin.
        
    Raises:
        HTTPException: If the user is not an admin.
    """
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin privileges required."
        )
    return current_user

# Define API models
class Token(BaseModel):
    """Token response model."""
    access_token: str
    token_type: str
    user_id: str
    username: str
    is_admin: bool


class UserCreate(BaseModel):
    """User creation model."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)

    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v


class UserLogin(BaseModel):
    """User login model."""
    username: str
    password: str


class UserResponse(BaseModel):
    """User response model."""
    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_admin: bool
    is_active: bool
    created_at: str
    last_login: Optional[str] = None


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Dict[str, Any]:
    """
    Authenticate user and return a JWT token.
    
    Args:
        form_data (OAuth2PasswordRequestForm): The login form data.
    
    Returns:
        Dict[str, Any]: The authentication response.
        
    Raises:
        HTTPException: If authentication fails.
    """
    user = User.authenticate(form_data.username, form_data.password)
    
    if not user:
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate JWT token
    token = user.create_token()
    
    logger.info(f"User {user.username} logged in successfully")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "is_admin": user.is_admin
    }


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate) -> Dict[str, Any]:
    """
    Register a new user.
    
    Args:
        user_data (UserCreate): The user registration data.
    
    Returns:
        Dict[str, Any]: The created user data.
        
    Raises:
        HTTPException: If a user with the username already exists.
    """
    try:
        # Check if username already exists
        existing_user = User.get_by_username(user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already registered"
            )
        
        # Create new user
        user = User.create(
            username=user_data.username,
            password=user_data.password,
            email=user_data.email,
            full_name=user_data.full_name
        )
        
        logger.info(f"New user registered: {user.username}")
        
        return user.to_dict()
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user account"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get the current authenticated user's information.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The user data.
        
    Raises:
        HTTPException: If the user does not exist.
    """
    user = User.get_by_id(current_user["id"])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user.to_dict()


@router.post("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Change the current user's password.
    
    Args:
        old_password (str): The current password.
        new_password (str): The new password.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: A success message.
        
    Raises:
        HTTPException: If the old password is incorrect.
    """
    # Get the user
    user = User.get_by_id(current_user["id"])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify old password
    if not verify_password(old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Validate new password
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    # Update password
    success = user.update({"password": new_password})
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    logger.info(f"Password changed for user: {user.username}")
    
    return {"message": "Password changed successfully"}


@router.get("/refresh-token", response_model=Token)
async def refresh_token(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Refresh the user's authentication token.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The new authentication token.
    """
    # Get the user
    user = User.get_by_id(current_user["id"])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate new token
    token = user.create_token()
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "is_admin": user.is_admin
    }


@router.post("/create-admin", response_model=UserResponse)
async def create_admin_user(
    admin_data: UserCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new admin user (admin-only endpoint).
    
    Args:
        admin_data (UserCreate): The admin user data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The created admin user data.
        
    Raises:
        HTTPException: If the current user is not an admin.
    """
    # Get the user
    user = User.get_by_id(current_user["id"])
    
    if not user or not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create admin accounts"
        )
    
    try:
        # Check if username already exists
        existing_user = User.get_by_username(admin_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already registered"
            )
        
        # Create new admin user
        admin = User.create(
            username=admin_data.username,
            password=admin_data.password,
            email=admin_data.email,
            full_name=admin_data.full_name,
            is_admin=True
        )
        
        logger.info(f"New admin user created: {admin.username}")
        
        return admin.to_dict()
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating admin user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating admin user account"
        )