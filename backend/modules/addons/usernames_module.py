"""
Username search module.

This module provides functionality to search for usernames across multiple
social media platforms. It uses a generic approach with a JSON configuration
file to define platform-specific search parameters.
"""

import logging
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import requests

# Import BaseModule using absolute import
from backend.modules.base import BaseModule
from backend.modules.utils import ModuleResultBuilder
from backend.utils.helpers import sanitize_string, filter_none_values

# Configure logger
logger = logging.getLogger(__name__)

# Default request timeout in seconds
DEFAULT_TIMEOUT = 10

# Default user agent for requests
DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

class UsernamesModule(BaseModule):
    """
    Username search module for OSFiler.
    
    This module allows searching for usernames across social media platforms
    and returns a list of found accounts that can be added to the investigation.
    """
    
    def __init__(self, **kwargs):
        """
        Initialize the username search module.
        """
        # Initialize the base class first
        super().__init__(**kwargs)
        
        # Set our module metadata
        self.name = "usernames_module"
        self.display_name = "Username Search"
        self.description = "Search for usernames across social media platforms"
        self.version = "0.1.0"
        self.author = "OSFiler Team"
        self.required_params = [
            {
                "name": "username",
                "type": "string",
                "description": "The username to search for"
            }
        ]
        
        # Define configuration schema
        self.config_schema = {
            "timeout": {
                "type": "integer",
                "description": "Request timeout in seconds",
                "default": DEFAULT_TIMEOUT
            },
            "user_agent": {
                "type": "string",
                "description": "User agent to use for requests",
                "default": DEFAULT_USER_AGENT
            },
            "platforms_refresh_interval": {
                "type": "integer",
                "description": "How often to refresh platforms data (in hours)",
                "default": 24
            },
            "platforms": {
                "type": "object",
                "description": "Social media platforms configuration",
                "default": {}
            }
        }
        
        # Module has configuration - set this after all other attributes
        self.has_config = True
        
        # Initialize platforms data tracking
        self.platforms_last_loaded = None
        
        # Call load_config to initialize platforms
        self.load_config()
        
        # Validate platforms configuration
        self._validate_platforms_config()
        
        # Set platforms_last_loaded after initial load
        self.platforms_last_loaded = datetime.now()
        
        # Now that config is loaded, set optional params using config values
        config_timeout = self.config.get("timeout", DEFAULT_TIMEOUT)
        self.optional_params = [
            {
                "name": "timeout",
                "type": "integer",
                "description": f"Timeout for requests in seconds (default: {config_timeout})",
                "default": config_timeout
            }
        ]
        
        self.category = "osint"
        self.tags = ["username", "social media", "search"]
        
        # Load default platforms if none exist
        if not self.config.get("platforms"):
            self._create_default_platforms()
    
    def get_default_config(self) -> Dict[str, Any]:
        """
        Override the default config method to provide module-specific defaults.
        
        Returns:
            Dict[str, Any]: Default configuration values
        """
        default_config = {
            "timeout": DEFAULT_TIMEOUT,
            "user_agent": DEFAULT_USER_AGENT,
            "platforms_refresh_interval": 24,
            "platforms": self._get_default_platforms()
        }
        
        logger.info(f"Generated default config for {self.name} with {len(default_config['platforms'])} platforms")
        return default_config
    
    def _get_default_platforms(self) -> Dict[str, Any]:
        """
        Get default social media platforms configuration.
        
        Returns:
            Dict[str, Any]: Default platforms configuration
        """
        # Basic platforms to start with
        platforms = {
                    "Instagram": {
                        "url": "https://www.instagram.com/{}",
                        "urlMain": "https://www.instagram.com",
                        "errorMsg": ["Sorry, this page isn't available."],
                        "errorType": "html",
                        "regexCheck": "^[A-Za-z0-9._](?!.*[..])(?!.*[_.]{2})[A-Za-z0-9._]{0,28}[A-Za-z0-9]$"
                    },
                }
                
        return platforms
    
    def _create_default_platforms(self) -> None:
        """
        Create default platforms configuration if none exists.
        """
        platforms_config = self._get_default_platforms()
        
        # Update the configuration
        current_config = self.config or {}
        current_config["platforms"] = platforms_config
        self.save_config(current_config)
        
        logger.info(f"Created default platforms configuration with {len(platforms_config)} platforms")
    
    def _validate_platforms_config(self) -> None:
        """
        Validate platforms configuration to handle potential issues.
        
        This method checks for duplicated platforms with different cases and
        normalizes error types for consistency.
        """
        if not self.has_config or not self.config:
            return
            
        platforms = self.config.get("platforms", {})
        if not platforms:
            return
            
        # Check for duplicated platforms with different cases
        platform_names_lower = {}
        duplicates_found = False
        
        for platform_name in list(platforms.keys()):
            platform_lower = platform_name.lower()
            
            if platform_lower in platform_names_lower:
                # Found a duplicate with different case
                logger.warning(f"Found duplicate platform name: '{platform_name}' and '{platform_names_lower[platform_lower]}'")
                duplicates_found = True
                
                # If the lowercase version exists, keep it and merge properties
                if platform_lower in platforms:
                    # Keep lowercase version, merge relevant properties from uppercase
                    uppercase_config = platforms[platform_name]
                    lowercase_config = platforms[platform_lower]
                    
                    # Only update properties that are more specific in the duplicate
                    for key, value in uppercase_config.items():
                        if key not in lowercase_config or lowercase_config[key] == "":
                            lowercase_config[key] = value
                    
                    # Remove the duplicate
                    platforms.pop(platform_name)
                    logger.info(f"Merged properties from '{platform_name}' into '{platform_lower}'")
                else:
                    # Add lowercase version
                    platforms[platform_lower] = platforms[platform_name]
                    # Remove the non-lowercase version
                    platforms.pop(platform_name)
                    logger.info(f"Converted platform name '{platform_name}' to lowercase '{platform_lower}'")
            else:
                platform_names_lower[platform_lower] = platform_name
                
                # Normalize error types
                if platforms[platform_name].get("errorType") == "html":
                    logger.debug(f"Normalizing errorType from 'html' to 'message' for {platform_name}")
                    platforms[platform_name]["errorType"] = "message"
        
        # Save config if changes were made
        if duplicates_found:
            self.config["platforms"] = platforms
            self.save_config(self.config)
            logger.info("Saved normalized platform configuration")
    
    def _should_reload_platforms(self) -> bool:
        """
        Check if platforms data should be reloaded based on refresh interval.
        
        Returns:
            bool: True if platforms should be reloaded, False otherwise
        """
        # If platforms have never been loaded, reload them
        if self.platforms_last_loaded is None:
            logger.debug("Platforms have never been loaded, forcing reload")
            return True
        
        # Get refresh interval from config (in hours, default 24)
        refresh_interval = self.config.get("platforms_refresh_interval", 24)
        
        # Calculate time difference
        time_diff = datetime.now() - self.platforms_last_loaded
        hours_diff = time_diff.total_seconds() / 3600
        
        # Log information about refresh timing
        logger.debug(f"Platform data last loaded: {self.platforms_last_loaded}")
        logger.debug(f"Current refresh interval: {refresh_interval} hours")
        logger.debug(f"Hours since last refresh: {hours_diff:.2f}")
        
        # Return True if enough time has passed
        return hours_diff >= refresh_interval
    
    def validate_username_for_platform(self, username: str, platform: str) -> bool:
        """
        Validate if a username matches the regex pattern for a platform.
        
        Args:
            username (str): The username to validate.
            platform (str): The platform to validate against.
        
        Returns:
            bool: True if the username is valid for the platform, False otherwise.
        """
        platforms = self.config.get("platforms", {})
        platform_config = platforms.get(platform, {})
        regex_pattern = platform_config.get("regexCheck", "")
        
        if not regex_pattern:
            # If no regex pattern is defined, consider it valid
            logger.debug(f"No regex pattern defined for {platform}, assuming username '{username}' is valid")
            return True
        
        try:
            is_valid = bool(re.match(regex_pattern, username))
            if not is_valid:
                logger.info(f"Username '{username}' does not match regex pattern for {platform}: {regex_pattern}")
            return is_valid
        except Exception as e:
            logger.error(f"Error validating username for {platform}: {str(e)}")
            # Consider it valid if there's an error in the regex
            return True
    
    def _check_username_exists(self, username: str, platform: str, timeout: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if a username exists on a specific platform.
        
        Args:
            username (str): The username to check.
            platform (str): The platform to check on.
            timeout (int): Timeout for the request in seconds.
        
        Returns:
            Tuple[bool, Dict[str, Any]]: A tuple containing:
                - bool: True if the username exists, False otherwise.
                - Dict[str, Any]: Additional data about the account if available.
        """
        platforms = self.config.get("platforms", {})
        platform_config = platforms.get(platform, {})
        if not platform_config:
            logger.warning(f"Platform {platform} not found in configuration")
            return False, {}
        
        # Format the URL with the username
        url = platform_config.get("url", "").format(username)
        if not url:
            logger.warning(f"URL not defined for platform {platform}")
            return False, {}
        
        # Get error type and error messages
        error_type = platform_config.get("errorType", "")
        error_msgs = platform_config.get("errorMsg", [])
        
        # First check if the username is valid for this platform
        is_valid = self.validate_username_for_platform(username, platform)
        if not is_valid:
            logger.info(f"Username '{username}' is not valid for {platform} based on regex pattern")
            return False, {
                "url": url,
                "platform": platform,
                "platform_name": platform.capitalize(),
                "reason": "invalid_format"
            }
        
        # Get user agent from config
        user_agent = self.config.get("user_agent", DEFAULT_USER_AGENT)
        
        # Prepare the request headers
        headers = {
            "User-Agent": user_agent,
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache"
        }
        
        # Add any custom headers from the platform config
        custom_headers = platform_config.get("headers", {})
        headers.update(custom_headers)
        
        try:
            # Check if this platform uses a different API endpoint for probing
            url_probe = platform_config.get("urlProbe", "")
            if url_probe:
                # Format the probe URL with the username
                url_probe = url_probe.format(username)
                request_method = platform_config.get("request_method", "GET")
                request_payload = platform_config.get("request_payload", {})
                
                # Format any payload fields that contain {}
                if request_payload:
                    for key, value in request_payload.items():
                        if isinstance(value, str) and "{}" in value:
                            request_payload[key] = value.format(username)
                
                logger.debug(f"Using probe URL for {platform}: {url_probe}, method: {request_method}")
                
                # Make the API request
                if request_method.upper() == "POST":
                    response = requests.post(
                        url_probe, 
                        headers=headers, 
                        json=request_payload if request_payload else None,
                        timeout=timeout
                    )
                else:
                    response = requests.get(
                        url_probe, 
                        headers=headers, 
                        timeout=timeout
                    )
            else:
                # Send the standard request
                response = requests.get(url, headers=headers, timeout=timeout)
            
            # Check for status_code error type
            if error_type == "status_code":
                # If the response status code is not 200, the username doesn't exist
                exists = response.status_code == 200
                logger.debug(f"Platform {platform} uses status code checks. Status: {response.status_code}, Exists: {exists}")
                return exists, {
                    "status_code": response.status_code, 
                    "url": url, 
                    "platform": platform, 
                    "platform_name": platform.capitalize(),
                    "reason": "status_code" if not exists else None
                }
            
            # For message or html error type, check if any error messages are in the response
            elif error_type in ["message", "html"]:
                content = response.text.lower()
                
                # First check if we got a successful response
                if response.status_code != 200:
                    logger.debug(f"Request to {platform} for username '{username}' returned status code {response.status_code}")
                    return False, {
                        "status_code": response.status_code,
                        "url": url,
                        "platform": platform,
                        "platform_name": platform.capitalize(),
                        "reason": "http_error"
                    }
                
                # Check each error message for presence in the content
                for error_msg in error_msgs:
                    error_msg_lower = error_msg.lower()
                    if error_msg_lower in content:
                        logger.debug(f"Found error message '{error_msg}' in response from {platform} for username '{username}'")
                        return False, {
                            "url": url,
                            "platform": platform,
                            "platform_name": platform.capitalize(),
                            "reason": "error_message",
                            "error_msg": error_msg
                        }
                
                # No error messages found, username likely exists
                logger.debug(f"No error messages found for {platform} username '{username}', account likely exists")
                return True, {
                    "url": url, 
                    "platform": platform, 
                    "platform_name": platform.capitalize()
                }
            
            # For response_url error type, check if we were redirected to an error page
            elif error_type == "response_url":
                error_url = platform_config.get("errorUrl", "")
                redirected_to_error = error_url and error_url in response.url
                
                exists = response.status_code == 200 and not redirected_to_error
                logger.debug(f"Platform {platform} uses response_url checks. Status: {response.status_code}, Redirected to error: {redirected_to_error}, Exists: {exists}")
                
                return exists, {
                    "status_code": response.status_code,
                    "final_url": response.url,
                    "url": url,
                    "platform": platform,
                    "platform_name": platform.capitalize(),
                    "reason": "redirect_to_error" if redirected_to_error else None
                }
            
            # Default to checking status code if error_type is not recognized
            else:
                exists = response.status_code == 200
                logger.debug(f"Using default status code check for {platform}. Status: {response.status_code}, Exists: {exists}")
                return exists, {
                    "status_code": response.status_code, 
                    "url": url, 
                    "platform": platform, 
                    "platform_name": platform.capitalize(),
                    "reason": "status_code" if not exists else None
                }
                
        except requests.RequestException as e:
            logger.warning(f"Error checking {platform} for username '{username}': {str(e)}")
            return False, {
                "error": str(e),
                "url": url,
                "platform": platform,
                "platform_name": platform.capitalize(),
                "reason": "request_error"
            }
    
    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the module with the given parameters.
        
        Args:
            params (Dict[str, Any]): Parameters for module execution.
        
        Returns:
            Dict[str, Any]: Module execution results.
        """
        username = params.get("username", "")
        config_timeout = self.config.get("timeout", DEFAULT_TIMEOUT)
        timeout = params.get("timeout", config_timeout)
        if not username:
            raise ValueError("Username is required")
        username = username.strip()
        platforms = self.config.get("platforms", {})
        cards = []
        for platform_name, _ in platforms.items():
            try:
                logger.info(f"Checking {platform_name} for username '{username}'")
                exists, account_data = self._check_username_exists(
                    username=username,
                    platform=platform_name,
                    timeout=timeout
                )
                if exists:
                    node_data = {
                        "platform": platform_name,
                        "username": username,
                        "url": account_data.get("url", ""),
                        "found_at": datetime.utcnow().isoformat()
                    }
                    action = ModuleResultBuilder.create_add_to_investigation_action(
                        node_type="SOCIAL_PROFILE",
                        node_data=node_data
                    )
                    card = ModuleResultBuilder.build_card(
                        title=platform_name,
                        data=node_data,
                        subtitle=username,
                        url=account_data.get("url", ""),
                        action=action,
                        show_properties=False,
                        icon=platform_name
                    )
                    cards.append(card)
            except Exception as e:
                logger.error(f"Error searching {platform_name} for username '{username}': {str(e)}")
        display_type = "single_card" if len(cards) == 1 else "card_collection"
        return ModuleResultBuilder.build_result(
            cards,
            display=display_type,
            subtitle=f"Found {len(cards)} accounts for '{username}' across {len(platforms)} platforms"
        )

    def _get_platforms(self) -> List[Dict[str, Any]]:
        """
        Return a list of supported social media platforms with details.
            
        Returns:
            List of platform details with name and URL format
        """
        if self._should_reload_platforms():
            logger.info("Reloading platforms configuration due to refresh interval")
            self.load_config(force_reload=True)
            self.platforms_last_loaded = datetime.now()
            # Validate platforms after reload
            self._validate_platforms_config()
            # Update optional params with fresh config values
            config_timeout = self.config.get("timeout", DEFAULT_TIMEOUT)
            self.optional_params = [
                {
                    "name": "timeout",
                    "type": "integer",
                    "description": f"Timeout for requests in seconds (default: {config_timeout})",
                    "default": config_timeout
                }
            ]
            logger.info(f"Platforms configuration reloaded at {self.platforms_last_loaded}")
        else:
            logger.debug("Using cached platforms configuration")
        
        platforms = self.config.get("platforms", {})
        
        result = []
        for name, config in platforms.items():
            result.append({
                "name": name,
                "display_name": name.capitalize(),
                "url_format": config.get("url", ""),
                "main_url": config.get("urlMain", "")
            })
        
        # Sort platforms by name
        result.sort(key=lambda x: x["name"])
        
        return result

    def get_profile_url(self, platform: str, username: str) -> Optional[str]:
        """
        Get the profile URL for a username on a given platform.
        
        Args:
            platform: The social media platform name
            username: The username
            
        Returns:
            The profile URL or None if the platform is not supported
        """
        platforms = self.config.get("platforms", {})
        
        if platform not in platforms:
            return None
            
        username = username.strip()
        return platforms[platform]["url"].format(username)