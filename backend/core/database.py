"""
Database connection module.

This module provides database connection and management for the application
using SQLAlchemy with PostgreSQL.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, Generator

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session, Session

# Import configuration
from backend.core.config import get_settings

# Configure logger
logger = logging.getLogger(__name__)

# Base class for SQLAlchemy models
Base = declarative_base()

# Get database settings from config
db_settings = get_settings("db")
DATABASE_URL = db_settings["uri"]
logger.info(f"Using PostgreSQL database: {DATABASE_URL}")

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Check connection before using from pool
    echo=get_settings().get("debug", False)  # Log SQL when in debug mode
)

# Create session factory
session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create thread-local session with scoped_session
SessionLocal = scoped_session(session_factory)

# Initial schema SQL
INITIAL_SCHEMA = """
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Investigations table
CREATE TABLE investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}'
);

-- Types table
CREATE TABLE types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_system BOOLEAN DEFAULT FALSE,
  UNIQUE(value, entity_type)
);

-- Nodes table
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  type_id UUID REFERENCES types(id),
  name VARCHAR(255) NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  source_module VARCHAR(100)
);

-- Relationships table
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  type_id UUID REFERENCES types(id),
  strength FLOAT DEFAULT 0.5,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  source_module VARCHAR(100),
  UNIQUE(source_node_id, target_node_id, type)
);

-- Settings table
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('node_types', '[
  {"value": "PERSON", "description": "A person or individual"},
  {"value": "ORGANIZATION", "description": "A company, group, or organization"},
  {"value": "USERNAME", "description": "A username or handle used online"},
  {"value": "EMAIL", "description": "An email address"},
  {"value": "PHONE", "description": "A phone number or contact number"},
  {"value": "ADDRESS", "description": "A physical location or address"},
  {"value": "WEBSITE", "description": "A website, webpage or URL"},
  {"value": "SOCIAL_PROFILE", "description": "A social media profile or account"},
  {"value": "DOCUMENT", "description": "A document, file or written record"},
  {"value": "IMAGE", "description": "An image, photo or visual content"},
  {"value": "LOCATION", "description": "A geographic location or place"},
  {"value": "EVENT", "description": "An event, happening or occurrence"},
  {"value": "CUSTOM", "description": "A custom node type defined by the user"}
]', 'Valid node types'),
('relationship_types', '[
  {"value": "KNOWS", "description": "Knows or is acquainted with"},
  {"value": "OWNS", "description": "Owns or possesses"},
  {"value": "WORKS_AT", "description": "Works at or is employed by"},
  {"value": "MEMBER_OF", "description": "Is a member of"},
  {"value": "LOCATED_AT", "description": "Is located at or based at"},
  {"value": "CONNECTED_TO", "description": "Is connected to in some way"},
  {"value": "RELATED_TO", "description": "Is related to (generic relationship)"},
  {"value": "HAS_USERNAME", "description": "Has the username or is identified by"},
  {"value": "HAS_EMAIL", "description": "Has the email address or uses it"},
  {"value": "HAS_PHONE", "description": "Has the phone number or uses it"},
  {"value": "HAS_ADDRESS", "description": "Has the address or is located there"},
  {"value": "PARTICIPATED_IN", "description": "Participated in or was involved in"},
  {"value": "CREATED", "description": "Created or produced"},
  {"value": "VISITED", "description": "Visited or went to"},
  {"value": "CONTACTED", "description": "Contacted or communicated with"},
  {"value": "FAMILY_OF", "description": "Is family of or related to"},
  {"value": "FRIEND_OF", "description": "Is a friend of"},
  {"value": "COLLEAGUE_OF", "description": "Is a colleague or coworker of"},
  {"value": "CUSTOM", "description": "A custom relationship type defined by the user"}
]', 'Valid relationship types');
"""

def check_connection() -> Tuple[bool, Optional[str]]:
    """
    Check if the database connection is working.
        
        Returns:
        Tuple[bool, Optional[str]]: (success, error_message)
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            if result == 1:
                return True, None
            else:
                return False, "Database connection test failed"
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return False, str(e)

def initialize_database() -> None:
    """
    Initialize the database if needed. This will:
    - Create tables if they don't exist
    - Apply the initial schema if needed
    - Initialize default types
        """
    try:
        # Check if main tables exist
        inspector = inspect(engine)
        
        # If users table doesn't exist, assume we need to initialize everything
        if not inspector.has_table("users"):
            logger.info("Database appears to be empty. Initializing schema...")
            
            # Enable extension for UUID generation if not enabled
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
                conn.execute(text(INITIAL_SCHEMA))
                conn.commit()
                
            logger.info("Database schema initialized successfully")
        else:
            logger.info("Database schema already exists")
            
        # Create tables defined in SQLAlchemy models
        Base.metadata.create_all(bind=engine)
        
        # Initialize default types
        from ..models.type import Type
        Type.initialize_default_types()
        logger.info("Default types initialized")
        
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

def get_db() -> Generator[Session, None, None]:
    """
    Get a database session. This should be used within a context manager.
    
    Yields:
        Session: A SQLAlchemy session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# A simple function to run a raw SQL query and return results as dicts
def execute_query(query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Execute a raw SQL query and return results as a list of dictionaries.
        
        Args:
        query: SQL query string
        params: Optional parameters for the query
        
        Returns:
        List of dictionaries containing the query results
    """
    result = []
    with engine.connect() as conn:
        if params:
            rows = conn.execute(text(query), params)
        else:
            rows = conn.execute(text(query))
        
        if rows.returns_rows:
            # Convert to list of dicts
            keys = rows.keys()
            result = [dict(zip(keys, row)) for row in rows]
            
    return result

# Initialize database on module import
initialize_database()