"""
Settings API endpoints.

This module provides API endpoints for managing application settings,
including node types and relationship types.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Any

from backend.core.settings_manager import get_general_settings
from backend.core.security import get_current_user, get_current_admin_user

# Create router
router = APIRouter(
    prefix="/settings",
    tags=["settings"],
)

@router.get("/general")
async def get_general_app_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get the general application settings.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
        
    Returns:
        Dict[str, Any]: The general application settings.
    """
    return get_general_settings()

@router.get("/node-types")
async def get_node_types_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get the configured node types.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
        
    Returns:
        List[str]: List of node types.
    """
    return get_node_types()

@router.post("/node-types")
async def update_node_types_endpoint(
    node_types: List[str], 
    current_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    """
    Update the configured node types.
    
    Args:
        node_types (List[str]): New list of node types.
        current_user (Dict[str, Any]): The current authenticated user.
        
    Returns:
        Dict[str, Any]: Success message.
    """
    if not node_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Node types cannot be empty."
        )
    
    success = update_node_types(node_types)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update node types."
        )
    
    return {"message": "Node types updated successfully.", "node_types": node_types}

@router.get("/relationship-types")
async def get_relationship_types_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get the configured relationship types.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
        
    Returns:
        List[str]: List of relationship types.
    """
    return get_relationship_types()

@router.post("/relationship-types")
async def update_relationship_types_endpoint(
    relationship_types: List[str], 
    current_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    """
    Update the configured relationship types.
    
    Args:
        relationship_types (List[str]): New list of relationship types.
        current_user (Dict[str, Any]): The current authenticated user.
        
    Returns:
        Dict[str, Any]: Success message.
    """
    if not relationship_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Relationship types cannot be empty."
        )
    
    success = update_relationship_types(relationship_types)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update relationship types."
        )
    
    return {"message": "Relationship types updated successfully.", "relationship_types": relationship_types} 