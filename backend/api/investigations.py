"""
Investigations API endpoints.

This module provides API endpoints for managing investigations, including
creating, retrieving, updating, and deleting investigations.
"""

import logging
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel, Field

from backend.core.security import get_current_user
from backend.models import Investigation, User

# Configure logger
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix="/investigations", tags=["investigations"])

# Define API models
class InvestigationCreate(BaseModel):
    """Investigation creation model."""
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field("", max_length=1000)
    tags: List[str] = Field(default_factory=list)


class InvestigationUpdate(BaseModel):
    """Investigation update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None
    is_archived: Optional[bool] = None


class InvestigationResponse(BaseModel):
    """Investigation response model."""
    id: str
    title: str
    description: str
    created_by: str
    created_at: str
    updated_at: str
    is_archived: bool
    tags: List[str]
    node_count: Optional[int] = None
    relationship_count: Optional[int] = None


@router.post("", response_model=InvestigationResponse)
async def create_investigation(
    investigation: InvestigationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new investigation.
    
    Args:
        investigation (InvestigationCreate): The investigation data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The created investigation data.
    """
    try:
        # Create new investigation
        inv = Investigation.create(
            title=investigation.title,
            description=investigation.description,
            created_by=current_user["id"],
            tags=investigation.tags
        )
        
        # Add node count and relationship count to response
        response = inv.to_dict()
        response["node_count"] = 0
        response["relationship_count"] = 0
        
        logger.info(f"Created new investigation: {inv.title} (ID: {inv.id})")
        
        return response
        
    except Exception as e:
        logger.error(f"Error creating investigation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating investigation: {str(e)}"
        )


@router.get("", response_model=List[InvestigationResponse])
async def get_investigations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_archived: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all investigations for the current user.
    
    Args:
        skip (int): Number of investigations to skip.
        limit (int): Maximum number of investigations to return.
        include_archived (bool): Whether to include archived investigations.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of investigations.
    """
    try:
        # Get investigations
        investigations = Investigation.get_all_for_user(
            user_id=current_user["id"],
            skip=skip,
            limit=limit,
            include_archived=include_archived
        )
        
        # Add node count and relationship count to each investigation
        response = []
        for inv in investigations:
            inv_dict = inv.to_dict()
            inv_dict["node_count"] = inv.get_node_count()
            inv_dict["relationship_count"] = inv.get_relationship_count()
            response.append(inv_dict)
        
        return response
        
    except Exception as e:
        logger.error(f"Error retrieving investigations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving investigations: {str(e)}"
        )


@router.get("/count")
async def get_investigation_count(
    include_archived: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, int]:
    """
    Get the total number of investigations for the current user.
    
    Args:
        include_archived (bool): Whether to include archived investigations.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, int]: The count of investigations.
    """
    try:
        # Get count
        count = Investigation.count_for_user(
            user_id=current_user["id"],
            include_archived=include_archived
        )
        
        return {"count": count}
        
    except Exception as e:
        logger.error(f"Error counting investigations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error counting investigations: {str(e)}"
        )


@router.get("/search", response_model=List[InvestigationResponse])
async def search_investigations(
    query: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_archived: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Search for investigations by title or description.
    
    Args:
        query (str): The search query.
        skip (int): Number of investigations to skip.
        limit (int): Maximum number of investigations to return.
        include_archived (bool): Whether to include archived investigations.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of matching investigations.
    """
    try:
        # Search investigations
        investigations = Investigation.search(
            user_id=current_user["id"],
            query_text=query,
            skip=skip,
            limit=limit,
            include_archived=include_archived
        )
        
        # Add node count and relationship count to each investigation
        response = []
        for inv in investigations:
            inv_dict = inv.to_dict()
            inv_dict["node_count"] = inv.get_node_count()
            inv_dict["relationship_count"] = inv.get_relationship_count()
            response.append(inv_dict)
        
        return response
        
    except Exception as e:
        logger.error(f"Error searching investigations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching investigations: {str(e)}"
        )


