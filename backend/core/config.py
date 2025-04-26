"""
Configuration settings.

This module provides a centralized configuration management system
for the OSFiler application. It loads settings from environment
variables and provides default values for development.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Import settings manager
from backend.core.settings_manager import initialize_settings_file

# Load environment variables from .env file if it exists
env_path = Path(__file__).parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Base directory of the project
BASE_DIR = Path(__file__).parent.parent

# Application metadata
APP_NAME = "OSFiler"
APP_VERSION = "0.1.0"
APP_DESCRIPTION = "OSINT Profiling Tool"

# Environment settings
ENV = os.getenv("OSFILER_ENV", "development")
DEBUG = ENV == "development"

# Security settings
SECRET_KEY = os.getenv("OSFILER_SECRET_KEY", "dev_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("OSFILER_TOKEN_EXPIRE_MINUTES", "60"))
CORS_ORIGINS = os.getenv("OSFILER_CORS_ORIGINS", "http://localhost:3000").split(",")

# Database settings
DB_HOST = os.getenv("DB_HOST", os.getenv("OSFILER_DB_HOST", "localhost"))
DB_PORT = int(os.getenv("DB_PORT", os.getenv("OSFILER_DB_PORT", "5432")))
DB_USER = os.getenv("DB_USER", os.getenv("OSFILER_DB_USER", "osfiler"))
DB_PASS = os.getenv("DB_PASSWORD", os.getenv("OSFILER_DB_PASS", "osfiler"))
DB_NAME = os.getenv("DB_NAME", os.getenv("OSFILER_DB_NAME", "osfiler"))
DB_URI = os.getenv("DATABASE_URL", f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

# API settings
API_PREFIX = "/api"
API_VERSION = "v1"
API_TITLE = f"{APP_NAME} API"
API_DESCRIPTION = f"API for {APP_DESCRIPTION}"
API_HOST = os.getenv("OSFILER_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("OSFILER_API_PORT", "5000"))

# Module settings
MODULES_DIR = f"{BASE_DIR}/backend/modules/addons"
ENABLED_MODULES: List[str] = os.getenv(
    "OSFILER_ENABLED_MODULES", 
    "usernames_module"
).split(",")

# Logging settings
LOG_LEVEL = os.getenv("OSFILER_LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s - %(message)s"
LOG_DIR = BASE_DIR / "logs"
LOG_FILE = LOG_DIR / "osfiler.log"

# Configuration folder
CONFIG_DIR = BASE_DIR / "config"

# Create log directory if it doesn't exist
if not LOG_DIR.exists():
    LOG_DIR.mkdir(parents=True)

# Create config directory if it doesn't exist
if not CONFIG_DIR.exists():
    CONFIG_DIR.mkdir(parents=True)

# Initialize settings file
initialize_settings_file()

def get_config() -> Dict[str, Any]:
    """
    Returns a dictionary of all configuration settings.
    
    Returns:
        Dict[str, Any]: Dictionary containing all configuration settings.
    """
    
    return {
        "app_name": APP_NAME,
        "app_version": APP_VERSION,
        "app_description": APP_DESCRIPTION,
        "env": ENV,
        "debug": DEBUG,
        "db": {
            "host": DB_HOST,
            "port": DB_PORT,
            "user": DB_USER,
            "password": DB_PASS,
            "name": DB_NAME,
            "uri": DB_URI,
        },
        "api": {
            "prefix": API_PREFIX,
            "version": API_VERSION,
            "title": API_TITLE,
            "description": API_DESCRIPTION,
            "host": API_HOST,
            "port": API_PORT,
        },
        "modules": {
            "dir": str(MODULES_DIR),
            "enabled": ENABLED_MODULES,
        },
        "log": {
            "level": LOG_LEVEL,
            "format": LOG_FORMAT,
            "dir": str(LOG_DIR),
            "file": str(LOG_FILE),
        },
        "security": {
            "secret_key": SECRET_KEY,
            "algorithm": ALGORITHM,
            "access_token_expire_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
            "cors_origins": CORS_ORIGINS,
        }
    }

def get_settings(section: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns settings for a specific section or all settings if no section is specified.
    
    Args:
        section (Optional[str]): The configuration section to retrieve.
            If None, returns all settings.
    
    Returns:
        Dict[str, Any]: Dictionary containing the requested settings.
    
    Raises:
        KeyError: If the specified section does not exist.
    """
    config = get_config()
    if section is None:
        return config
    
    if section not in config:
        raise KeyError(f"Configuration section '{section}' not found")
    
    return config[section]