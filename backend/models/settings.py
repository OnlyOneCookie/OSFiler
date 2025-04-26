"""
Settings model.

This module defines the Settings model that represents system and user settings.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

from sqlalchemy import Column, String, DateTime, func, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from backend.core.database import Base, get_db

# Configure logger
logger = logging.getLogger(__name__)

class SettingsModel(Base):
    """
    SQLAlchemy model for settings table.
    """
    __tablename__ = "settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(JSONB, nullable=False)
    description = Column(Text)
    category = Column(String, index=True)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), default=func.now())

class Settings:
    """
    Settings model for OSFiler.
    
    This class provides methods for retrieving and managing application settings.
    Each setting has a unique key, a value (which can be a complex object),
    and optional metadata.
    
    Attributes:
        id (str): The unique identifier for the setting.
        key (str): The unique key for the setting.
        value (Any): The value of the setting (can be any JSON-serializable object).
        description (Optional[str]): A description of the setting.
        category (Optional[str]): The category the setting belongs to.
        updated_at (datetime): When the setting was last updated.
        created_at (datetime): When the setting was created.
    """
    
    def __init__(
        self,
        id: str,
        key: str,
        value: Any,
        description: Optional[str] = None,
        category: Optional[str] = None,
        updated_at: datetime = None,
        created_at: datetime = None,
    ):
        """
        Initialize a settings instance.
        
        Args:
            id (str): The unique identifier for the setting.
            key (str): The unique key for the setting.
            value (Any): The value of the setting.
            description (Optional[str]): A description of the setting.
            category (Optional[str]): The category the setting belongs to.
            updated_at (datetime): When the setting was last updated.
            created_at (datetime): When the setting was created.
        """
        self.id = id
        self.key = key
        self.value = value
        self.description = description
        self.category = category
        self.updated_at = updated_at or datetime.utcnow()
        self.created_at = created_at or datetime.utcnow()
    
    @classmethod
    def from_model(cls, model: SettingsModel) -> 'Settings':
        """
        Create a Settings instance from a SQLAlchemy model.
        
        Args:
            model (SettingsModel): SQLAlchemy settings model.
        
        Returns:
            Settings: A new Settings instance.
        """
        return cls(
            id=str(model.id),
            key=model.key,
            value=model.value,
            description=model.description,
            category=model.category,
            updated_at=model.updated_at,
            created_at=model.created_at
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the Settings instance to a dictionary.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the settings.
        """
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'category': self.category,
            'updated_at': self.updated_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }
    
    @staticmethod
    def get(key: str, default: Any = None) -> Any:
        """
        Get a setting by key.
        
        Args:
            key (str): The setting key.
            default (Any): Default value if setting not found.
        
        Returns:
            Any: The setting value, or default if not found.
        """
        db = next(get_db())
        
        try:
            setting = db.query(SettingsModel).filter_by(key=key).first()
            
            if setting:
                return setting.value
            
            return default
        except Exception as e:
            logger.error(f"Error retrieving setting {key}: {str(e)}")
            return default
        finally:
            db.close()
    
    @staticmethod
    def set(
        key: str, 
        value: Any, 
        description: Optional[str] = None,
        category: Optional[str] = None
    ) -> bool:
        """
        Set a setting value. Creates the setting if it doesn't exist.
        
        Args:
            key (str): The setting key.
            value (Any): The setting value.
            description (Optional[str]): A description of the setting.
            category (Optional[str]): The category the setting belongs to.
        
        Returns:
            bool: True if successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            setting = db.query(SettingsModel).filter_by(key=key).first()
            
            if setting:
                # Update existing setting
                setting.value = value
                
                if description is not None:
                    setting.description = description
                
                if category is not None:
                    setting.category = category
                
                setting.updated_at = datetime.utcnow()
            else:
                # Create new setting
                new_setting = SettingsModel(
                    key=key,
                    value=value,
                    description=description,
                    category=category
                )
                db.add(new_setting)
            
            db.commit()
            logger.info(f"Setting updated: {key}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error setting {key}: {str(e)}")
            return False
        finally:
            db.close()
    
    @staticmethod
    def delete(key: str) -> bool:
        """
        Delete a setting.
        
        Args:
            key (str): The setting key.
        
        Returns:
            bool: True if successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            setting = db.query(SettingsModel).filter_by(key=key).first()
            
            if not setting:
                logger.warning(f"Setting {key} not found for deletion")
                return False
            
            db.delete(setting)
            db.commit()
            
            logger.info(f"Setting deleted: {key}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting setting {key}: {str(e)}")
            return False
        finally:
            db.close()
    
    @staticmethod
    def get_all_by_category(category: str) -> Dict[str, Any]:
        """
        Get all settings in a category.
        
        Args:
            category (str): The category to filter by.
        
        Returns:
            Dict[str, Any]: Dictionary mapping setting keys to values.
        """
        db = next(get_db())
        
        try:
            settings = db.query(SettingsModel).filter_by(category=category).all()
            
            return {setting.key: setting.value for setting in settings}
        except Exception as e:
            logger.error(f"Error retrieving settings for category {category}: {str(e)}")
            return {}
        finally:
            db.close()
    
    @staticmethod
    def get_categories() -> List[str]:
        """
        Get all unique setting categories.
        
        Returns:
            List[str]: List of category names.
        """
        db = next(get_db())
        
        try:
            # Use distinct to get unique categories
            categories = db.query(SettingsModel.category) \
                .distinct() \
                .filter(SettingsModel.category.isnot(None)) \
                .all()
            
            return [category[0] for category in categories]
        except Exception as e:
            logger.error(f"Error retrieving setting categories: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def get_model_class():
        """
        Get the SQLAlchemy model class associated with this domain model.
        
        Returns:
            Type[SettingsModel]: The SettingsModel class
        """
        return SettingsModel 