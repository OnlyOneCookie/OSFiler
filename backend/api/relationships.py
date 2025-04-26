"""
Relationships API endpoints.

This module provides API endpoints for managing relationships between nodes
within investigations, including creating, retrieving, updating, and deleting
relationships.
"""

import logging
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel, Field, validator, confloat

from backend.core.security import get_current_user
from backend.models import Relationship, Node, Investigation, COMMON_RELATIONSHIP_TYPES

# Configure logger
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix="/relationships", tags=["relationships"])

# Define API models
class RelationshipCreate(BaseModel):
    """Relationship creation model."""
    investigation_id: str
    source_node_id: str
    target_node_id: str
    type: str = Field(..., description="Type of relationship")
    strength: confloat(ge=0.0, le=1.0) = Field(0.5, description="Strength of relationship (0.0 to 1.0)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Additional data for the relationship")
    
    @validator('type')
    def validate_type(cls, v):
        if v not in COMMON_RELATIONSHIP_TYPES and not v.startswith("CUSTOM_"):
            raise ValueError(f"Invalid relationship type. Use one of the common types or prefix custom types with 'CUSTOM_'")
        return v


class RelationshipUpdate(BaseModel):
    """Relationship update model."""
    type: Optional[str] = None
    strength: Optional[confloat(ge=0.0, le=1.0)] = None
    data: Optional[Dict[str, Any]] = None
    
    @validator('type')
    def validate_type(cls, v):
        if v is not None and v not in COMMON_RELATIONSHIP_TYPES and not v.startswith("CUSTOM_"):
            raise ValueError(f"Invalid relationship type. Use one of the common types or prefix custom types with 'CUSTOM_'")
        return v


class RelationshipResponse(BaseModel):
    """Relationship response model."""
    id: str
    investigation_id: str
    source_node_id: str
    target_node_id: str
    type: str
    strength: float
    data: Dict[str, Any]
    created_at: str
    updated_at: str
    created_by: Optional[str] = None
    source_module: Optional[str] = None


@router.post("", response_model=RelationshipResponse)
async def create_relationship(
    relationship: RelationshipCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new relationship between nodes.
    
    Args:
        relationship (RelationshipCreate): The relationship data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The created relationship data.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(relationship.investigation_id)
    
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
    
    # Check if source node exists in the investigation
    source_node = Node.get_by_id(relationship.source_node_id)
    if not source_node or source_node.investigation_id != relationship.investigation_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source node not found in the investigation"
        )
    
    # Check if target node exists in the investigation
    target_node = Node.get_by_id(relationship.target_node_id)
    if not target_node or target_node.investigation_id != relationship.investigation_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target node not found in the investigation"
        )
    
    # Check if any relationship already exists between these nodes in either direction
    if Relationship.relationship_exists(
        source_id=relationship.source_node_id,
        target_id=relationship.target_node_id
    ) or Relationship.relationship_exists(
        source_id=relationship.target_node_id,
        target_id=relationship.source_node_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="These nodes are already connected. A relationship already exists between these nodes in either direction."
        )
    
    try:
        # Create relationship
        new_relationship = Relationship.create(
            investigation_id=relationship.investigation_id,
            source_node_id=relationship.source_node_id,
            target_node_id=relationship.target_node_id,
            type=relationship.type,
            strength=relationship.strength,
            data=relationship.data,
            created_by=current_user["id"]
        )
        
        logger.info(f"Created relationship: {new_relationship.type} (ID: {new_relationship.id})")
        
        return new_relationship.to_dict()
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating relationship: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating relationship: {str(e)}"
        )


