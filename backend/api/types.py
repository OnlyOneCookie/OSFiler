"""
API routes for managing node and relationship types.

This module provides endpoints for creating, retrieving, updating, and deleting
types used for nodes and relationships in the system.
"""

import logging
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field, validator
from enum import Enum

from backend.models.type import Type, format_type_value
from backend.api.auth import get_current_user, get_admin_user

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/types", tags=["types"])

# Pydantic models
class EntityType(str, Enum):
    """Entity type enum for API"""
    NODE = "node"
    RELATIONSHIP = "relationship"

class TypeCreate(BaseModel):
    """Type creation model."""
    value: str = Field(..., min_length=1, max_length=100)
    entity_type: EntityType
    description: Optional[str] = Field(None, max_length=1000)
    
    @validator('value')
    def validate_value(cls, v):
        if len(v.strip()) == 0:
            raise ValueError('Type value cannot be empty')
        # Format the value to ensure consistency
        return format_type_value(v)

class TypeUpdate(BaseModel):
    """Type update model."""
    value: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    
    @validator('value')
    def validate_value(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError('Type value cannot be empty')
        # Format the value to ensure consistency
        if v is not None:
            return format_type_value(v)
        return v

class TypeResponse(BaseModel):
    """Type response model."""
    id: str
    value: str
    entity_type: str
    description: Optional[str]
    created_at: str
    updated_at: str
    is_system: bool

# API routes
@router.post("", response_model=TypeResponse)
async def create_type(
    type_data: TypeCreate,
    current_user: Dict[str, Any] = Depends(get_admin_user)  # Only admins can create types
) -> Dict[str, Any]:
    """
    Create a new type.
    
    Args:
        type_data (TypeCreate): The type data.
        current_user (Dict[str, Any]): The current authenticated admin user.
    
    Returns:
        Dict[str, Any]: The created type.
    """
    try:
        # Create the type
        new_type = Type.create(
            value=type_data.value,  # Value is already formatted by the validator
            entity_type=type_data.entity_type.value,
            description=type_data.description
        )
        
        logger.info(f"Created new {type_data.entity_type.value} type: {type_data.value}")
        return new_type.to_dict()
    except Exception as e:
        logger.error(f"Error creating type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating type: {str(e)}"
        )

@router.get("", response_model=List[TypeResponse])
async def get_types(
    entity_type: Optional[EntityType] = Query(None, description="Filter types by entity type (node or relationship)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all types, optionally filtered by entity type.
    
    Args:
        entity_type (Optional[EntityType]): Filter types by entity type.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of types.
    """
    try:
        # Get types
        types = Type.get_all(entity_type=entity_type.value if entity_type else None)
        
        return [type_obj.to_dict() for type_obj in types]
    except Exception as e:
        logger.error(f"Error retrieving types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving types: {str(e)}"
        )

@router.get("/node", response_model=List[TypeResponse])
async def get_node_types(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all node types.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of node types.
    """
    try:
        # Get node types
        types = Type.get_all(entity_type="node")
        
        return [type_obj.to_dict() for type_obj in types]
    except Exception as e:
        logger.error(f"Error retrieving node types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving node types: {str(e)}"
        )

@router.get("/relationship", response_model=List[TypeResponse])
async def get_relationship_types(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all relationship types.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of relationship types.
    """
    try:
        # Get relationship types
        types = Type.get_all(entity_type="relationship")
        
        return [type_obj.to_dict() for type_obj in types]
    except Exception as e:
        logger.error(f"Error retrieving relationship types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving relationship types: {str(e)}"
        )

@router.get("/{type_id}", response_model=TypeResponse)
async def get_type(
    type_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get a type by ID.
    
    Args:
        type_id (str): The type ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The type.
    """
    # Get type
    type_obj = Type.get_by_id(type_id)
    
    if not type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type not found"
        )
    
    return type_obj.to_dict()

@router.put("/{type_id}", response_model=TypeResponse)
async def update_type(
    type_id: str,
    type_update: TypeUpdate,
    current_user: Dict[str, Any] = Depends(get_admin_user)  # Only admins can update types
) -> Dict[str, Any]:
    """
    Update a type.
    
    Args:
        type_id (str): The type ID.
        type_update (TypeUpdate): The type data to update.
        current_user (Dict[str, Any]): The current authenticated admin user.
    
    Returns:
        Dict[str, Any]: The updated type.
    """
    # Get type
    type_obj = Type.get_by_id(type_id)
    
    if not type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type not found"
        )
    
    # Prepare update data
    update_data = {}
    if type_update.value is not None:
        update_data['value'] = type_update.value
    
    # Always include the description field in updates, even if it's None or empty
    # This allows explicitly setting an empty description
    update_data['description'] = type_update.description
    
    # Update the type
    success = type_obj.update(update_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update type"
        )
    
    logger.info(f"Updated type: {type_obj.value}")
    return type_obj.to_dict()

@router.delete("/{type_id}")
async def delete_type(
    type_id: str,
    current_user: Dict[str, Any] = Depends(get_admin_user)  # Only admins can delete types
) -> Dict[str, str]:
    """
    Delete a type.
    
    Args:
        type_id (str): The type ID.
        current_user (Dict[str, Any]): The current authenticated admin user.
    
    Returns:
        Dict[str, str]: A success message.
    """
    # Get type
    type_obj = Type.get_by_id(type_id)
    
    if not type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type not found"
        )
    
    # Check if this is a system type
    if type_obj.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system types"
        )
    
    # Delete the type
    success = type_obj.delete()
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete type. It may be in use by nodes or relationships."
        )
    
    logger.info(f"Deleted type: {type_obj.value}")
    return {"message": "Type deleted successfully"} 