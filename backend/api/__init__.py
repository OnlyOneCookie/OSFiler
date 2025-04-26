"""
API router initialization.

This module initializes the main API router and includes all endpoint routers
from the different API modules.
"""

from fastapi import APIRouter

from backend.api.auth import router as auth_router
from backend.api.investigations import router as investigations_router
from backend.api.nodes import router as nodes_router
from backend.api.relationships import router as relationships_router
from backend.api.modules import router as modules_router
from backend.api.settings import router as settings_router
from backend.api.types import router as types_router

# Create main API router
router = APIRouter(prefix="/api")

# Include all routers
router.include_router(auth_router)
router.include_router(investigations_router)
router.include_router(nodes_router)
router.include_router(relationships_router)
router.include_router(modules_router)
router.include_router(settings_router)
router.include_router(types_router)

# Define API export
__all__ = ["router"]