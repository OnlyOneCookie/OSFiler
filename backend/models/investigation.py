"""
Investigation model.

This module defines the Investigation model that represents investigations
in the system. It provides methods for investigation creation, retrieval,
and management.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

from sqlalchemy import Column, String, DateTime, func, ForeignKey, Boolean, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.core.database import Base, get_db
from backend.models.user import User, UserModel

# Configure logger
logger = logging.getLogger(__name__)

class InvestigationModel(Base):
    """
    SQLAlchemy model for investigations table.
    """
    __tablename__ = "investigations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_archived = Column(Boolean, default=False)
    tags = Column(ARRAY(String), default=[])

    # Define relationships
    created_by_user = relationship("UserModel", back_populates="investigations")
    nodes = relationship("NodeModel", back_populates="investigation", cascade="all, delete-orphan")
    relationships = relationship("RelationshipModel", back_populates="investigation", cascade="all, delete-orphan")

class Investigation:
    """
    Investigation model for OSFiler.
    
    This class represents an investigation in the system, which contains nodes
    and relationships for analysis.
    
    Attributes:
        id (str): The unique identifier for the investigation.
        title (str): The title of the investigation.
        description (Optional[str]): A description of the investigation.
        created_at (datetime): When the investigation was created.
        updated_at (datetime): When the investigation was last updated.
        created_by (Optional[str]): The ID of the user who created this investigation.
        is_archived (bool): Whether this investigation is archived.
        tags (List[str]): List of tags associated with this investigation.
    """
    
    def __init__(
        self,
        id: str,
        title: str,
        description: Optional[str] = None,
        created_at: datetime = None,
        updated_at: datetime = None,
        created_by: Optional[str] = None,
        is_archived: bool = False,
        tags: List[str] = None
    ):
        """
        Initialize an investigation instance.
        
        Args:
            id (str): The unique identifier for the investigation.
            title (str): The title of the investigation.
            description (Optional[str]): A description of the investigation.
            created_at (datetime, optional): When the investigation was created.
            updated_at (datetime, optional): When the investigation was last updated.
            created_by (Optional[str]): The ID of the user who created this investigation.
            is_archived (bool): Whether this investigation is archived.
            tags (List[str]): List of tags associated with this investigation.
        """
        self.id = id
        self.title = title
        self.description = description
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.created_by = created_by
        self.is_archived = is_archived
        self.tags = tags or []

    @classmethod
    def from_model(cls, model: InvestigationModel) -> 'Investigation':
        """
        Create an Investigation instance from a SQLAlchemy model.
        
        Args:
            model (InvestigationModel): SQLAlchemy investigation model.
        
        Returns:
            Investigation: A new Investigation instance.
        """
        return cls(
            id=str(model.id),
            title=model.title,
            description=model.description,
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by=str(model.created_by) if model.created_by else None,
            is_archived=model.is_archived,
            tags=model.tags or []
        )
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Investigation':
        """
        Create an Investigation instance from a dictionary.
        
        Args:
            data (Dict[str, Any]): Dictionary containing investigation data.
        
        Returns:
            Investigation: A new Investigation instance.
        """
        # Convert ISO format strings to datetime objects
        created_at = data.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
        updated_at = data.get('updated_at')
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        return cls(
            id=data.get('id'),
            title=data.get('title'),
            description=data.get('description'),
            created_at=created_at,
            updated_at=updated_at,
            created_by=data.get('created_by'),
            is_archived=data.get('is_archived', False),
            tags=data.get('tags', [])
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the Investigation instance to a dictionary.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the investigation.
        """
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'created_by': self.created_by,
            'is_archived': self.is_archived,
            'tags': self.tags
        }
    
    @staticmethod
    def create(
        title: str,
        description: Optional[str] = None,
        created_by: Optional[str] = None,
        tags: List[str] = None
    ) -> 'Investigation':
        """
        Create a new investigation in the database.
        
        Args:
            title (str): The title of the investigation.
            description (Optional[str]): A description of the investigation.
            created_by (Optional[str]): The ID of the user who created this investigation.
            tags (List[str]): Tags associated with this investigation.
        
        Returns:
            Investigation: The created investigation.
        """
        db = next(get_db())
        
        try:
            # Initialize tags list if None
            if tags is None:
                tags = []
                
            new_investigation = InvestigationModel(
            title=title,
            description=description,
                created_by=uuid.UUID(created_by) if created_by else None,
                tags=tags
            )
            
            db.add(new_investigation)
            db.commit()
            db.refresh(new_investigation)
            
            logger.info(f"Created new investigation: {title}")
            return Investigation.from_model(new_investigation)
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating investigation: {str(e)}")
            raise
        finally:
            db.close()
    
    @staticmethod
    def get_by_id(investigation_id: str) -> Optional['Investigation']:
        """
        Get an investigation by ID.
        
        Args:
            investigation_id (str): The investigation ID.
        
        Returns:
            Optional[Investigation]: The investigation if found, None otherwise.
        """
        db = next(get_db())
        
        try:
            investigation = db.query(InvestigationModel).filter_by(id=investigation_id).first()
            if investigation:
                return Investigation.from_model(investigation)
            return None
        except Exception as e:
            logger.error(f"Error retrieving investigation {investigation_id}: {str(e)}")
            return None
        finally:
            db.close()
    
    def update(self, data: Dict[str, Any]) -> bool:
        """
        Update the investigation with new data.
        
        Args:
            data (Dict[str, Any]): Data to update.
        
        Returns:
            bool: True if update was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            investigation = db.query(InvestigationModel).filter_by(id=self.id).first()
            
            if not investigation:
                logger.error(f"Investigation {self.id} not found for update")
                return False
            
            # Update fields
            if 'title' in data:
                investigation.title = data['title']
                self.title = data['title']
                
            if 'description' in data:
                investigation.description = data['description']
                self.description = data['description']
                
            if 'is_archived' in data:
                investigation.is_archived = data['is_archived']
                self.is_archived = data['is_archived']
            
            # Handle tags separately
            if 'tags' in data:
                investigation.tags = data['tags']
                self.tags = data['tags']
            
            # Update timestamp
            now = datetime.utcnow()
            investigation.updated_at = now
            self.updated_at = now
            
            db.commit()
            
            logger.info(f"Updated investigation: {self.title}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating investigation {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    def delete(self) -> bool:
        """
        Delete the investigation.
        
        Returns:
            bool: True if deletion was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            investigation = db.query(InvestigationModel).filter_by(id=self.id).first()
            
            if not investigation:
                logger.error(f"Investigation {self.id} not found for deletion")
                return False
            
            db.delete(investigation)
            db.commit()
            
            logger.info(f"Deleted investigation: {self.title}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting investigation {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    @staticmethod
    def get_all(
        user_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        include_archived: bool = False
    ) -> List['Investigation']:
        """
        Get all investigations with optional filtering and pagination.
        
        Args:
            user_id (Optional[str]): Filter by created_by user ID.
            skip (int): Number of investigations to skip.
            limit (int): Maximum number of investigations to return.
            include_archived (bool): Whether to include archived investigations.
        
        Returns:
            List[Investigation]: List of investigations.
        """
        db = next(get_db())
        
        try:
            query = db.query(InvestigationModel)
            
            # Apply filters
            if user_id:
                query = query.filter_by(created_by=user_id)
                
            if not include_archived:
                query = query.filter_by(is_archived=False)
            
            # Apply pagination and ordering
            investigations = query.order_by(InvestigationModel.updated_at.desc()) \
                .offset(skip).limit(limit).all()
            
            return [Investigation.from_model(inv) for inv in investigations]
        except Exception as e:
            logger.error(f"Error retrieving investigations: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def count(user_id: Optional[str] = None, include_archived: bool = False) -> int:
        """
        Get the total number of investigations.
        
        Args:
            user_id (Optional[str]): Filter by created_by user ID.
            include_archived (bool): Whether to include archived investigations.
        
        Returns:
            int: The number of investigations.
        """
        db = next(get_db())
        
        try:
            query = db.query(InvestigationModel)
            
            # Apply filters
            if user_id:
                query = query.filter_by(created_by=user_id)
                
            if not include_archived:
                query = query.filter_by(is_archived=False)
            
            return query.count()
        except Exception as e:
            logger.error(f"Error counting investigations: {str(e)}")
            return 0
        finally:
            db.close()
    
    @staticmethod
    def get_model_class():
        """
        Get the SQLAlchemy model class associated with this domain model.
        
        Returns:
            Type[InvestigationModel]: The InvestigationModel class
        """
        return InvestigationModel
    
    @staticmethod
    def get_all_for_user(
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        include_archived: bool = False
    ) -> List['Investigation']:
        """
        Get all investigations for a user.
        
        Args:
            user_id (str): The ID of the user.
            skip (int): Number of investigations to skip.
            limit (int): Maximum number of investigations to return.
            include_archived (bool): Whether to include archived investigations.
        
        Returns:
            List[Investigation]: List of investigations for the user.
        """
        db = next(get_db())
        
        try:
            query = db.query(InvestigationModel).filter_by(created_by=user_id)
            
            if not include_archived:
                query = query.filter_by(is_archived=False)
                
            investigations = query.order_by(
                InvestigationModel.updated_at.desc()
            ).offset(skip).limit(limit).all()
            
            return [Investigation.from_model(inv) for inv in investigations]
        except Exception as e:
            logger.error(f"Error retrieving investigations for user {user_id}: {str(e)}")
            return []
        finally:
            db.close()
            
    @staticmethod
    def count_for_user(
        user_id: str,
        include_archived: bool = False
    ) -> int:
        """
        Get the total number of investigations for a user.
        
        Args:
            user_id (str): The ID of the user.
            include_archived (bool): Whether to include archived investigations.
        
        Returns:
            int: The number of investigations.
        """
        db = next(get_db())
        
        try:
            query = db.query(InvestigationModel).filter_by(created_by=user_id)
            
            if not include_archived:
                query = query.filter_by(is_archived=False)
                
            return query.count()
        except Exception as e:
            logger.error(f"Error counting investigations for user {user_id}: {str(e)}")
            return 0
        finally:
            db.close()
            
    def get_node_count(self) -> int:
        """
        Get the number of nodes in this investigation.
        
        Returns:
            int: The number of nodes.
        """
        # Circular import avoidance
        from .node import Node
        return Node.count_for_investigation(self.id)
        
    def get_relationship_count(self) -> int:
        """
        Get the number of relationships in this investigation.
        
        Returns:
            int: The number of relationships.
        """
        # Circular import avoidance
        from .relationship import Relationship
        return Relationship.count_for_investigation(self.id)
    
    def archive(self) -> bool:
        """
        Archive this investigation by setting is_archived to True.
        
        Returns:
            bool: True if the operation was successful, False otherwise.
        """
        return self.update({"is_archived": True})
    
    def unarchive(self) -> bool:
        """
        Unarchive this investigation by setting is_archived to False.
        
        Returns:
            bool: True if the operation was successful, False otherwise.
        """
        return self.update({"is_archived": False})
    
    def export_data(self) -> Dict[str, Any]:
        """
        Export this investigation including its nodes and relationships.
        
        Returns:
            Dict[str, Any]: The exported investigation data.
        """
        from .node import Node
        from .relationship import Relationship
        
        # Get investigation data
        investigation_data = self.to_dict()
        
        # Get nodes
        nodes = Node.get_all_for_investigation(self.id)
        nodes_data = [node.to_dict() for node in nodes]
        
        # Get relationships
        relationships = Relationship.get_all_for_investigation(self.id)
        relationships_data = [relationship.to_dict() for relationship in relationships]
        
        # Build export data
        export_data = {
            "investigation": investigation_data,
            "nodes": nodes_data,
            "relationships": relationships_data,
            "metadata": {
                "exported_at": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
        }
        
        return export_data
    
    @staticmethod
    def import_data(user_id: str, import_data: Dict[str, Any]) -> Tuple['Investigation', List[str]]:
        """
        Import an investigation from exported data.
        
        Args:
            user_id (str): ID of the user importing the investigation
            import_data (Dict[str, Any]): The exported investigation data
        
        Returns:
            Tuple['Investigation', List[str]]: The imported investigation and any messages
        """
        from .node import Node
        from .relationship import Relationship
        
        messages = []
        
        # Extract data
        investigation_data = import_data.get("investigation", {})
        nodes_data = import_data.get("nodes", [])
        relationships_data = import_data.get("relationships", [])
        
        # Validate required data
        if not investigation_data or "title" not in investigation_data:
            return None, ["Invalid investigation data"]
        
        # Create new investigation
        title = investigation_data.get("title")
        description = investigation_data.get("description", "")
        tags = investigation_data.get("tags", [])
        
        new_investigation = Investigation.create(
            title=f"{title} (Imported)",
            description=description,
            created_by=user_id,
            tags=tags
        )
        
        if not new_investigation:
            return None, ["Failed to create investigation"]
        
        # Track old ID to new ID mapping for nodes
        node_id_map = {}
        
        # Import nodes
        node_count = 0
        for node_data in nodes_data:
            try:
                # Store old ID
                old_id = node_data.get("id")
                
                # Create new node with the data but in new investigation
                node = Node.create(
                    investigation_id=new_investigation.id,
                    type=node_data.get("type", "unknown"),
                    name=node_data.get("name", "Unnamed Node"),
                    data=node_data.get("data", {}),
                    created_by=user_id
                )
                
                if node:
                    # Map old ID to new ID
                    node_id_map[old_id] = node.id
                    node_count += 1
            except Exception as e:
                messages.append(f"Error importing node {node_data.get('name', 'unknown')}: {str(e)}")
        
        # Import relationships
        relationship_count = 0
        for rel_data in relationships_data:
            try:
                # Get old IDs
                old_source_id = rel_data.get("source_node_id")
                old_target_id = rel_data.get("target_node_id")
                
                # Get new IDs from mapping
                new_source_id = node_id_map.get(old_source_id)
                new_target_id = node_id_map.get(old_target_id)
                
                # Skip if we don't have mapped IDs
                if not new_source_id or not new_target_id:
                    continue
                
                # Create relationship
                relationship = Relationship.create(
                    investigation_id=new_investigation.id,
                    source_node_id=new_source_id,
                    target_node_id=new_target_id,
                    type=rel_data.get("type", "RELATED_TO"),
                    strength=rel_data.get("strength", 0.5),
                    data=rel_data.get("data", {}),
                    created_by=user_id
                )
                
                if relationship:
                    relationship_count += 1
            except Exception as e:
                messages.append(f"Error importing relationship: {str(e)}")
        
        # Add success message
        messages.append(f"Successfully imported {node_count} nodes and {relationship_count} relationships")
        
        return new_investigation, messages
    
    @staticmethod
    def search(
        query: str, 
        user_id: Optional[str] = None,
        include_archived: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List['Investigation']:
        """
        Search for investigations by name or description.
        
        Args:
            query (str): Search query string.
            user_id (Optional[str]): Filter by created_by user ID.
            include_archived (bool): Whether to include archived investigations.
            skip (int): Number of investigations to skip.
            limit (int): Maximum number of investigations to return.
        
        Returns:
            List[Investigation]: List of matching investigations.
        """
        db = next(get_db())
        
        try:
            # Create base query
            search = f"%{query}%"
            db_query = db.query(InvestigationModel).filter(
                (InvestigationModel.title.ilike(search)) |
                (InvestigationModel.description.ilike(search))
            )
            
            # Apply filters
            if user_id:
                db_query = db_query.filter_by(created_by=user_id)
                
            if not include_archived:
                db_query = db_query.filter_by(is_archived=False)
            
            # Apply pagination and ordering
            investigations = db_query.order_by(InvestigationModel.updated_at.desc()) \
                .offset(skip).limit(limit).all()
            
            return [Investigation.from_model(inv) for inv in investigations]
        except Exception as e:
            logger.error(f"Error searching investigations: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def search_by_tags(
        user_id: str,
        tags: List[str],
        skip: int = 0,
        limit: int = 100,
        include_archived: bool = False
    ) -> List['Investigation']:
        """
        Search for investigations by tags.
        
        Args:
            user_id (str): The ID of the user.
            tags (List[str]): The tags to search for.
            skip (int): Number of investigations to skip.
            limit (int): Maximum number of investigations to return.
            include_archived (bool): Whether to include archived investigations.
        
        Returns:
            List[Investigation]: List of matching investigations.
        """
        db = next(get_db())
        
        try:
            # Build a query that checks for any of the provided tags
            query = db.query(InvestigationModel).filter(
                InvestigationModel.created_by == user_id,
                InvestigationModel.tags.overlap(tags)
            )
            
            if not include_archived:
                query = query.filter_by(is_archived=False)
                
            # Apply pagination and ordering
            investigations = query.order_by(
                InvestigationModel.updated_at.desc()
            ).offset(skip).limit(limit).all()
            
            return [Investigation.from_model(inv) for inv in investigations]
        except Exception as e:
            logger.error(f"Error searching investigations by tags for user {user_id}: {str(e)}")
            return []
        finally:
            db.close()