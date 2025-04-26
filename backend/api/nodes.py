"""
Nodes API endpoints.

This module provides API endpoints for managing nodes within investigations,
including creating, retrieving, updating, and deleting nodes.
"""

import logging
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, validator

from backend.core.security import get_current_user
from backend.models import Node, Investigation, VALID_NODE_TYPES

# Configure logger
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix="/nodes", tags=["nodes"])

# Define API models
class NodeCreate(BaseModel):
    """Node creation model."""
    investigation_id: str
    type: str = Field(..., description="Type of node")
    name: str = Field(..., min_length=1, max_length=100, description="Name/value of the node")
    data: Dict[str, Any] = Field(default_factory=dict, description="Additional data specific to the node type")
    
    @validator('type')
    def validate_type(cls, v):
        if v not in VALID_NODE_TYPES:
            raise ValueError(f"Invalid node type. Valid types: {', '.join(VALID_NODE_TYPES)}")
        return v


class NodeUpdate(BaseModel):
    """Node update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    
    @validator('type')
    def validate_type(cls, v):
        if v is not None and v not in VALID_NODE_TYPES:
            raise ValueError(f"Invalid node type. Valid types: {', '.join(VALID_NODE_TYPES)}")
        return v


class NodeResponse(BaseModel):
    """Node response model."""
    id: str
    investigation_id: str
    type: str
    name: str
    data: Dict[str, Any]
    created_at: str
    updated_at: str
    created_by: Optional[str] = None
    source_module: Optional[str] = None


@router.post("", response_model=NodeResponse)
async def create_node(
    node: NodeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new node.
    
    Args:
        node (NodeCreate): The node data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The created node data.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(node.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    try:
        # Create node
        new_node = Node.create(
            investigation_id=node.investigation_id,
            type=node.type,
            name=node.name,
            data=node.data,
            created_by=current_user["id"]
        )
        
        logger.info(f"Created node: {new_node.name} (Type: {new_node.type}, ID: {new_node.id})")
        
        return new_node.to_dict()
        
    except Exception as e:
        logger.error(f"Error creating node: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating node: {str(e)}"
        )


@router.get("/{node_id}", response_model=NodeResponse)
async def get_node(
    node_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get a node by ID.
    
    Args:
        node_id (str): The node ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The node data.
    """
    # Get node
    node = Node.get_by_id(node_id)
    
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(node.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this node"
        )
    
    return node.to_dict()


@router.put("/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: str,
    node_update: NodeUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update a node.
    
    Args:
        node_id (str): The node ID.
        node_update (NodeUpdate): The node update data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The updated node data.
    """
    # Get node
    node = Node.get_by_id(node_id)
    
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(node.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this node"
        )
    
    # Prepare update data
    update_data = node_update.dict(exclude_none=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )
    
    # Update node
    success = node.update(update_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update node"
        )
    
    logger.info(f"Updated node: {node.name} (ID: {node.id})")
    
    return node.to_dict()


@router.delete("/{node_id}")
async def delete_node(
    node_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a node.
    
    Args:
        node_id (str): The node ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, str]: A success message.
    """
    # Get node
    node = Node.get_by_id(node_id)
    
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(node.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this node"
        )
    
    # Delete node
    success = node.delete()
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete node"
        )
    
    logger.info(f"Deleted node: {node.name} (ID: {node.id})")
    
    return {"message": "Node deleted successfully"}


