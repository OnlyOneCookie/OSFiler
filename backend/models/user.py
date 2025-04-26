"""
User model.

This module defines the User model that represents users in the system.
It provides methods for user creation, authentication, and management.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.core.database import Base, get_db
from backend.core.security import get_password_hash, verify_password, create_access_token

# Configure logger
logger = logging.getLogger(__name__)

class UserModel(Base):
    """
    SQLAlchemy model for users table.
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True)
    full_name = Column(String)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = created_at
    last_login = Column(DateTime(timezone=True))
    
    # Define relationships to other models
    investigations = relationship("InvestigationModel", back_populates="created_by_user")

class User:
    """
    User model for OSFiler.
    
    This class represents a user in the system and provides methods for
    user creation, authentication, and management.
    
    Attributes:
        id (str): The unique identifier for the user.
        username (str): The username for login.
        password_hash (str): The hashed password.
        email (Optional[str]): The user's email address.
        full_name (Optional[str]): The user's full name.
        is_admin (bool): Whether the user is an administrator.
        is_active (bool): Whether the user is active.
        created_at (datetime): When the user was created.
        updated_at (datetime): When the user was last updated.
        last_login (Optional[datetime]): When the user last logged in.
    """
    
    def __init__(
        self,
        id: str,
        username: str,
        password_hash: str,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        is_admin: bool = False,
        is_active: bool = True,
        created_at: datetime = None,
        updated_at: datetime = None,
        last_login: Optional[datetime] = None
    ):
        """
        Initialize a user instance.
        
        Args:
            id (str): The unique identifier for the user.
            username (str): The username for login.
            password_hash (str): The hashed password.
            email (Optional[str]): The user's email address.
            full_name (Optional[str]): The user's full name.
            is_admin (bool): Whether the user is an administrator.
            is_active (bool): Whether the user is active.
            created_at (datetime): When the user was created.
            updated_at (datetime): When the user was last updated.
            last_login (Optional[datetime]): When the user last logged in.
        """
        self.id = id
        self.username = username
        self.password_hash = password_hash
        self.email = email
        self.full_name = full_name
        self.is_admin = is_admin
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.last_login = last_login
    
    @classmethod
    def from_model(cls, model: UserModel) -> 'User':
        """
        Create a User instance from a SQLAlchemy model.
        
        Args:
            model (UserModel): SQLAlchemy user model.
        
        Returns:
            User: A new User instance.
        """
        # Extract primitive values from SQLAlchemy objects to avoid 
        # "Boolean value of this clause is not defined" error
        created_at = model.created_at
        if created_at is not None and not isinstance(created_at, datetime):
            created_at = datetime.utcnow()
            
        # Since updated_at is the same as created_at in our database schema
        updated_at = created_at
            
        return cls(
            id=str(model.id),
            username=model.username,
            password_hash=model.password_hash,
            email=model.email,
            full_name=model.full_name,
            is_admin=model.is_admin,
            is_active=model.is_active,
            created_at=created_at,
            updated_at=updated_at,
            last_login=model.last_login
        )
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """
        Create a User instance from a dictionary.
        
        Args:
            data (Dict[str, Any]): Dictionary containing user data.
        
        Returns:
            User: A new User instance.
        """
        # Convert ISO format strings to datetime objects
        created_at = data.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
        updated_at = data.get('updated_at')
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            
        last_login = data.get('last_login')
        if isinstance(last_login, str):
            last_login = datetime.fromisoformat(last_login.replace('Z', '+00:00'))
        
        return cls(
            id=data.get('id'),
            username=data.get('username'),
            password_hash=data.get('password_hash'),
            email=data.get('email'),
            full_name=data.get('full_name'),
            is_admin=data.get('is_admin', False),
            is_active=data.get('is_active', True),
            created_at=created_at,
            updated_at=updated_at,
            last_login=last_login
        )
    
    def to_dict(self, include_password: bool = False) -> Dict[str, Any]:
        """
        Convert the User instance to a dictionary.
        
        Args:
            include_password (bool): Whether to include the password hash.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the user.
        """
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'is_admin': self.is_admin,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        
        if self.last_login:
            data['last_login'] = self.last_login.isoformat()
        
        if include_password:
            data['password_hash'] = self.password_hash
        
        return data
    
    @staticmethod
    def create(
        username: str,
        password: str,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        is_admin: bool = False
    ) -> 'User':
        """
        Create a new user in the database.
        
        Args:
            username (str): The username for login.
            password (str): The plain-text password.
            email (Optional[str]): The user's email address.
            full_name (Optional[str]): The user's full name.
            is_admin (bool): Whether the user is an administrator.
        
        Returns:
            User: The created user.
            
        Raises:
            ValueError: If a user with the username already exists.
        """
        db = next(get_db())
        
        try:
            # Check if user already exists
            existing_user = db.query(UserModel).filter_by(username=username).first()
            
            if existing_user:
                raise ValueError(f"User with username '{username}' already exists")
            
            # Create a new user
            new_user = UserModel(
                username=username,
                password_hash=get_password_hash(password),
                email=email,
                full_name=full_name,
                is_admin=is_admin
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            logger.info(f"Created new user: {username}")
            return User.from_model(new_user)
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating user: {str(e)}")
            raise
        finally:
            db.close()
    
    @staticmethod
    def get_by_id(user_id: str) -> Optional['User']:
        """
        Get a user by ID.
        
        Args:
            user_id (str): The user ID.
        
        Returns:
            Optional[User]: The user if found, None otherwise.
        """
        db = next(get_db())
        
        try:
            user = db.query(UserModel).filter_by(id=user_id).first()
            
            if user:
                return User.from_model(user)
            
            return None
        except Exception as e:
            logger.error(f"Error retrieving user {user_id}: {str(e)}")
            return None
        finally:
            db.close()
    
    @staticmethod
    def get_by_username(username: str) -> Optional['User']:
        """
        Get a user by username.
        
        Args:
            username (str): The username.
        
        Returns:
            Optional[User]: The user if found, None otherwise.
        """
        db = next(get_db())
        
        try:
            user = db.query(UserModel).filter_by(username=username).first()
            
            if user:
                return User.from_model(user)
            
            return None
        except Exception as e:
            logger.error(f"Error retrieving user by username {username}: {str(e)}")
            return None
        finally:
            db.close()
    
    @staticmethod
    def authenticate(username: str, password: str) -> Optional['User']:
        """
        Authenticate a user with username and password.
        
        Args:
            username (str): The username.
            password (str): The plain-text password.
        
        Returns:
            Optional[User]: The authenticated user if successful, None otherwise.
        """
        user = User.get_by_username(username)
        
        if not user:
            logger.warning(f"Authentication failed: User {username} not found")
            return None
        
        if not user.is_active:
            logger.warning(f"Authentication failed: User {username} is inactive")
            return None
        
        if not verify_password(password, user.password_hash):
            logger.warning(f"Authentication failed: Invalid password for user {username}")
            return None
        
        # Update last login time
        user.update_last_login()
        
        logger.info(f"User {username} authenticated successfully")
        return user
    
    def update(self, data: Dict[str, Any]) -> bool:
        """
        Update the user with new data.
        
        Args:
            data (Dict[str, Any]): Data to update.
        
        Returns:
            bool: True if update was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            user = db.query(UserModel).filter_by(id=self.id).first()
            
            if not user:
                logger.error(f"User {self.id} not found for update")
                return False
            
            # Update fields
            if 'email' in data:
                user.email = data['email']
                self.email = data['email']
                
            if 'full_name' in data:
                user.full_name = data['full_name']
                self.full_name = data['full_name']
                
            if 'is_admin' in data:
                user.is_admin = data['is_admin']
                self.is_admin = data['is_admin']
                
            if 'is_active' in data:
                user.is_active = data['is_active']
                self.is_active = data['is_active']
                
            if 'password' in data:
                user.password_hash = get_password_hash(data['password'])
                self.password_hash = user.password_hash
            
            # Update timestamps
            user.updated_at = datetime.utcnow()
            self.updated_at = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Updated user: {self.username}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating user {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    def update_last_login(self) -> bool:
        """
        Update the user's last login time.
        
        Returns:
            bool: True if update was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            user = db.query(UserModel).filter_by(id=self.id).first()
            
            if not user:
                logger.error(f"User {self.id} not found for last login update")
                return False
            
            # Update last login time
            now = datetime.utcnow()
            user.last_login = now
            user.updated_at = now
            
            # Update instance
            self.last_login = now
            self.updated_at = now
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating last login for user {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    def delete(self) -> bool:
        """
        Delete the user.
        
        Returns:
            bool: True if deletion was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            user = db.query(UserModel).filter_by(id=self.id).first()
            
            if not user:
                logger.error(f"User {self.id} not found for deletion")
                return False
            
            db.delete(user)
            db.commit()
            
            logger.info(f"Deleted user: {self.username}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting user {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    def create_token(self) -> str:
        """
        Create an authentication token for the user.
        
        Returns:
            str: The JWT token.
        """
        token_data = {
            "sub": self.id,
            "username": self.username,
            "is_admin": self.is_admin
        }
        
        return create_access_token(token_data)
    
    @staticmethod
    def get_all(skip: int = 0, limit: int = 100) -> List['User']:
        """
        Get all users with pagination.
        
        Args:
            skip (int): Number of users to skip.
            limit (int): Maximum number of users to return.
        
        Returns:
            List[User]: List of users.
        """
        db = next(get_db())
        
        try:
            users = db.query(UserModel).order_by(UserModel.username).offset(skip).limit(limit).all()
            
            return [User.from_model(user) for user in users]
        except Exception as e:
            logger.error(f"Error retrieving users: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def count() -> int:
        """
        Get the total number of users.
        
        Returns:
            int: The number of users.
        """
        db = next(get_db())
        
        try:
            count = db.query(func.count(UserModel.id)).scalar() or 0
            return count
        except Exception as e:
            logger.error(f"Error counting users: {str(e)}")
            return 0
        finally:
            db.close()
    
    @staticmethod
    def count_admins() -> int:
        """
        Get the total number of admin users.
        
        Returns:
            int: The number of admin users.
        """
        db = next(get_db())
        
        try:
            count = db.query(func.count(UserModel.id)).filter(UserModel.is_admin == True).scalar() or 0
            return count
        except Exception as e:
            logger.error(f"Error counting admin users: {str(e)}")
            return 0
        finally:
            db.close()
    
    @staticmethod
    def get_model_class():
        """
        Get the SQLAlchemy model class associated with this domain model.
        
        Returns:
            Type[UserModel]: The UserModel class
        """
        return UserModel