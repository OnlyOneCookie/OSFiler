"""
Type model.

This module defines the Type model that represents node and relationship types
in the system. It replaces the old settings.ini file approach with a more
robust database-based type management system.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Literal
import enum

from sqlalchemy import Column, String, ForeignKey, DateTime, func, Enum, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.core.database import Base, get_db

# Configure logger
logger = logging.getLogger(__name__)

class EntityTypeEnum(enum.Enum):
    """Enum for entity type categories"""
    NODE = "node"
    RELATIONSHIP = "relationship"

class TypeModel(Base):
    """
    SQLAlchemy model for types table.
    """
    __tablename__ = "types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    value = Column(String, nullable=False)
    description = Column(String)
    entity_type = Column(Enum(EntityTypeEnum), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    is_system = Column(Boolean, default=False)  # System types cannot be deleted
    
    # Add unique constraint to ensure no duplicate type values per entity type
    __table_args__ = (UniqueConstraint('value', 'entity_type', name='unique_type_value_per_entity_type'),)

def format_type_value(value: str) -> str:
    """
    Format a type value to ensure it follows the consistent format:
    - Uppercase
    - Spaces replaced with underscores
    
    Args:
        value (str): The original type value
    
    Returns:
        str: The formatted type value
    """
    return value.strip().upper().replace(" ", "_")

class Type:
    """
    Type model for OSFiler.
    
    This class represents a type for nodes or relationships in the system.
    
    Attributes:
        id (str): The unique identifier for the type.
        value (str): The value of the type (e.g., "PERSON", "KNOWS").
        description (str): Description of the type.
        entity_type (str): Whether this is a "node" or "relationship" type.
        created_at (datetime): When the type was created.
        updated_at (datetime): When the type was last updated.
        is_system (bool): Whether this is a system type (cannot be deleted).
    """
    
    def __init__(
        self,
        id: str,
        value: str,
        entity_type: str,
        description: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        is_system: bool = False
    ):
        """
        Initialize a type instance.
        
        Args:
            id (str): The unique identifier for the type.
            value (str): The value of the type (e.g., "PERSON", "KNOWS").
            entity_type (str): Whether this is a "node" or "relationship" type.
            description (Optional[str]): Description of the type.
            created_at (Optional[datetime]): When the type was created.
            updated_at (Optional[datetime]): When the type was last updated.
            is_system (bool): Whether this is a system type (cannot be deleted).
        """
        self.id = id
        self.value = value
        self.entity_type = entity_type
        self.description = description
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.is_system = is_system
    
    @classmethod
    def from_model(cls, model: TypeModel) -> 'Type':
        """
        Create a Type instance from a SQLAlchemy model.
        
        Args:
            model (TypeModel): SQLAlchemy type model.
        
        Returns:
            Type: A new Type instance.
        """
        return cls(
            id=str(model.id),
            value=model.value,
            entity_type=model.entity_type.value,
            description=model.description,
            created_at=model.created_at,
            updated_at=model.updated_at,
            is_system=model.is_system
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the Type instance to a dictionary.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the type.
        """
        return {
            'id': self.id,
            'value': self.value,
            'entity_type': self.entity_type,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'is_system': self.is_system
        }
    
    @staticmethod
    def create(
        value: str,
        entity_type: Literal["node", "relationship"],
        description: Optional[str] = None,
        is_system: bool = False
    ) -> 'Type':
        """
        Create a new type in the database.
        
        Args:
            value (str): The value of the type (e.g., "PERSON", "KNOWS").
            entity_type (str): Whether this is a "node" or "relationship" type.
            description (Optional[str]): Description of the type.
            is_system (bool): Whether this is a system type.
        
        Returns:
            Type: The created type.
        """
        db = next(get_db())
        
        try:
            # Format the value before storing
            formatted_value = format_type_value(value)
            
            # Check if type already exists
            existing_type = db.query(TypeModel).filter_by(
                value=formatted_value,
                entity_type=EntityTypeEnum(entity_type)
            ).first()
            
            if existing_type:
                logger.info(f"Type '{formatted_value}' already exists for {entity_type}")
                return Type.from_model(existing_type)
            
            # Create new type
            # Note: description can be None and should be preserved as None
            new_type = TypeModel(
                value=formatted_value,
                entity_type=EntityTypeEnum(entity_type),
                description=description,  # This can be None and that's OK
                is_system=is_system
            )
            
            db.add(new_type)
            db.commit()
            db.refresh(new_type)
            
            logger.info(f"Created new {entity_type} type: {formatted_value}")
            return Type.from_model(new_type)
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating type: {str(e)}")
            raise
        finally:
            db.close()
    
    @staticmethod
    def get_by_id(type_id: str) -> Optional['Type']:
        """
        Get a type by ID.
        
        Args:
            type_id (str): The type ID.
        
        Returns:
            Optional[Type]: The type if found, None otherwise.
        """
        db = next(get_db())
        
        try:
            type_model = db.query(TypeModel).filter_by(id=type_id).first()
            
            if type_model:
                return Type.from_model(type_model)
            
            return None
        except Exception as e:
            logger.error(f"Error retrieving type {type_id}: {str(e)}")
            return None
        finally:
            db.close()
    
    @staticmethod
    def get_by_value(value: str, entity_type: Literal["node", "relationship"]) -> Optional['Type']:
        """
        Get a type by its value and entity type.
        
        Args:
            value (str): The type value.
            entity_type (str): Whether this is a "node" or "relationship" type.
        
        Returns:
            Optional[Type]: The type if found, None otherwise.
        """
        db = next(get_db())
        
        try:
            type_model = db.query(TypeModel).filter_by(
                value=value,
                entity_type=EntityTypeEnum(entity_type)
            ).first()
            
            if type_model:
                return Type.from_model(type_model)
            
            return None
        except Exception as e:
            logger.error(f"Error retrieving type {value} for {entity_type}: {str(e)}")
            return None
        finally:
            db.close()
    
    @staticmethod
    def get_all(entity_type: Optional[Literal["node", "relationship"]] = None) -> List['Type']:
        """
        Get all types, optionally filtered by entity type.
        
        Args:
            entity_type (Optional[str]): Filter by entity type ("node" or "relationship").
        
        Returns:
            List[Type]: List of types.
        """
        db = next(get_db())
        
        try:
            query = db.query(TypeModel)
            
            if entity_type:
                query = query.filter_by(entity_type=EntityTypeEnum(entity_type))
            
            types = query.order_by(TypeModel.value).all()
            
            return [Type.from_model(type_model) for type_model in types]
        except Exception as e:
            logger.error(f"Error retrieving types: {str(e)}")
            return []
        finally:
            db.close()
    
    def update(self, data: Dict[str, Any]) -> bool:
        """
        Update this type.
        
        Args:
            data (Dict[str, Any]): Data to update, e.g., {"value": "NEW_VALUE", "description": "New desc"}.
        
        Returns:
            bool: True if updated successfully, False otherwise.
        """
        db = next(get_db())
        
        try:
            type_model = db.query(TypeModel).filter_by(id=self.id).first()
            
            if not type_model:
                logger.warning(f"Type {self.id} not found for update")
                return False
            
            # Don't allow updating system types
            if type_model.is_system:
                logger.warning(f"Cannot update system type {self.id}")
                return False
            
            # Update fields
            if "value" in data:
                # Format the value before storing
                type_model.value = format_type_value(data["value"])
                self.value = type_model.value
                
            # Description can be explicitly set to None or empty string
            if "description" in data:
                type_model.description = data["description"]
                self.description = data["description"]
            
            # Update timestamp
            type_model.updated_at = datetime.utcnow()
            self.updated_at = type_model.updated_at
            
            db.commit()
            
            logger.info(f"Updated type {self.id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating type {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    def delete(self) -> bool:
        """
        Delete the type.
        
        Returns:
            bool: True if deletion was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            type_model = db.query(TypeModel).filter_by(id=self.id).first()
            
            if not type_model:
                logger.error(f"Type {self.id} not found for deletion")
                return False
            
            # Prevent deleting system types
            if type_model.is_system:
                logger.warning(f"Attempted to delete system type {self.value}")
                return False
            
            # Check if the type is in use
            if type_model.entity_type == EntityTypeEnum.NODE:
                from .node import NodeModel
                nodes_using_type = db.query(NodeModel).filter_by(type=type_model.value).count()
                if nodes_using_type > 0:
                    logger.warning(f"Cannot delete type {self.value} as it is used by {nodes_using_type} nodes")
                    return False
            elif type_model.entity_type == EntityTypeEnum.RELATIONSHIP:
                from .relationship import RelationshipModel
                rels_using_type = db.query(RelationshipModel).filter_by(type=type_model.value).count()
                if rels_using_type > 0:
                    logger.warning(f"Cannot delete type {self.value} as it is used by {rels_using_type} relationships")
                    return False
            
            db.delete(type_model)
            db.commit()
            
            logger.info(f"Deleted type: {self.value}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting type {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    @staticmethod
    def initialize_default_types():
        """
        Initialize default system types if they don't exist yet.
        
        This ensures that the system always has the default node and relationship types.
        """
        # Default node types
        default_node_types = [
            {"value": "PERSON", "description": "A person or individual"},
            {"value": "ORGANIZATION", "description": "A company, group, or organization"},
            {"value": "USERNAME", "description": "A username or handle used online"},
            {"value": "EMAIL", "description": "An email address"},
            {"value": "PHONE", "description": "A phone number or contact number"},
            {"value": "ADDRESS", "description": "A physical location or address"},
            {"value": "WEBSITE", "description": "A website, webpage or URL"},
            {"value": "SOCIAL_PROFILE", "description": "A social media profile or account"},
            {"value": "DOCUMENT", "description": "A document, file or written record"},
            {"value": "IMAGE", "description": "An image, photo or visual content"},
            {"value": "LOCATION", "description": "A geographic location or place"},
            {"value": "EVENT", "description": "An event, happening or occurrence"},
            {"value": "CUSTOM", "description": "A custom node type defined by the user"}
        ]
        
        # Default relationship types
        default_relationship_types = [
            {"value": "KNOWS", "description": "Knows or is acquainted with"},
            {"value": "OWNS", "description": "Owns or possesses"},
            {"value": "WORKS_AT", "description": "Works at or is employed by"},
            {"value": "MEMBER_OF", "description": "Is a member of"},
            {"value": "LOCATED_AT", "description": "Is located at or based at"},
            {"value": "CONNECTED_TO", "description": "Is connected to in some way"},
            {"value": "RELATED_TO", "description": "Is related to (generic relationship)"},
            {"value": "HAS_USERNAME", "description": "Has the username or is identified by"},
            {"value": "HAS_EMAIL", "description": "Has the email address or uses it"},
            {"value": "HAS_PHONE", "description": "Has the phone number or uses it"},
            {"value": "HAS_ADDRESS", "description": "Has the address or is located there"},
            {"value": "PARTICIPATED_IN", "description": "Participated in or was involved in"},
            {"value": "CREATED", "description": "Created or produced"},
            {"value": "VISITED", "description": "Visited or went to"},
            {"value": "CONTACTED", "description": "Contacted or communicated with"},
            {"value": "FAMILY_OF", "description": "Is family of or related to"},
            {"value": "FRIEND_OF", "description": "Is a friend of"},
            {"value": "COLLEAGUE_OF", "description": "Is a colleague or coworker of"},
            {"value": "CUSTOM", "description": "A custom relationship type defined by the user"}
        ]
        
        # Create default node types
        for type_data in default_node_types:
            try:
                Type.create(
                    value=type_data["value"],
                    entity_type="node",
                    description=type_data["description"],
                    is_system=True
                )
            except Exception as e:
                logger.error(f"Error creating default node type {type_data['value']}: {str(e)}")
        
        # Create default relationship types
        for type_data in default_relationship_types:
            try:
                Type.create(
                    value=type_data["value"],
                    entity_type="relationship",
                    description=type_data["description"],
                    is_system=True
                )
            except Exception as e:
                logger.error(f"Error creating default relationship type {type_data['value']}: {str(e)}")
    
    @staticmethod
    def get_model_class():
        """
        Get the SQLAlchemy model class associated with this domain model.
        
        Returns:
            Type[TypeModel]: The TypeModel class
        """
        return TypeModel 