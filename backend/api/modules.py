"""
Modules API endpoints.

This module provides API endpoints for accessing and executing modules,
including listing available modules, getting module information, and
executing module functionality.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Body, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.core.security import get_current_user
from backend.modules.module_runner import get_module_runner
from backend.models import Investigation, Node

# Configure logger
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix="/modules", tags=["modules"])

# Define API models
class ModuleInfo(BaseModel):
    """Module information model."""
    name: str
    display_name: Optional[str] = Field(default=None, description="User-friendly display name for the module")
    description: str
    version: str
    author: str
    required_params: List[Dict[str, Any]]
    optional_params: List[Dict[str, Any]]
    category: str
    tags: List[str]
    created_at: str
    updated_at: str
    enabled: bool
    has_config: bool = Field(default=False, description="Whether the module has configuration options")
    config_schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON Schema for module configuration")


class ModuleExecuteResult(BaseModel):
    """Module execution result model."""
    status: str
    module: str
    timestamp: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.get("", response_model=List[ModuleInfo])
async def get_modules(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all available modules.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        List[Dict[str, Any]]: List of module information.
    """
    try:
        module_runner = get_module_runner()
        modules = module_runner.get_modules()
        
        # Ensure has_config is explicitly set for each module
        for module in modules:
            if 'has_config' not in module or module['has_config'] is None:
                module['has_config'] = False
        
        return modules
    except Exception as e:
        logger.error(f"Error getting modules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting modules: {str(e)}"
        )


@router.get("/{module_name}", response_model=ModuleInfo)
async def get_module(
    module_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get information about a specific module.
    
    Args:
        module_name (str): The name of the module.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: Module information.
    """
    try:
        module_runner = get_module_runner()
        module = module_runner.get_module(module_name)
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found"
            )
        
        return module.get_metadata()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting module {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting module: {str(e)}"
        )


@router.post("/{module_name}/execute", response_model=ModuleExecuteResult)
async def execute_module(
    module_name: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Execute a module with parameters.
    """
    try:
        # Detect content type
        content_type = request.headers.get("content-type", "")
        if content_type.startswith("multipart/form-data"):
            form = await request.form()
            params = dict(form)
            # Convert UploadFile fields
            for k, v in form.items():
                if isinstance(v, UploadFile):
                    params[k] = v
        else:
            params = await request.json()
        
        module_runner = get_module_runner()
        module = module_runner.get_module(module_name)
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found"
            )
        
        # Check if the required parameters are provided
        if not module.validate_params(params):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required parameters"
            )
        
        # Add the current user ID to the parameters
        params["current_user_id"] = current_user["id"]
        
        # If investigation_id is provided, check if user has access
        if "investigation_id" in params:
            investigation_id = params["investigation_id"]
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
        
        # Execute the module
        logger.info(f"Executing module {module_name} with params: {params}")
        result = module_runner.execute_module(module_name, params)
        
        # Log module execution result
        if result["status"] == "success":
            logger.info(f"Module {module_name} executed successfully")
        else:
            logger.error(f"Module {module_name} execution failed: {result.get('error')}")
        
        return result
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Error executing module {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error executing module {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing module: {str(e)}"
        )


@router.post("/{module_name}/reload")
async def reload_module(
    module_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Reload a module.
    
    Args:
        module_name (str): The name of the module to reload.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, str]: A success or error message.
    """
    try:
        user = current_user.get("is_admin", False)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can reload modules"
            )
        
        module_runner = get_module_runner()
        success = module_runner.reload_module(module_name)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found or could not be reloaded"
            )
        
        logger.info(f"Reloaded module: {module_name}")
        
        return {"message": f"Module '{module_name}' reloaded successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reloading module {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reloading module: {str(e)}"
        )


@router.post("/reload-all")
async def reload_all_modules(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Reload all modules.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, str]: A success or error message.
    """
    try:
        user = current_user.get("is_admin", False)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can reload modules"
            )
        
        module_runner = get_module_runner()
        module_runner.reload_modules()
        
        logger.info("Reloaded all modules")
        
        return {"message": "All modules reloaded successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reloading all modules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reloading all modules: {str(e)}"
        )