@router.get("/{relationship_id}", response_model=RelationshipResponse)
async def get_relationship(
    relationship_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get a relationship by ID.
    
    Args:
        relationship_id (str): The relationship ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The relationship data.
    """
    # Get relationship
    relationship = Relationship.get_by_id(relationship_id)
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(relationship.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this relationship"
        )
    
    return relationship.to_dict()


@router.put("/{relationship_id}", response_model=RelationshipResponse)
async def update_relationship(
    relationship_id: str,
    relationship_update: RelationshipUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update a relationship.
    
    Args:
        relationship_id (str): The relationship ID.
        relationship_update (RelationshipUpdate): The relationship update data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The updated relationship data.
    """
    logger.info(f"Attempting to update relationship with ID: {relationship_id}")
    
    # Get relationship
    relationship = Relationship.get_by_id(relationship_id)
    
    if not relationship:
        logger.error(f"Relationship not found with ID: {relationship_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )
    
    logger.info(f"Found relationship: {relationship.type} (ID: {relationship.id})")
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(relationship.investigation_id)
    
    if not investigation:
        logger.error(f"Investigation not found for relationship: {relationship.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        logger.warning(f"User {current_user['id']} attempted to access relationship {relationship.id} without permission")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this relationship"
        )
    
    # Prepare update data
    update_data = relationship_update.dict(exclude_none=True)
    
    if not update_data:
        logger.warning(f"No update data provided for relationship: {relationship.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )
    
    logger.info(f"Updating relationship {relationship.id} with data: {update_data}")
    
    # Update relationship
    try:
        success = relationship.update(update_data)
        
        if not success:
            logger.error(f"Failed to update relationship: {relationship.id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update relationship"
            )
        
        logger.info(f"Successfully updated relationship: {relationship.type} (ID: {relationship.id})")
        
        # Get the updated relationship to return
        updated_relationship = Relationship.get_by_id(relationship_id)
        if not updated_relationship:
            logger.error(f"Failed to retrieve updated relationship: {relationship.id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated relationship"
            )
        
        return updated_relationship.to_dict()
        
    except Exception as e:
        logger.error(f"Error updating relationship {relationship.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating relationship: {str(e)}"
        )


@router.delete("/{relationship_id}")
async def delete_relationship(
    relationship_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a relationship.
    
    Args:
        relationship_id (str): The relationship ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, str]: A success message.
    """
    # Get relationship
    relationship = Relationship.get_by_id(relationship_id)
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(relationship.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this relationship"
        )
    
    # Delete relationship
    success = relationship.delete()
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete relationship"
        )
    
    logger.info(f"Deleted relationship: {relationship.type} (ID: {relationship.id})")
    
    return {"message": "Relationship deleted successfully"}


@router.get("", response_model=List[RelationshipResponse])
async def get_relationships_for_investigation(
    investigation_id: str = Query(..., description="Investigation ID"),
    type_filter: Optional[str] = Query(None, description="Filter relationships by type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all relationships for an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        type_filter (Optional[str]): Filter relationships by type.
        skip (int): Number of relationships to skip.
        limit (int): Maximum number of relationships to return.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of relationships.
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
    if type_filter and type_filter not in COMMON_RELATIONSHIP_TYPES and not type_filter.startswith("CUSTOM_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid relationship type"
        )
    
    # Get relationships
    relationships = Relationship.get_all_for_investigation(
        investigation_id=investigation_id,
        skip=skip,
        limit=limit,
        type_filter=type_filter
    )
    
    return [relationship.to_dict() for relationship in relationships]


@router.get("/count/{investigation_id}")
async def get_relationship_count(
    investigation_id: str,
    type_filter: Optional[str] = Query(None, description="Filter relationships by type"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, int]:
    """
    Get the number of relationships for an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        type_filter (Optional[str]): Filter relationships by type.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, int]: The relationship count.
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
    if type_filter and type_filter not in COMMON_RELATIONSHIP_TYPES and not type_filter.startswith("CUSTOM_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid relationship type"
        )
    
    # Get count
    count = Relationship.count_for_investigation(
        investigation_id=investigation_id,
        type_filter=type_filter
    )
    
    return {"count": count}


@router.get("/between")
async def get_relationships_between_nodes(
    source_id: str = Query(..., description="Source node ID"),
    target_id: str = Query(..., description="Target node ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all relationships between two nodes.
    
    Args:
        source_id (str): The source node ID.
        target_id (str): The target node ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of relationships between the nodes.
    """
    # Get source node to check permissions
    source_node = Node.get_by_id(source_id)
    
    if not source_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source node not found"
        )
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(source_node.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to these nodes"
        )
    
    # Get target node to verify it's in the same investigation
    target_node = Node.get_by_id(target_id)
    
    if not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target node not found"
        )
    
    if target_node.investigation_id != source_node.investigation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nodes must be in the same investigation"
        )
    
    # Get relationships
    relationships = Relationship.get_between_nodes(source_id, target_id)
    
    return [relationship.to_dict() for relationship in relationships]


@router.post("/check-exists")
async def check_relationship_exists(
    source_id: str = Body(..., embed=True),
    target_id: str = Body(..., embed=True),
    relationship_type: Optional[str] = Body(None, embed=True),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, bool]:
    """
    Check if a relationship exists between two nodes.
    
    Args:
        source_id (str): The source node ID.
        target_id (str): The target node ID.
        relationship_type (Optional[str]): The relationship type to check for.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, bool]: Whether the relationship exists.
    """
    # Get source node to check permissions
    source_node = Node.get_by_id(source_id)
    
    if not source_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source node not found"
        )
    
    # Check if user has access to the investigation
    investigation = Investigation.get_by_id(source_node.investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to these nodes"
        )
    
    # Get target node to verify it's in the same investigation
    target_node = Node.get_by_id(target_id)
    
    if not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target node not found"
        )
    
    if target_node.investigation_id != source_node.investigation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nodes must be in the same investigation"
        )
    
    # Check if relationship exists
    exists = Relationship.relationship_exists(
        source_id=source_id,
        target_id=target_id,
        type=relationship_type
    )
    
    return {"exists": exists}


@router.post("/create-or-update", response_model=RelationshipResponse)
async def create_or_update_relationship(
    relationship: RelationshipCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a relationship if it doesn't exist, or update it if it does.
    
    Args:
        relationship (RelationshipCreate): The relationship data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The created or updated relationship data.
    """
    # Check if investigation exists and user has access
    investigation = Investigation.get_by_id(relationship.investigation_id)
    
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
    
    # Check if source node exists in the investigation
    source_node = Node.get_by_id(relationship.source_node_id)
    if not source_node or source_node.investigation_id != relationship.investigation_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source node not found in the investigation"
        )
    
    # Check if target node exists in the investigation
    target_node = Node.get_by_id(relationship.target_node_id)
    if not target_node or target_node.investigation_id != relationship.investigation_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target node not found in the investigation"
        )
    
    try:
        # Create or update relationship
        result_relationship = Relationship.create_or_update(
            investigation_id=relationship.investigation_id,
            source_node_id=relationship.source_node_id,
            target_node_id=relationship.target_node_id,
            type=relationship.type,
            strength=relationship.strength,
            data=relationship.data,
            created_by=current_user["id"]
        )
        
        logger.info(f"Created or updated relationship: {result_relationship.type} (ID: {result_relationship.id})")
        
        return result_relationship.to_dict()
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating or updating relationship: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating or updating relationship: {str(e)}"
        )


@router.get("/types/{investigation_id}")
async def get_relationship_types(
    investigation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, int]:
    """
    Get counts of relationship types for an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, int]: Dictionary mapping relationship types to counts.
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
    
    # Get relationship types
    type_counts = Relationship.get_relationship_types_for_investigation(investigation_id)
    
    return type_counts