@router.get("", response_model=List[NodeResponse])
async def get_nodes_for_investigation(
    investigation_id: str = Query(..., description="Investigation ID"),
    type_filter: Optional[str] = Query(None, description="Filter nodes by type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all nodes for an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        type_filter (Optional[str]): Filter nodes by type.
        skip (int): Number of nodes to skip.
        limit (int): Maximum number of nodes to return.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of nodes.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Validate type filter if provided
    if type_filter and type_filter not in VALID_NODE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid node type. Valid types: {', '.join(VALID_NODE_TYPES)}"
        )
    
    # Get nodes
    nodes = Node.get_all_for_investigation(
        investigation_id=investigation_id,
        skip=skip,
        limit=limit,
        type_filter=type_filter
    )
    
    return [node.to_dict() for node in nodes]


@router.get("/count/{investigation_id}")
async def get_node_count(
    investigation_id: str,
    type_filter: Optional[str] = Query(None, description="Filter nodes by type"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, int]:
    """
    Get the number of nodes for an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        type_filter (Optional[str]): Filter nodes by type.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, int]: The node count.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Validate type filter if provided
    if type_filter and type_filter not in VALID_NODE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid node type. Valid types: {', '.join(VALID_NODE_TYPES)}"
        )
    
    # Get count
    count = Node.count_for_investigation(
        investigation_id=investigation_id,
        type_filter=type_filter
    )
    
    return {"count": count}


@router.get("/search/{investigation_id}", response_model=List[NodeResponse])
async def search_nodes(
    investigation_id: str,
    query: str = Query(..., min_length=1, description="Search query"),
    type_filter: Optional[str] = Query(None, description="Filter nodes by type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Search for nodes in an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        query (str): The search query.
        type_filter (Optional[str]): Filter nodes by type.
        skip (int): Number of nodes to skip.
        limit (int): Maximum number of nodes to return.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of matching nodes.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Validate type filter if provided
    if type_filter and type_filter not in VALID_NODE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid node type. Valid types: {', '.join(VALID_NODE_TYPES)}"
        )
    
    # Search nodes
    nodes = Node.search_in_investigation(
        investigation_id=investigation_id,
        query_text=query,
        type_filter=type_filter,
        skip=skip,
        limit=limit
    )
    
    return [node.to_dict() for node in nodes]


@router.get("/related/{node_id}", response_model=List[NodeResponse])
async def get_related_nodes(
    node_id: str,
    relationship_type: Optional[str] = Query(None, description="Filter by relationship type"),
    direction: str = Query("both", description="Relationship direction (outgoing, incoming, or both)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get nodes related to a specific node.
    
    Args:
        node_id (str): The node ID.
        relationship_type (Optional[str]): Filter by relationship type.
        direction (str): Relationship direction (outgoing, incoming, or both).
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of related nodes.
    """
    # Get node
    node = Node.get_by_id(node_id)
    
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(node.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this node"
        )
    
    # Validate direction
    if direction not in ["outgoing", "incoming", "both"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid direction. Must be 'outgoing', 'incoming', or 'both'"
        )
    
    # Get related nodes
    related_nodes = node.get_related_nodes(
        relationship_type=relationship_type,
        direction=direction
    )
    
    return [node.to_dict() for node in related_nodes]


@router.get("/types/{investigation_id}")
async def get_node_types(
    investigation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, int]:
    """
    Get counts of node types for an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, int]: Dictionary mapping node types to counts.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Get node types
    type_counts = Node.get_node_types_for_investigation(investigation_id)
    
    return type_counts


@router.post("/create-or-update", response_model=NodeResponse)
async def create_or_update_node(
    node: NodeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a node if it doesn't exist, or update it if it does.
    
    Args:
        node (NodeCreate): The node data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The created or updated node data.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(node.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    try:
        # Create or update node
        result_node = Node.create_or_update(
            investigation_id=node.investigation_id,
            type=node.type,
            name=node.name,
            data=node.data,
            created_by=current_user["id"]
        )
        
        logger.info(f"Created or updated node: {result_node.name} (ID: {result_node.id})")
        
        return result_node.to_dict()
        
    except Exception as e:
        logger.error(f"Error creating or updating node: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating or updating node: {str(e)}"
        )


@router.get("/graph/{investigation_id}")
async def get_graph_data(
    investigation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get graph data for visualization.
    
    Args:
        investigation_id (str): The investigation ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: Graph data with nodes and edges.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Get graph data
    graph_data = Node.get_graph_data(investigation_id)
    
    return graph_data