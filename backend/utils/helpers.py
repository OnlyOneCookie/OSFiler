"""
Helper functions.

This module provides utility functions that are used throughout the
application for common tasks.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

def generate_uuid() -> str:
    """
    Generate a UUID string.
    
    Returns:
        str: A new UUID string.
    """
    return str(uuid.uuid4())

def format_datetime(dt: datetime) -> str:
    """
    Format a datetime object as an ISO string.
    
    Args:
        dt (datetime): The datetime to format.
    
    Returns:
        str: ISO-formatted datetime string.
    """
    return dt.isoformat()

def parse_datetime(dt_str: str) -> datetime:
    """
    Parse an ISO datetime string into a datetime object.
    
    Args:
        dt_str (str): The ISO datetime string.
    
    Returns:
        datetime: The parsed datetime object.
    """
    return datetime.fromisoformat(dt_str)

def sanitize_string(text: str) -> str:
    """
    Sanitize a string by removing any potentially harmful characters.
    
    Args:
        text (str): The string to sanitize.
    
    Returns:
        str: The sanitized string.
    """
    # This is a simple implementation - in a production environment,
    # you might want a more comprehensive sanitization approach
    if not text:
        return ""
    return text.strip()

def validate_json(json_str: str) -> Union[Dict[str, Any], List[Any], None]:
    """
    Validate and parse a JSON string.
    
    Args:
        json_str (str): The JSON string to validate.
    
    Returns:
        Union[Dict[str, Any], List[Any], None]: The parsed JSON data, or None if invalid.
    """
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.warning(f"Invalid JSON: {str(e)}")
        return None

def merge_dicts(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge two dictionaries, with dict2 values taking precedence.
    
    Args:
        dict1 (Dict[str, Any]): The first dictionary.
        dict2 (Dict[str, Any]): The second dictionary.
    
    Returns:
        Dict[str, Any]: The merged dictionary.
    """
    result = dict1.copy()
    result.update(dict2)
    return result

def filter_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove None values from a dictionary.
    
    Args:
        data (Dict[str, Any]): The dictionary to filter.
    
    Returns:
        Dict[str, Any]: Dictionary with None values removed.
    """
    return {k: v for k, v in data.items() if v is not None}

def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate a string to a maximum length, adding a suffix if needed.
    
    Args:
        text (str): The string to truncate.
        max_length (int): The maximum length.
        suffix (str): Suffix to add if truncated.
    
    Returns:
        str: The truncated string.
    """
    if not text or len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix

def is_valid_email(email: str) -> bool:
    """
    Check if a string is a valid email address.
    
    This is a simple validation that checks for @ symbol and domain.
    For more comprehensive validation, consider using a library like email-validator.
    
    Args:
        email (str): The email to validate.
    
    Returns:
        bool: True if email is valid, False otherwise.
    """
    if not email or "@" not in email:
        return False
    
    username, domain = email.rsplit("@", 1)
    if not username or not domain or "." not in domain:
        return False
    
    return True

def safe_get(obj: Dict[str, Any], key: str, default: Any = None) -> Any:
    """
    Safely get a value from a dictionary, returning a default if the key doesn't exist.
    
    Args:
        obj (Dict[str, Any]): The dictionary to get from.
        key (str): The key to get.
        default (Any): Default value if key doesn't exist.
    
    Returns:
        Any: The value or default.
    """
    try:
        return obj.get(key, default)
    except (AttributeError, TypeError):
        return default

def format_error(error: Exception) -> Dict[str, str]:
    """
    Format an exception into a standardized error dictionary.
    
    Args:
        error (Exception): The exception to format.
    
    Returns:
        Dict[str, str]: Formatted error dictionary.
    """
    return {
        "error": error.__class__.__name__,
        "message": str(error),
        "timestamp": format_datetime(datetime.utcnow())
    }

def parse_list_param(param: Optional[str]) -> List[str]:
    """
    Parse a comma-separated string into a list of strings.
    
    Args:
        param (Optional[str]): The comma-separated string.
    
    Returns:
        List[str]: List of strings.
    """
    if not param:
        return []
    return [item.strip() for item in param.split(",") if item.strip()]