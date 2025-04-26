"""
Settings manager.

This module provides functionality to read and write application settings
from an INI file. It focuses on settings that can be modified by administrators
through the application interface, such as node types and relationship types.
"""

import configparser
from pathlib import Path
from typing import Dict, Any
import logging

# Get logger
logger = logging.getLogger("osfiler")

# Base directory of the project
BASE_DIR = Path(__file__).parent.parent.parent

# Settings file path
SETTINGS_FILE = BASE_DIR / "config/settings.ini"

def initialize_settings_file():
    """
    Initialize the settings file with default values if it doesn't exist.
    """
    if not SETTINGS_FILE.exists():
        logger.info(f"Settings file not found. Creating new settings file at {SETTINGS_FILE}")
        
        config = configparser.ConfigParser()
        
        # Add general section
        config['general'] = {
            'app_name': 'OSFiler',
            'app_version': '0.1.0',
            'app_description': 'OSFiler is a tool for analyzing and visualizing data from various sources.',
            'env': 'development',
            'debug': True,
        }
        
        # Write settings to file
        with open(SETTINGS_FILE, 'w+') as configfile:
            config.write(configfile)
    
    else:
        logger.info(f"Settings file found at {SETTINGS_FILE}")

def get_general_settings() -> Dict[str, Any]:
    """
    Get all general settings.
    
    Returns:
        Dict[str, Any]: Dictionary containing all general settings.
    """
    config = configparser.ConfigParser()
    config.read(SETTINGS_FILE)
    return config['general']

def update_general_settings(settings: Dict[str, Any]) -> None:
    """
    Update general settings in the settings file.
    """
    config = configparser.ConfigParser()
    config.read(SETTINGS_FILE)
    config['general'] = settings