@router.get("/search-by-tags", response_model=List[InvestigationResponse])
async def search_investigations_by_tags(
    tags: List[str] = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_archived: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Search for investigations by tags.
    
    Args:
        tags (List[str]): The tags to search for.
        skip (int): Number of investigations to skip.
        limit (int): Maximum number of investigations to return.
        include_archived (bool): Whether to include archived investigations.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of matching investigations.
    """
    try:
        # Search investigations by tags
        investigations = Investigation.search_by_tags(
            user_id=current_user["id"],
            tags=tags,
            skip=skip,
            limit=limit,
            include_archived=include_archived
        )
        
        # Add node count and relationship count to each investigation
        response = []
        for inv in investigations:
            inv_dict = inv.to_dict()
            inv_dict["node_count"] = inv.get_node_count()
            inv_dict["relationship_count"] = inv.get_relationship_count()
            response.append(inv_dict)
        
        return response
        
    except Exception as e:
        logger.error(f"Error searching investigations by tags: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching investigations by tags: {str(e)}"
        )


@router.get("/{investigation_id}", response_model=InvestigationResponse)
async def get_investigation(
    investigation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get an investigation by ID.
    
    Args:
        investigation_id (str): The investigation ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The investigation data.
    """
    # Get investigation
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    # Check if user has access to investigation
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Add node count and relationship count to response
    response = investigation.to_dict()
    response["node_count"] = investigation.get_node_count()
    response["relationship_count"] = investigation.get_relationship_count()
    
    return response


@router.put("/{investigation_id}", response_model=InvestigationResponse)
async def update_investigation(
    investigation_id: str,
    investigation_update: InvestigationUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        investigation_update (InvestigationUpdate): The investigation update data.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The updated investigation data.
    """
    # Get investigation
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    # Check if user has access to investigation
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Prepare update data
    update_data = investigation_update.dict(exclude_none=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )
    
    # Update investigation
    success = investigation.update(update_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update investigation"
        )
    
    # Add node count and relationship count to response
    response = investigation.to_dict()
    response["node_count"] = investigation.get_node_count()
    response["relationship_count"] = investigation.get_relationship_count()
    
    logger.info(f"Updated investigation: {investigation.title} (ID: {investigation.id})")
    
    return response


@router.delete("/{investigation_id}")
async def delete_investigation(
    investigation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, str]: A success message.
    """
    # Get investigation
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    # Check if user has access to investigation
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Delete investigation
    success = investigation.delete()
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete investigation"
        )
    
    logger.info(f"Deleted investigation: {investigation.title} (ID: {investigation.id})")
    
    return {"message": "Investigation deleted successfully"}


@router.post("/{investigation_id}/archive")
async def archive_investigation(
    investigation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Archive an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, str]: A success message.
    """
    # Get investigation
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    # Check if user has access to investigation
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Archive investigation
    success = investigation.archive()
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive investigation"
        )
    
    logger.info(f"Archived investigation: {investigation.title} (ID: {investigation.id})")
    
    return {"message": "Investigation archived successfully"}


@router.post("/{investigation_id}/unarchive")
async def unarchive_investigation(
    investigation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Unarchive an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, str]: A success message.
    """
    # Get investigation
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    # Check if user has access to investigation
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Unarchive investigation
    success = investigation.unarchive()
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unarchive investigation"
        )
    
    logger.info(f"Unarchived investigation: {investigation.title} (ID: {investigation.id})")
    
    return {"message": "Investigation unarchived successfully"}


@router.get("/{investigation_id}/export")
async def export_investigation(
    investigation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Export an investigation.
    
    Args:
        investigation_id (str): The investigation ID.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The exported investigation data.
    """
    # Get investigation
    investigation = Investigation.get_by_id(investigation_id)
    
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation not found"
        )
    
    # Check if user has access to investigation
    if investigation.created_by != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this investigation"
        )
    
    # Export investigation
    export_data = investigation.export_data()
    
    logger.info(f"Exported investigation: {investigation.title} (ID: {investigation.id})")
    
    return export_data


@router.post("/import")
async def import_investigation(
    import_data: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Import an investigation.
    
    Args:
        import_data (Dict[str, Any]): The investigation data to import.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The imported investigation data and messages.
    """
    try:
        # Import investigation
        investigation, messages = Investigation.import_data(
            user_id=current_user["id"],
            import_data=import_data
        )
        
        if not investigation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to import investigation: " + ", ".join(messages)
            )
        
        logger.info(f"Imported investigation: {investigation.title} (ID: {investigation.id})")
        
        # Add node count to response
        response = investigation.to_dict()
        response["node_count"] = investigation.get_node_count()
        response["messages"] = messages
        
        return response
        
    except Exception as e:
        logger.error(f"Error importing investigation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing investigation: {str(e)}"
        )