@router.get("/{module_name}/params")
async def get_module_params(
    module_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get the parameters required and optional for a module.
    
    Args:
        module_name (str): The name of the module.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, List[Dict[str, Any]]]: The required and optional parameters.
    """
    try:
        module_runner = get_module_runner()
        module = module_runner.get_module(module_name)
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found"
            )
        
        metadata = module.get_metadata()
        
        return {
            "required": metadata.get("required_params", []),
            "optional": metadata.get("optional_params", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting module parameters for {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting module parameters: {str(e)}"
        )


@router.post("/{module_name}/add_node")
async def add_module_node(
    module_name: str,
    node_data: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Add a node from a module to an investigation.
    Generic endpoint that any module can use to create nodes.
    
    Args:
        module_name (str): The module name.
        node_data (Dict[str, Any]): The node data to add.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The created node.
    """
    try:
        # Extract parameters
        node_type = node_data.get("type")
        node_name = node_data.get("name")
        data = node_data.get("data", {})
        investigation_id = node_data.get("investigation_id")
        
        # Validate required parameters
        if not node_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Node type is required"
            )
        
        if not node_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Node name is required"
            )
        
        if not investigation_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Investigation ID is required"
            )
        
        # Check if user has access to the investigation
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
        
        # Set source module in data
        if "source_module" not in data:
            data["source_module"] = module_name
            
        # Add created_by and created_at to data
        data["created_by"] = current_user["id"]
        data["created_at"] = datetime.utcnow().isoformat()
        
        # Create the node
        node = Node.create_for_investigation(
            investigation_id=investigation_id,
            type=node_type,
            name=node_name,
            data=data
        )
        
        return {
            "status": "success",
            "node": node.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding node from module {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding node: {str(e)}"
        )


@router.get("/{module_name}/config")
async def get_module_config(
    module_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get the configuration for a module.
    
    Args:
        module_name (str): The name of the module.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The module configuration.
    """
    try:
        if not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can view module configurations"
            )
        
        module_runner = get_module_runner()
        module = module_runner.get_module(module_name)
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found"
            )
        
        # Check if module has configuration
        if not module.has_config:
            return {
                "status": "success",
                "message": f"Module '{module_name}' does not have a configuration",
                "has_config": False,
                "config": {},
                "config_schema": {}
            }
        
        # Load and return configuration
        config = module.load_config(force_reload=True)
        
        return {
            "status": "success",
            "message": f"Configuration for module '{module_name}'",
            "has_config": True,
            "config": config,
            "config_schema": module.config_schema
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting configuration for module {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting configuration: {str(e)}"
        )


@router.post("/{module_name}/config")
async def update_module_config(
    module_name: str,
    module_config: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update the configuration for a module.
    
    Args:
        module_name (str): The name of the module.
        module_config (Dict[str, Any]): The updated module configuration.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: Status message.
    """
    try:
        if not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can update module configurations"
            )
        
        module_runner = get_module_runner()
        module = module_runner.get_module(module_name)
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found"
            )
        
        # Check if module has configuration
        if not module.has_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Module '{module_name}' does not support configuration"
            )
        
        # Save the configuration
        success = module.save_config(module_config)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save configuration for module '{module_name}'"
            )
        
        return {
            "status": "success",
            "message": f"Configuration for module '{module_name}' updated successfully",
            "config": module_config
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating configuration for module {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating configuration: {str(e)}"
        )


@router.get("/{module_name}/config_schema")
async def get_module_config_schema(
    module_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get the configuration schema for a module.
    
    Args:
        module_name (str): The name of the module.
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The module configuration schema.
    """
    try:
        module_runner = get_module_runner()
        module = module_runner.get_module(module_name)
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found"
            )
        
        return {
            "status": "success",
            "has_config": module.has_config,
            "config_schema": module.config_schema
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting configuration schema for module {module_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting configuration schema: {str(e)}"
        )