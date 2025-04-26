"""
Relationship model.

This module defines the Relationship model that represents connections
between nodes in an investigation. Relationships have types, strengths,
and can contain additional metadata.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
import json
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from backend.core.database import Base, get_db
from backend.models.node import Node
from backend.models.type import Type

# Configure logger
logger = logging.getLogger(__name__)

# Define common relationship types
COMMON_RELATIONSHIP_TYPES = [
    "KNOWS",
    "OWNS",
    "WORKS_AT",
    "MEMBER_OF",
    "LOCATED_AT",
    "CONNECTED_TO",
    "RELATED_TO",
    "HAS_USERNAME",
    "HAS_EMAIL",
    "HAS_PHONE",
    "HAS_ADDRESS",
    "PARTICIPATED_IN",
    "CREATED",
    "VISITED",
    "CONTACTED",
    "FAMILY_OF",
    "FRIEND_OF",
    "COLLEAGUE_OF",
    "CUSTOM"
]

class RelationshipModel(Base):
    """
    SQLAlchemy model for relationships table.
    """
    __tablename__ = "relationships"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    source_node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    target_node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # Legacy field, kept for backward compatibility
    type_id = Column(UUID(as_uuid=True), ForeignKey("types.id"), nullable=True)  # New field referencing types table
    strength = Column(Float, default=0.5)
    data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    source_module = Column(String)
    
    # Define relationships to other models
    source_node = relationship("NodeModel", foreign_keys=[source_node_id], back_populates="outgoing_relationships")
    target_node = relationship("NodeModel", foreign_keys=[target_node_id], back_populates="incoming_relationships")
    investigation = relationship("InvestigationModel", back_populates="relationships")
    created_by_user = relationship("UserModel")
    relationship_type = relationship("TypeModel", foreign_keys=[type_id])

class Relationship:
    """
    Relationship model for OSFiler.
    
    This class represents a relationship between two nodes in an investigation.
    
    Attributes:
        id (str): The unique identifier for the relationship.
        investigation_id (str): The ID of the investigation this relationship belongs to.
        source_node_id (str): The ID of the source node.
        target_node_id (str): The ID of the target node.
        type (str): The type of relationship.
        strength (float): The strength of the relationship (0.0 to 1.0).
        data (Dict[str, Any]): Additional data for the relationship.
        created_at (datetime): When the relationship was created.
        updated_at (datetime): When the relationship was last updated.
        created_by (Optional[str]): The ID of the user who created the relationship.
        source_module (Optional[str]): The name of the module that created the relationship.
    """
    
    def __init__(
        self,
        id: str,
        investigation_id: str,
        source_node_id: str,
        target_node_id: str,
        type: str,
        strength: float = 0.5,
        data: Dict[str, Any] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        created_by: Optional[str] = None,
        source_module: Optional[str] = None
    ):
        """
        Initialize a relationship instance.
        
        Args:
            id (str): The unique identifier for the relationship.
            investigation_id (str): The ID of the investigation this relationship belongs to.
            source_node_id (str): The ID of the source node.
            target_node_id (str): The ID of the target node.
            type (str): The type of relationship.
            strength (float): The strength of the relationship (0.0 to 1.0).
            data (Dict[str, Any]): Additional data for the relationship.
            created_at (Optional[datetime]): When the relationship was created.
            updated_at (Optional[datetime]): When the relationship was last updated.
            created_by (Optional[str]): The ID of the user who created the relationship.
            source_module (Optional[str]): The name of the module that created the relationship.
        """
        self.id = id
        self.investigation_id = investigation_id
        self.source_node_id = source_node_id
        self.target_node_id = target_node_id
        self.type = type
        
        # Ensure strength is between 0.0 and 1.0
        self.strength = max(0.0, min(1.0, strength))
        
        self.data = data or {}
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.created_by = created_by
        self.source_module = source_module
    
    @classmethod
    def from_model(cls, model: RelationshipModel) -> 'Relationship':
        """
        Create a Relationship instance from a SQLAlchemy model.
        
        Args:
            model (RelationshipModel): SQLAlchemy relationship model.
        
        Returns:
            Relationship: A new Relationship instance.
        """
        # Create instance with basic attributes
        instance = cls(
            id=str(model.id),
            investigation_id=str(model.investigation_id),
            source_node_id=str(model.source_node_id),
            target_node_id=str(model.target_node_id),
            type=model.type,
            strength=model.strength,
            data=model.data,
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by=str(model.created_by) if model.created_by else None,
            source_module=model.source_module
        )
        
        # Add type_id if available
        instance.type_id = str(model.type_id) if model.type_id else None
        
        return instance
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Relationship':
        """
        Create a Relationship instance from a dictionary.
        
        Args:
            data (Dict[str, Any]): Dictionary containing relationship data.
        
        Returns:
            Relationship: A new Relationship instance.
        """
        # Convert ISO format strings to datetime objects
        created_at = data.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
        updated_at = data.get('updated_at')
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        # Handle data field - deserialize if it's a string
        data_field = data.get('data', {})
        if isinstance(data_field, str):
            try:
                data_field = json.loads(data_field)
            except json.JSONDecodeError:
                data_field = {}
        
        return cls(
            id=data.get('id'),
            investigation_id=data.get('investigation_id'),
            source_node_id=data.get('source_node_id'),
            target_node_id=data.get('target_node_id'),
            type=data.get('type'),
            strength=float(data.get('strength', 0.5)),
            data=data_field,
            created_at=created_at,
            updated_at=updated_at,
            created_by=data.get('created_by'),
            source_module=data.get('source_module')
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the Relationship instance to a dictionary.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the relationship.
        """
        return {
            'id': self.id,
            'investigation_id': self.investigation_id,
            'source_node_id': self.source_node_id,
            'target_node_id': self.target_node_id,
            'type': self.type,
            'strength': self.strength,
            'data': self.data,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'created_by': self.created_by,
            'source_module': self.source_module
        }
    
    @staticmethod
    def create(
        investigation_id: str,
        source_node_id: str,
        target_node_id: str,
        type: str,
        strength: float = 0.5,
        data: Dict[str, Any] = None,
        created_by: Optional[str] = None,
        source_module: Optional[str] = None
    ) -> 'Relationship':
        """
        Create a new relationship in the database.
        
        Args:
            investigation_id (str): The ID of the investigation.
            source_node_id (str): The ID of the source node.
            target_node_id (str): The ID of the target node.
            type (str): The type of relationship.
            strength (float): The strength of the relationship (0.0 to 1.0).
            data (Dict[str, Any]): Additional data for the relationship.
            created_by (Optional[str]): The ID of the user creating the relationship.
            source_module (Optional[str]): The name of the module creating the relationship.
        
        Returns:
            Relationship: The created relationship.
            
        Raises:
            ValueError: If the source or target node does not exist, or if they 
                       are not in the same investigation.
        """
        db = next(get_db())
        
        try:
        # Check if both nodes exist and are in the same investigation
            source_node = db.query(Node.get_model_class()).filter_by(id=source_node_id).first()
            if not source_node:
                raise ValueError(f"Source node with ID {source_node_id} not found")
                
            target_node = db.query(Node.get_model_class()).filter_by(id=target_node_id).first()
            if not target_node:
                raise ValueError(f"Target node with ID {target_node_id} not found")
                
            # Check if nodes are in the same investigation
            if str(source_node.investigation_id) != investigation_id or str(target_node.investigation_id) != investigation_id:
                raise ValueError("Nodes must be in the same investigation")
            
            # Get or create the type record
            relationship_type = Type.get_by_value(type, "relationship")
            type_id = None
            
            # If type exists, use its ID
            if relationship_type:
                type_id = relationship_type.id
            else:
                # Try to create a new type
                try:
                    new_type = Type.create(
                        value=type,
                        entity_type="relationship",
                        description=f"Custom relationship type: {type}"
                    )
                    type_id = new_type.id
                except Exception as e:
                    logger.warning(f"Could not create new relationship type '{type}': {str(e)}")
        
        # Create a new relationship
            new_relationship = RelationshipModel(
            investigation_id=investigation_id,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
                type=type,  # Keep for backward compatibility
                type_id=type_id,  # New field
                strength=max(0.0, min(1.0, strength)),
            data=data or {},
            created_by=created_by,
            source_module=source_module
        )
        
            db.add(new_relationship)
            db.commit()
            db.refresh(new_relationship)
            
            # Convert to domain model and return
            return Relationship.from_model(new_relationship)
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating relationship: {str(e)}")
            raise
        finally:
            db.close()
    
    @staticmethod
    def get_by_id(relationship_id: str) -> Optional['Relationship']:
        """
        Get a relationship by ID.
        
        Args:
            relationship_id (str): The relationship ID.
        
        Returns:
            Optional[Relationship]: The relationship if found, None otherwise.
        """
        db = next(get_db())
        
        try:
            relationship = db.query(RelationshipModel).filter_by(id=relationship_id).first()
            
            if relationship:
                return Relationship.from_model(relationship)
            
            return None
        except Exception as e:
            logger.error(f"Error retrieving relationship {relationship_id}: {str(e)}")
            return None
        finally:
            db.close()
    
    @staticmethod
    def get_all_for_investigation(
        investigation_id: str,
        skip: int = 0,
        limit: int = 100,
        type_filter: Optional[str] = None
    ) -> List['Relationship']:
        """
        Get all relationships for an investigation with pagination.
        
        Args:
            investigation_id (str): The investigation ID.
            skip (int): Number of relationships to skip.
            limit (int): Maximum number of relationships to return.
            type_filter (Optional[str]): Filter relationships by type.
        
        Returns:
            List[Relationship]: List of relationships.
        """
        db = next(get_db())
        
        try:
            query = db.query(RelationshipModel).filter_by(investigation_id=investigation_id)
            
            # Log relationship types before filtering
            if type_filter:
                logger.info(f"Filtering relationships by type: {type_filter}")
                all_relationships = query.all()
                types_in_db = [rel.type for rel in all_relationships]
                logger.info(f"Available relationship types in DB: {types_in_db}")
                logger.info(f"Number of relationships before filter: {len(all_relationships)}")
                
                # Apply filter - case insensitive
                query = query.filter(func.lower(RelationshipModel.type) == func.lower(type_filter))
                
                # Log after filtering
                filtered_relationships = query.all()
                logger.info(f"Number of relationships after filter: {len(filtered_relationships)}")
                if not filtered_relationships:
                    logger.info(f"No relationships found with type: {type_filter}")
            
            # Re-apply query with proper pagination
            query = db.query(RelationshipModel).filter_by(investigation_id=investigation_id)
            if type_filter:
                # Apply case-insensitive filter
                query = query.filter(func.lower(RelationshipModel.type) == func.lower(type_filter))
            
            relationships = query.offset(skip).limit(limit).all()
            
            return [Relationship.from_model(rel) for rel in relationships]
        except Exception as e:
            logger.error(f"Error retrieving relationships for investigation {investigation_id}: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def count_for_investigation(
        investigation_id: str,
        type_filter: Optional[str] = None
    ) -> int:
        """
        Get the total number of relationships for an investigation.
        
        Args:
            investigation_id (str): The investigation ID.
            type_filter (Optional[str]): Filter relationships by type.
        
        Returns:
            int: The number of relationships.
        """
        db = next(get_db())
        
        try:
            query = db.query(func.count(RelationshipModel.id)).filter_by(investigation_id=investigation_id)
            
            if type_filter:
                # Apply case-insensitive filter
                query = query.filter(func.lower(RelationshipModel.type) == func.lower(type_filter))
                
            return query.scalar() or 0
        except Exception as e:
            logger.error(f"Error counting relationships for investigation {investigation_id}: {str(e)}")
            return 0
        finally:
            db.close()
    
    def update(self, data: Dict[str, Any]) -> bool:
        """
        Update the relationship with new data.
        
        Args:
            data (Dict[str, Any]): Data to update.
        
        Returns:
            bool: True if update was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            relationship = db.query(RelationshipModel).filter_by(id=self.id).first()
            
            if not relationship:
                logger.error(f"Relationship {self.id} not found for update")
                return False
            
            # Update fields
            if 'type' in data:
                    # Get or create the type record
                    from .type import Type
                    relationship_type = Type.get_by_value(data['type'], "relationship")
                    
                    if relationship_type:
                        relationship.type = data['type']  # For backwards compatibility
                        relationship.type_id = relationship_type.id
                        self.type = data['type']
                        self.type_id = relationship_type.id
                    else:
                        # Try to create a new type
                        try:
                            new_type = Type.create(
                                value=data['type'],
                                entity_type="relationship",
                                description=f"Custom relationship type: {data['type']}"
                            )
                            relationship.type = data['type']
                            relationship.type_id = new_type.id
                            self.type = data['type']
                            self.type_id = new_type.id
                        except Exception as e:
                            logger.warning(f"Could not create new relationship type '{data['type']}': {str(e)}")
                            return False
                
            if 'strength' in data:
                    relationship.strength = max(0.0, min(1.0, data['strength']))
                    self.strength = relationship.strength
                
            if 'data' in data:
                if relationship.data is None:
                    relationship.data = data['data']
                else:
                    # Merge with existing data
                    relationship.data.update(data['data'])
                
                # Update this instance
                self.data = relationship.data
                    
                relationship.updated_at = datetime.utcnow()
                self.updated_at = datetime.utcnow()
            
                db.commit()
                return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating relationship {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    def delete(self) -> bool:
        """
        Delete the relationship.
        
        Returns:
            bool: True if deletion was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            relationship = db.query(RelationshipModel).filter_by(id=self.id).first()
            
            if not relationship:
                logger.error(f"Relationship {self.id} not found for deletion")
                return False
            
            db.delete(relationship)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting relationship {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    @staticmethod
    def get_between_nodes(source_id: str, target_id: str) -> List['Relationship']:
        """
        Get all relationships between two nodes.
        
        Args:
            source_id (str): The source node ID.
            target_id (str): The target node ID.
        
        Returns:
            List[Relationship]: List of relationships between the nodes.
        """
        db = next(get_db())
        
        try:
            # Get relationships in both directions
            relationships = db.query(RelationshipModel).filter(
                # Either source → target or target → source
                ((RelationshipModel.source_node_id == source_id) & 
                 (RelationshipModel.target_node_id == target_id)) |
                ((RelationshipModel.source_node_id == target_id) & 
                 (RelationshipModel.target_node_id == source_id))
            ).all()
            
            return [Relationship.from_model(rel) for rel in relationships]
        except Exception as e:
            logger.error(f"Error retrieving relationships between nodes: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def relationship_exists(
        source_id: str,
        target_id: str,
        type: Optional[str] = None
    ) -> bool:
        """
        Check if a relationship exists between two nodes.
        
        Args:
            source_id (str): The source node ID.
            target_id (str): The target node ID.
            type (Optional[str]): The relationship type to check for.
        
        Returns:
            bool: Whether the relationship exists.
        """
        db = next(get_db())
        
        try:
            query = db.query(RelationshipModel).filter(
                RelationshipModel.source_node_id == source_id,
                RelationshipModel.target_node_id == target_id
            )
            
            if type:
                # Use case-insensitive comparison for type
                query = query.filter(func.lower(RelationshipModel.type) == func.lower(type))
                
                return db.query(query.exists()).scalar()
        except Exception as e:
            logger.error(f"Error checking if relationship exists: {str(e)}")
            return False
        finally:
            db.close()
    
    @staticmethod
    def create_or_update(
        investigation_id: str,
        source_node_id: str,
        target_node_id: str,
        type: str,
        strength: float = 0.5,
        data: Dict[str, Any] = None,
        created_by: Optional[str] = None,
        source_module: Optional[str] = None
    ) -> 'Relationship':
        """
        Create a relationship if it doesn't exist, or update it if it does.
        
        Args:
            investigation_id (str): The ID of the investigation.
            source_node_id (str): The ID of the source node.
            target_node_id (str): The ID of the target node.
            type (str): The type of relationship.
            strength (float): The strength of the relationship (0.0 to 1.0).
            data (Dict[str, Any]): Additional data for the relationship.
            created_by (Optional[str]): The ID of the user creating the relationship.
            source_module (Optional[str]): The name of the module creating the relationship.
        
        Returns:
            Relationship: The created or updated relationship.
        """
        db = next(get_db())
        
        try:
            # Check if relationship already exists
            existing_rel = db.query(RelationshipModel).filter_by(
                source_node_id=source_node_id,
                target_node_id=target_node_id,
                type=type
            ).first()
        
            if existing_rel:
                # Update existing relationship
                relationship = Relationship.from_model(existing_rel)
                
                update_data = {}
                if relationship.strength != strength:
                    update_data["strength"] = strength
                if data:
                    update_data["data"] = data
                
                if update_data:
                    relationship.update(update_data)
                
                    return relationship
            else:
                # Create new relationship
                return Relationship.create(
                    investigation_id=investigation_id,
                    source_node_id=source_node_id,
                    target_node_id=target_node_id,
                    type=type,
                    strength=strength,
                    data=data,
                    created_by=created_by,
                    source_module=source_module
                )
        except Exception as e:
            db.rollback()
            logger.error(f"Error in create_or_update relationship: {str(e)}")
            raise
        finally:
            db.close()
    
    @staticmethod
    def get_relationship_types_for_investigation(investigation_id: str) -> Dict[str, int]:
        """
        Get counts of relationship types for an investigation.
        
        Args:
            investigation_id (str): The investigation ID.
        
        Returns:
            Dict[str, int]: Dictionary mapping relationship types to counts.
        """
        db = next(get_db())
        
        try:
            result = {}
            # Query to get type and count
            type_counts = db.query(
                RelationshipModel.type, 
                func.count(RelationshipModel.id)
            ).filter_by(
                investigation_id=investigation_id
            ).group_by(
                RelationshipModel.type
            ).all()
            
            # Convert to dictionary
            for type_name, count in type_counts:
                result[type_name] = count
                
            return result
        except Exception as e:
            logger.error(f"Error getting relationship types for investigation {investigation_id}: {str(e)}")
            return {}
        finally:
            db.close()
    
    def get_source_node(self) -> Optional[Node]:
        """
        Get the source node of the relationship.
        
        Returns:
            Optional[Node]: The source node if found, None otherwise.
        """
        return Node.get_by_id(self.source_node_id)
    
    def get_target_node(self) -> Optional[Node]:
        """
        Get the target node of the relationship.
        
        Returns:
            Optional[Node]: The target node if found, None otherwise.
        """
        return Node.get_by_id(self.target_node_id)
    
    @staticmethod
    def get_model_class():
        """
        Get the SQLAlchemy model class associated with this domain model.
        
        Returns:
            Type[RelationshipModel]: The RelationshipModel class
        """
        return RelationshipModel