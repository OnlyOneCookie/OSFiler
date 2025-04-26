"""
OSFiler core package.

This package contains core functionality for the OSFiler application,
including configuration, database connection, and security.
"""

from backend.core.config import get_settings, get_config
from backend.core.database import get_db
from backend.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token,
    get_current_user
)

# Define the package exports
__all__ = [
    'get_settings',
    'get_config',
    'get_db',
    'get_password_hash',
    'verify_password',
    'create_access_token',
    'decode_token',
    'get_current_user'
]