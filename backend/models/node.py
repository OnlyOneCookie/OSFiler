"""
Node model.

This module defines the Node model that represents data nodes within
investigations. Nodes can be of various types (person, username, email, etc.)
and contain specific data relevant to their type.
"""

import logging
import uuid
import json
from datetime import datetime
from typing import Dict, Any, Optional, List, Union

from sqlalchemy import Column, String, ForeignKey, DateTime, func, or_
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from backend.core.database import Base, get_db

# Configure logger
logger = logging.getLogger(__name__)

# Define valid node types
VALID_NODE_TYPES = [
    "PERSON",
    "ORGANIZATION",
    "USERNAME",
    "EMAIL",
    "PHONE",
    "ADDRESS",
    "WEBSITE",
    "SOCIAL_PROFILE",
    "DOCUMENT",
    "IMAGE",
    "LOCATION",
    "EVENT",
    "CUSTOM"
]

class NodeModel(Base):
    """
    SQLAlchemy model for nodes table.
    """
    __tablename__ = "nodes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # Legacy field, kept for backward compatibility
    type_id = Column(UUID(as_uuid=True), ForeignKey("types.id"), nullable=True)  # New field referencing types table
    name = Column(String, nullable=False)
    data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    source_module = Column(String)
    
    # Define relationships to other models
    investigation = relationship("InvestigationModel", back_populates="nodes")
    created_by_user = relationship("UserModel")
    node_type = relationship("TypeModel", foreign_keys=[type_id])
    
    # Add relationships for node-to-node connections
    outgoing_relationships = relationship("RelationshipModel", 
        foreign_keys="RelationshipModel.source_node_id",
        back_populates="source_node", 
        cascade="all, delete-orphan"
    )
    
    incoming_relationships = relationship("RelationshipModel", 
        foreign_keys="RelationshipModel.target_node_id",
        back_populates="target_node", 
        cascade="all, delete-orphan"
    )

