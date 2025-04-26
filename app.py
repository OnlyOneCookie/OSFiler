"""
OSFiler application.
"""

import logging
import time
from typing import Dict, Any

from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api import router as api_router
from backend.core.config import get_settings
from backend.core.database import engine, SessionLocal, check_connection, initialize_database
from backend.core.security import get_current_user
from backend.models import User
from backend.modules.module_runner import get_module_runner

# Get application settings
settings = get_settings()

# Configure logging
logging.basicConfig(
    level=settings["log"]["level"],
    format=settings["log"]["format"],
    filename=settings["log"]["file"]
)
logger = logging.getLogger("osfiler")

# Create FastAPI application
app = FastAPI(
    title=settings["api"]["title"],
    description=settings["api"]["description"],
    version=settings["app_version"],
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings["security"]["cors_origins"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    Add process time header to responses.
    
    Args:
        request (Request): The incoming request.
        call_next: The next middleware/route handler.
    
    Returns:
        Response: The response with process time header.
    """
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Define startup event
@app.on_event("startup")
async def startup_event():
    """
    Startup event handler.
    
    This function is called when the application starts. It initializes
    the database connection, checks for admin users, and loads modules.
    
    Raises:
        Exception: If critical startup operations fail
    """
    logger.info("Starting up OSFiler application")
    
    # Initialize database schema
    try:
        initialize_database()
        logger.info("Database schema initialized and synchronized with models")
    except Exception as e:
        logger.critical(f"Failed to initialize database schema: {str(e)}")
        raise Exception(f"Database initialization failed: {str(e)}")
    
    # Check database connection
    is_connected, error_msg = check_connection()
    if not is_connected:
        logger.critical(f"Failed to connect to database: {error_msg}")
        raise Exception(f"Database connection failed: {error_msg}")
    else:
        logger.info("Database connection successful")
    
    # Check if any admin users exist
    try:
        db = SessionLocal()
        user_count = User.count()
        admin_count = User.count_admins()
        
        if user_count == 0 or admin_count == 0:
            # No users or admins found - notify about CLI command
            warning_msg = "No admin users found. Please create an admin user using the CLI command: python cli.py create-admin"
            logger.warning(warning_msg)
            print("\n⚠️  " + warning_msg + "\n")
        else:
            logger.info(f"Found {user_count} existing users ({admin_count} admins)")
        
    except Exception as e:
        logger.error(f"Error checking admin users: {str(e)}")
    finally:
        db.close()
    
    # Load modules
    try:
        module_runner = get_module_runner()
        modules = module_runner.get_modules()
        
        # Log modules summary
        if modules:
            logger.info(f"Loaded {len(modules)} modules: {', '.join([m['name'] for m in modules])}")
        else:
            logger.warning("No modules were loaded")
    except Exception as e:
        logger.error(f"Error loading modules: {str(e)}")
        # Non-critical error, don't halt startup
    
    logger.info("OSFiler application started successfully")

# Define shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """
    Shutdown event handler.
    
    This function is called when the application shuts down. It performs cleanup.
    """
    logger.info("Shutting down OSFiler application")
    
    # The engine and session factory will be cleaned up automatically
    # when Python exits, but we can dispose of the engine explicitly
    engine.dispose()
    
    logger.info("OSFiler application shutdown complete")

# Include API router
app.include_router(api_router)

# Define exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handle HTTP exceptions.
    
    Args:
        request (Request): The incoming request.
        exc (HTTPException): The exception.
    
    Returns:
        JSONResponse: The formatted error response.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle general exceptions.
    
    Args:
        request (Request): The incoming request.
        exc (Exception): The exception.
    
    Returns:
        JSONResponse: The formatted error response.
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

# Define helper endpoints
@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Dict[str, str]: Application health information.
    """
    return {
        "status": "ok",
        "version": settings["app_version"],
        "environment": settings["env"]
    }

@app.get("/api/settings")
async def get_public_settings():
    """
    Get public application settings.
    
    Returns:
        Dict[str, Any]: Public application settings.
    """
    return {
        "app_name": settings["app_name"],
        "app_version": settings["app_version"],
        "environment": settings["env"],
        "node_types": settings["node_types"],
        "relationship_types": settings["relationship_types"],
    }

@app.get("/api/me", dependencies=[Depends(get_current_user)])
async def authenticated_route(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Example authenticated route.
    
    Args:
        current_user (Dict[str, Any]): The current authenticated user.
    
    Returns:
        Dict[str, Any]: The current user information.
    """
    return current_user

# Serve static files in production
if settings["env"] == "production":
    app.mount("/", StaticFiles(directory="frontend/build", html=True), name="static")

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=settings["api"]["host"],
        port=settings["api"]["port"],
        reload=settings["debug"]
    )