class Node:
    """
    Node model for OSFiler.
    
    This class represents a data node within an investigation. Nodes can be
    of various types and contain specific data relevant to their type.
    
    Attributes:
        id (str): The unique identifier for the node.
        investigation_id (str): The ID of the investigation this node belongs to.
        type (str): The type of node (person, username, email, etc.).
        name (str): The name/value of the node.
        data (Dict[str, Any]): Additional data specific to the node type.
        created_at (datetime): When the node was created.
        updated_at (datetime): When the node was last updated.
        created_by (Optional[str]): The ID of the user who created the node.
        source_module (Optional[str]): The name of the module that created the node.
    """
    
    def __init__(
        self,
        id: str,
        investigation_id: str,
        type: str,
        name: str,
        data: Dict[str, Any] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        created_by: Optional[str] = None,
        source_module: Optional[str] = None
    ):
        """
        Initialize a node instance.
        
        Args:
            id (str): The unique identifier for the node.
            investigation_id (str): The ID of the investigation this node belongs to.
            type (str): The type of node.
            name (str): The name of the node.
            data (Dict[str, Any]): Additional data for the node.
            created_at (Optional[datetime]): When the node was created.
            updated_at (Optional[datetime]): When the node was last updated.
            created_by (Optional[str]): The ID of the user who created this node.
            source_module (Optional[str]): The name of the module that created this node.
        """
        self.id = id
        self.investigation_id = investigation_id
        self.type = type
        self.name = name
        self.data = data or {}
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.created_by = created_by
        self.source_module = source_module
        self.type_id = None  # Will be set by from_model if available
    
    @classmethod
    def from_model(cls, model: NodeModel) -> 'Node':
        """
        Create a Node instance from a SQLAlchemy model.
        
        Args:
            model (NodeModel): SQLAlchemy node model.
        
        Returns:
            Node: A new Node instance.
        """
        instance = cls(
            id=str(model.id),
            investigation_id=str(model.investigation_id),
            type=model.type,
            name=model.name,
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
    def from_dict(cls, data: Dict[str, Any]) -> 'Node':
        """Create a Node instance from a dictionary."""
        # Convert ISO format strings to datetime objects
        created_at = data.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
        updated_at = data.get('updated_at')
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        # Handle data field - might be a JSON string
        node_data = data.get('data', {})
        if isinstance(node_data, str):
            try:
                node_data = json.loads(node_data)
            except json.JSONDecodeError:
                # If not valid JSON, use empty dict
                node_data = {}
        
        return cls(
            id=data.get('id'),
            investigation_id=data.get('investigation_id'),
            type=data.get('type'),
            name=data.get('name'),
            data=node_data,
            created_at=created_at,
            updated_at=updated_at,
            created_by=data.get('created_by'),
            source_module=data.get('source_module')
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the Node instance to a dictionary.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the node.
        """
        return {
            'id': self.id,
            'investigation_id': self.investigation_id,
            'type': self.type,
            'name': self.name,
            'data': self.data,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'created_by': self.created_by,
            'source_module': self.source_module
        }
    
    def to_vis_node(self) -> Dict[str, Any]:
        """
        Convert the Node instance to a vis.js compatible node.
        
        Returns:
            Dict[str, Any]: vis.js node representation.
        """
        # Define default colors for different node types
        type_colors = {
            "person": "#FF6384",
            "organization": "#36A2EB",
            "username": "#FFCE56",
            "email": "#4BC0C0",
            "phone": "#9966FF",
            "address": "#FF9F40",
            "website": "#8AC24A",
            "social_profile": "#00BCD4",
            "document": "#795548",
            "image": "#9E9E9E",
            "location": "#607D8B",
            "event": "#F44336",
            "custom": "#9C27B0"
        }
        
        # Get color for this node type, default to gray
        color = type_colors.get(self.type, "#9E9E9E")
        
        # Define label based on node name and type
        label = f"{self.name}\n({self.type})"
        
        return {
            'id': self.id,
            'label': label,
            'title': self._get_html_title(),
            'color': color,
            'shape': 'dot',
            'size': 10,
            'font': {
                'face': 'Arial',
                'size': 14
            },
            'type': self.type,
            'investigation_id': self.investigation_id
        }
    
    def _get_html_title(self) -> str:
        """
        Generate an HTML title for the node tooltip in vis.js.
        
        Returns:
            str: HTML formatted tooltip content.
        """
        # Start with the node name and type
        html = f"<div style='font-weight:bold;'>{self.name}</div>"
        html += f"<div>Type: {self.type}</div>"
        
        # Add data properties, but limit to avoid overwhelming tooltips
        if self.data:
            html += "<div style='margin-top:10px;'>"
            
            # Show up to 5 data properties
            data_items = list(self.data.items())[:5]
            for key, value in data_items:
                # Format value for display
                if isinstance(value, dict) or isinstance(value, list):
                    value = "..."  # Don't show complex objects in tooltip
                html += f"<div><b>{key}:</b> {value}</div>"
            
            # Indicate if there are more properties
            if len(self.data) > 5:
                html += f"<div>... and {len(self.data) - 5} more properties</div>"
            
            html += "</div>"
        
        # Add creation info
        created_str = self.created_at.strftime("%Y-%m-%d %H:%M")
        html += f"<div style='margin-top:10px; font-size:smaller;'>Created: {created_str}</div>"
        
        return html

    @staticmethod
    def create(
        investigation_id: str,
        type: str,
        name: str,
        data: Dict[str, Any] = None,
        created_by: Optional[str] = None,
        source_module: Optional[str] = None
    ) -> 'Node':
        """
        Create a new node in the database.
        
        Args:
            investigation_id (str): The ID of the investigation this node belongs to.
            type (str): The type of node.
            name (str): The name of the node.
            data (Dict[str, Any]): Additional data for the node.
            created_by (Optional[str]): The ID of the user who created this node.
            source_module (Optional[str]): The name of the module that created this node.
        
        Returns:
            Node: The created node.
        """
        db = next(get_db())
        
        try:
            # Get or create the type record
            from .type import Type
            node_type = Type.get_by_value(type, "node")
            type_id = None
            
            # If type exists, use its ID
            if node_type:
                type_id = node_type.id
            else:
                # Try to create a new type
                try:
                    new_type = Type.create(
                        value=type,
                        entity_type="node",
                        description=f"Custom node type: {type}"
                    )
                    type_id = new_type.id
                except Exception as e:
                    logger.warning(f"Could not create new node type '{type}': {str(e)}")
            
            # Create new node
            new_node = NodeModel(
                investigation_id=investigation_id,
                type=type,  # Keep for backward compatibility
                type_id=type_id,  # New field
                name=name,
                data=data or {},
                created_by=created_by,
                source_module=source_module
            )
            
            db.add(new_node)
            db.commit()
            db.refresh(new_node)
            
            logger.info(f"Created new node: {name} (Type: {type})")
            return Node.from_model(new_node)
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating node: {str(e)}")
            raise
        finally:
            db.close()
        
    @staticmethod
    def get_by_id(node_id: str) -> Optional['Node']:
        """
        Get a node by ID.
        
        Args:
            node_id (str): The node ID.
        
        Returns:
            Optional[Node]: The node if found, None otherwise.
        """
        db = next(get_db())
        
        try:
            node = db.query(NodeModel).filter_by(id=node_id).first()
            
            if node:
                return Node.from_model(node)
            
            return None
        except Exception as e:
            logger.error(f"Error retrieving node {node_id}: {str(e)}")
            return None
        finally:
            db.close()
    
    @staticmethod
    def find_by_name_and_type(
        investigation_id: str,
        type: str,
        name: str
    ) -> Optional['Node']:
        """
        Find a node by name and type within an investigation.
        
        Args:
            investigation_id (str): The ID of the investigation.
            type (str): The type of node.
            name (str): The name/value of the node.
        
        Returns:
            Optional[Node]: The node if found, None otherwise.
        """
        db = next(get_db())
        
        try:
            node = db.query(NodeModel).filter_by(
                investigation_id=investigation_id,
                type=type,
                name=name
            ).first()
            
            if node:
                return Node.from_model(node)
            
            return None
        except Exception as e:
            logger.error(f"Error finding node by name and type: {str(e)}")
            return None
        finally:
            db.close()
    
    @staticmethod
    def get_all_for_investigation(
        investigation_id: str,
        skip: int = 0,
        limit: int = 100,
        type_filter: Optional[str] = None
    ) -> List['Node']:
        """
        Get all nodes for an investigation with pagination.
        
        Args:
            investigation_id (str): The investigation ID.
            skip (int): Number of nodes to skip.
            limit (int): Maximum number of nodes to return.
            type_filter (Optional[str]): Filter nodes by type.
        
        Returns:
            List[Node]: List of nodes.
        """
        db = next(get_db())
        
        try:
            query = db.query(NodeModel).filter_by(investigation_id=investigation_id)
            
            if type_filter:
                query = query.filter_by(type=type_filter)
            
            # Order by created_at descending
            query = query.order_by(NodeModel.created_at.desc())
            
            nodes = query.offset(skip).limit(limit).all()
            
            return [Node.from_model(node) for node in nodes]
        except Exception as e:
            logger.error(f"Error retrieving nodes for investigation {investigation_id}: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def count_for_investigation(
        investigation_id: str,
        type_filter: Optional[str] = None
    ) -> int:
        """
        Get the total number of nodes for an investigation.
        
        Args:
            investigation_id (str): The investigation ID.
            type_filter (Optional[str]): Filter nodes by type.
        
        Returns:
            int: The number of nodes.
        """
        db = next(get_db())
        
        try:
            query = db.query(func.count(NodeModel.id)).filter_by(investigation_id=investigation_id)
            
            if type_filter:
                query = query.filter_by(type=type_filter)
            
            return query.scalar() or 0
        except Exception as e:
            logger.error(f"Error counting nodes for investigation {investigation_id}: {str(e)}")
            return 0
        finally:
            db.close()
    
    def update(self, data: Dict[str, Any]) -> bool:
        """
        Update the node with new data.
        
        Args:
            data (Dict[str, Any]): Data to update.
        
        Returns:
            bool: True if update was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            node = db.query(NodeModel).filter_by(id=self.id).first()
            
            if not node:
                logger.error(f"Node {self.id} not found for update")
                return False
            
            # Update fields
            if 'name' in data:
                node.name = data['name']
                self.name = data['name']
            
            if 'type' in data:
                # Get or create the type record
                from .type import Type
                node_type = Type.get_by_value(data['type'], "node")
                
                if node_type:
                    node.type = data['type']  # For backwards compatibility
                    node.type_id = node_type.id
                    self.type = data['type']
                else:
                    # Try to create a new type
                    try:
                        new_type = Type.create(
                            value=data['type'],
                            entity_type="node",
                            description=f"Custom node type: {data['type']}"
                        )
                        node.type = data['type']
                        node.type_id = new_type.id
                        self.type = data['type']
                    except Exception as e:
                        logger.warning(f"Could not create new node type '{data['type']}': {str(e)}")
                        return False
            
            if 'data' in data:
                # Handle data field
                if isinstance(data['data'], str):
                    try:
                        parsed_data = json.loads(data['data'])
                        node.data = parsed_data
                        self.data = parsed_data
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON data for node {self.id}")
                        return False
                else:
                    # Merge with existing data
                    if node.data is None:
                        node.data = data['data']
                    else:
                        node.data.update(data['data'])
                    
                    self.data = node.data
            
            # Update timestamp
            node.updated_at = datetime.utcnow()
            self.updated_at = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Updated node: {self.name}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating node {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    def delete(self) -> bool:
        """
        Delete the node and all its relationships.
        
        Returns:
            bool: True if deletion was successful, False otherwise.
        """
        db = next(get_db())
        
        try:
            node = db.query(NodeModel).filter_by(id=self.id).first()
            
            if not node:
                logger.error(f"Node {self.id} not found for deletion")
                return False
            
            # The relationships will be automatically deleted due to cascade
            db.delete(node)
            db.commit()
            
            logger.info(f"Deleted node: {self.name} (ID: {self.id})")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting node {self.id}: {str(e)}")
            return False
        finally:
            db.close()
    
    def get_related_nodes(
        self,
        relationship_type: Optional[str] = None,
        direction: str = "both"
    ) -> List['Node']:
        """
        Get nodes related to this node.
        
        Args:
            relationship_type (Optional[str]): Filter by relationship type.
            direction (str): Relationship direction ('outgoing', 'incoming', or 'both').
        
        Returns:
            List[Node]: List of related nodes.
        """
        db = next(get_db())
        
        try:
            # Get model classes to avoid circular imports
            RelationshipModel = self.get_relationship_model_class()
            
            related_nodes = []
            
            # Process based on direction
            if direction in ["outgoing", "both"]:
                # Get outgoing relationships
                outgoing_query = db.query(NodeModel).join(
                    RelationshipModel, RelationshipModel.target_node_id == NodeModel.id
                ).filter(RelationshipModel.source_node_id == self.id)
                
                if relationship_type:
                    outgoing_query = outgoing_query.filter(RelationshipModel.type == relationship_type)
                
                outgoing_nodes = outgoing_query.all()
                related_nodes.extend(outgoing_nodes)
            
            if direction in ["incoming", "both"]:
                # Get incoming relationships
                incoming_query = db.query(NodeModel).join(
                    RelationshipModel, RelationshipModel.source_node_id == NodeModel.id
                ).filter(RelationshipModel.target_node_id == self.id)
                
                if relationship_type:
                    incoming_query = incoming_query.filter(RelationshipModel.type == relationship_type)
                
                incoming_nodes = incoming_query.all()
                related_nodes.extend(incoming_nodes)
            
            # Remove duplicates
            unique_nodes = {str(node.id): node for node in related_nodes}
            
            return [Node.from_model(node) for node in unique_nodes.values()]
        except Exception as e:
            logger.error(f"Error retrieving related nodes for {self.id}: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def search_in_investigation(
        investigation_id: str,
        query_text: str,
        type_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List['Node']:
        """
        Search for nodes by name or data values within an investigation.
        
        Args:
            investigation_id (str): The investigation ID.
            query_text (str): The search query.
            type_filter (Optional[str]): Filter nodes by type.
            skip (int): Number of nodes to skip.
            limit (int): Maximum number of nodes to return.
        
        Returns:
            List[Node]: List of matching nodes.
        """
        db = next(get_db())
        
        try:
            # Convert query to lowercase for case-insensitive search
            query_text = query_text.lower()
            
            # Build base query 
            query = db.query(NodeModel).filter_by(investigation_id=investigation_id)
            
            # Add type filter if specified
            if type_filter:
                query = query.filter_by(type=type_filter)
            
            # Add search condition - search in name or data using to_jsonb
            query = query.filter(or_(
                func.lower(NodeModel.name).contains(query_text),
                # Search in JSONB data - convert to text for search
                func.lower(func.cast(NodeModel.data, String)).contains(query_text)
            ))
            
            # Apply pagination
            query = query.order_by(NodeModel.created_at.desc()).offset(skip).limit(limit)
            
            nodes = query.all()
            return [Node.from_model(node) for node in nodes]
        except Exception as e:
            logger.error(f"Error searching nodes in investigation {investigation_id}: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def get_node_types_for_investigation(investigation_id: str) -> Dict[str, int]:
        """
        Get counts of node types for an investigation.
        
        Args:
            investigation_id (str): The investigation ID.
        
        Returns:
            Dict[str, int]: Dictionary mapping node types to counts.
        """
        db = next(get_db())
        
        try:
            type_counts = db.query(
                NodeModel.type, 
                func.count(NodeModel.id)
            ).filter_by(
                investigation_id=investigation_id
            ).group_by(
                NodeModel.type
            ).all()
            
            return {type_name: count for type_name, count in type_counts}
        except Exception as e:
            logger.error(f"Error getting node types for investigation {investigation_id}: {str(e)}")
            return {}
        finally:
            db.close()
    
    @staticmethod
    def create_or_update(
        investigation_id: str,
        type: str,
        name: str,
        data: Dict[str, Any] = None,
        created_by: Optional[str] = None,
        source_module: Optional[str] = None
    ) -> 'Node':
        """
        Create a node if it doesn't exist, or update it if it does.
        
        Args:
            investigation_id (str): The ID of the investigation this node belongs to.
            type (str): The type of node (person, username, email, etc.).
            name (str): The name/value of the node.
            data (Dict[str, Any]): Additional data specific to the node type.
            created_by (Optional[str]): The ID of the user creating the node.
            source_module (Optional[str]): The name of the module creating the node.
        
        Returns:
            Node: The created or updated node.
        """
        # Check if node already exists
        existing_node = Node.find_by_name_and_type(investigation_id, type, name)
        
        if existing_node:
            # Update existing node
            if data:
                existing_node.update({"data": data})
            return existing_node
        else:
            # Create new node
            return Node.create(
                investigation_id=investigation_id,
                type=type,
                name=name,
                data=data,
                created_by=created_by,
                source_module=source_module
            )
    
    @staticmethod
    def get_graph_data(investigation_id: str) -> Dict[str, Any]:
        """
        Get graph data for visualization with vis.js.
        
        Args:
            investigation_id (str): The investigation ID.
        
        Returns:
            Dict[str, Any]: Graph data with nodes and edges.
        """
        db = next(get_db())
        
        try:
            # Get the model classes
            RelationshipModel = Node.get_relationship_model_class()
            
            # Get all nodes for the investigation
            nodes_query = db.query(NodeModel).filter_by(investigation_id=investigation_id)
            nodes_result = nodes_query.all()
            
            # Convert to vis.js nodes
            nodes = [Node.from_model(node).to_vis_node() for node in nodes_result]
            
            # Get all relationships for the investigation
            edges_query = db.query(RelationshipModel).filter_by(investigation_id=investigation_id)
            edges_result = edges_query.all()
            
            # Convert to vis.js edges
            edges = []
            for rel in edges_result:
                edge = {
                    "id": str(rel.id),
                    "from": str(rel.source_node_id),
                    "to": str(rel.target_node_id),
                    "label": rel.type,
                    "arrows": "to",
                    "font": {
                        "align": "middle",
                        "size": 12
                    }
                }
                
                # Add strength as width if available
                strength = rel.strength if rel.strength is not None else 0.5
                edge["width"] = 1 + (strength * 5)  # Scale width between 1-6
                
                # Add title with data information
                edge["title"] = f"Relationship: {rel.type}"
                for key, value in (rel.data or {}).items():
                    # Skip complex objects in tooltip
                    if key != "id" and not isinstance(value, (dict, list, tuple)):
                        edge["title"] += f"<br>{key}: {value}"
                
                edges.append(edge)
            
            return {
                "nodes": nodes,
                "edges": edges
            }
        except Exception as e:
            logger.error(f"Error getting graph data for investigation {investigation_id}: {str(e)}")
            return {"nodes": [], "edges": []}
        finally:
            db.close()
    
    @staticmethod
    def get_model_class():
        """
        Get the SQLAlchemy model class associated with this domain model.
        
        Returns:
            Type[NodeModel]: The NodeModel class
        """
        return NodeModel
    
    @staticmethod
    def get_relationship_model_class():
        """
        Get the RelationshipModel class.
        
        Returns:
            Type[RelationshipModel]: The RelationshipModel class
        """
        from .relationship import RelationshipModel
        return RelationshipModel