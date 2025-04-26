"""
Base module class for OSFiler modules.

This module defines the BaseModule abstract class that all OSFiler
modules must inherit from and implement. It provides a standardized
interface for module functionality and metadata.
"""

import abc
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

# Configure logger
logger = logging.getLogger(__name__)

class BaseModule(abc.ABC):
    """
    Abstract base class for all OSFiler modules.
    
    All modules must inherit from this class and implement its abstract methods.
    This ensures a consistent interface across all modules.
    
    Attributes:
        name (str): The name of the module.
        description (str): A description of what the module does.
        version (str): The module version.
        author (str): The module author.
        required_params (List[Dict[str, Any]]): List of parameters required by the module.
        optional_params (List[Dict[str, Any]]): List of optional parameters for the module.
        category (str): The category this module belongs to.
        tags (List[str]): Tags associated with this module.
        created_at (datetime): When the module was created.
        updated_at (datetime): When the module was last updated.
        enabled (bool): Whether the module is currently enabled.
        config_schema (Dict[str, Any]): JSON Schema for module configuration.
        has_config (bool): Whether the module provides configuration options.
    """
    
    def __init__(self):
        """
        Initialize the base module with default values.
        
        These values should be overridden by subclasses.
        """
        self.name = "base_module"
        self.display_name = "Base Module"
        self.description = "Base module class. Do not use directly."
        self.version = "0.1.0"
        self.author = "OSFiler Team"
        self.required_params = []
        self.optional_params = []
        self.category = "misc"
        self.tags = []
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.enabled = True
        self.config_schema = {}
        self.has_config = False
        self.config = {}
        self.config_file_last_modified = None
        
        # Initialize the module
        self.initialize()
        
        # Load configuration if module has configs
        if self.has_config:
            self.load_config()
    
    def initialize(self) -> None:
        """
        Perform initialization tasks for the module.
        
        This method is called during module instantiation and can be
        overridden by subclasses to perform module-specific initialization.
        """
        pass
    
    @abc.abstractmethod
    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the module with the provided parameters.
        
        This is the main method that performs the module's functionality.
        It must be implemented by all module subclasses.
        
        Args:
            params (Dict[str, Any]): Parameters for module execution.
        
        Returns:
            Dict[str, Any]: The results of the module execution.
        """
        pass
    
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """
        Validate that all required parameters are provided.
        
        Args:
            params (Dict[str, Any]): Parameters to validate.
        
        Returns:
            bool: True if all required parameters are present, False otherwise.
        """
        for required_param in self.required_params:
            param_name = required_param["name"]
            if param_name not in params:
                logger.error(f"Missing required parameter: {param_name}")
                return False
        return True
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the module.
        
        Returns:
            Dict[str, Any]: Module metadata.
        """
        return {
            "name": self.name,
            "display_name": getattr(self, "display_name", self.name),
            "description": self.description,
            "version": self.version,
            "author": self.author,
            "required_params": self.required_params,
            "optional_params": self.optional_params,
            "category": self.category,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "enabled": self.enabled,
            "has_config": self.has_config,
            "config_schema": self.config_schema
        }
    
    def run(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the module with parameter validation and error handling.
        
        This method wraps the execute method with validation and error handling.
        
        Args:
            params (Dict[str, Any]): Parameters for module execution.
        
        Returns:
            Dict[str, Any]: The results of the module execution, with status.
        """
        # Log module execution
        logger.info(f"Running module: {self.name}")
        logger.debug(f"Module parameters: {params}")
        
        # Create base result structure
        result = {
            "status": "error",
            "module": self.name,
            "timestamp": datetime.utcnow().isoformat(),
            "data": None,
            "error": None
        }
        
        try:
            # Validate parameters
            if not self.validate_params(params):
                result["error"] = "Missing required parameters"
                return result
            
            # Execute the module
            data = self.execute(params)
            
            # Update result with success
            result["status"] = "success"
            result["data"] = data
            
            # Log successful execution
            logger.info(f"Module {self.name} executed successfully")
            
        except Exception as e:
            # Log the error
            logger.error(f"Error executing module {self.name}: {str(e)}", exc_info=True)
            
            # Update result with error
            result["error"] = str(e)
        
        return result
    
    def get_config_path(self) -> str:
        """
        Get the path to the module's configuration file.
        
        Returns:
            str: Path to the configuration file.
        """
        try:
            # Get the absolute path to the backend directory
            current_dir = os.path.abspath(os.path.dirname(__file__))
            base_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
            
            # For modules in the addons directory
            if hasattr(self, '__module__') and 'addons' in getattr(self, '__module__', ''):
                config_dir = os.path.join(base_dir, "config", "modules")
            else:
                config_dir = os.path.join(current_dir, "config")
            
            # Create config directory if it doesn't exist
            os.makedirs(config_dir, exist_ok=True)
            
            config_path = os.path.join(config_dir, f"{self.name}_config.json")
            logger.debug(f"Config path for module {self.name}: {config_path}")
            return config_path
            
        except Exception as e:
            logger.error(f"Error getting config path for module {self.name}: {str(e)}")
            # Fallback to a safe default
            return os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{self.name}_config.json")
    
    def config_file_modified(self) -> bool:
        """
        Check if the configuration file has been modified since last loaded.
        
        Returns:
            bool: True if file has been modified, False otherwise.
        """
        if not self.has_config:
            return False
            
        config_path = self.get_config_path()
        if not os.path.exists(config_path):
            return False
            
        modified_time = os.path.getmtime(config_path)
        if self.config_file_last_modified is None or modified_time > self.config_file_last_modified:
            self.config_file_last_modified = modified_time
            return True
            
        return False
    
    def load_config(self, force_reload: bool = False) -> Dict[str, Any]:
        """
        Load module configuration from file.
        
        Args:
            force_reload (bool): Whether to force reload config from disk.
            
        Returns:
            Dict[str, Any]: The loaded configuration.
        """
        if not self.has_config:
            return {}
            
        try:
            config_path = self.get_config_path()
            
            # Check if we need to reload (file modified or force reload)
            if not force_reload and not self.config_file_modified() and self.config:
                return self.config
                
            # If config file doesn't exist, create it with default values
            if not os.path.exists(config_path):
                default_config = self.get_default_config()
                self.save_config(default_config)
                self.config = default_config
                return self.config
                
            # Load config from file
            with open(config_path, 'r') as f:
                loaded_config = json.load(f)
                
            # Update the config file modification time
            self.config_file_last_modified = os.path.getmtime(config_path)
            
            # Merge with default values for any missing keys
            default_config = self.get_default_config()
            merged_config = self._deep_merge_configs(default_config, loaded_config)
            
            # Store the merged config
            self.config = merged_config
                
            logger.info(f"Loaded configuration for module: {self.name}")
            return self.config
                
        except Exception as e:
            logger.error(f"Error loading configuration for module {self.name}: {str(e)}")
            return self.get_default_config()
            
    def _deep_merge_configs(self, default_config: Dict[str, Any], user_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deep merge two configuration dictionaries, with user config taking precedence.
        
        Args:
            default_config: The default configuration
            user_config: The user's configuration
            
        Returns:
            Dict[str, Any]: Merged configuration
        """
        result = default_config.copy()
        
        for key, value in user_config.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Recursively merge nested dictionaries
                result[key] = self._deep_merge_configs(result[key], value)
            else:
                # Use user config value
                result[key] = value
                
        return result
    
    def save_config(self, config: Dict[str, Any]) -> bool:
        """
        Save module configuration to file.
        
        Args:
            config (Dict[str, Any]): The configuration to save.
            
        Returns:
            bool: True if the configuration was saved successfully, False otherwise.
        """
        if not self.has_config:
            return False
            
        try:
            config_path = self.get_config_path()
            
            # Create directory structure if it doesn't exist
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            
            # Save config to file
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=4)
                
            # Update the config file modification time
            self.config_file_last_modified = os.path.getmtime(config_path)
            
            # Update the config
            self.config = config
            
            logger.info(f"Saved configuration for module: {self.name}")
            return True
                
        except Exception as e:
            logger.error(f"Error saving configuration for module {self.name}: {str(e)}")
            return False
    
    def get_default_config(self) -> Dict[str, Any]:
        """
        Get the default configuration for the module.
        
        Should be overridden by subclasses that have configuration.
        
        Returns:
            Dict[str, Any]: Default configuration.
        """
        # If a schema is defined, derive defaults from schema
        if self.config_schema:
            return self._derive_defaults_from_schema(self.config_schema)
        return {}
    
    def _derive_defaults_from_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Derive default configuration values from a JSON schema.
        
        Args:
            schema: JSON schema for configuration
            
        Returns:
            Dict[str, Any]: Default configuration derived from schema
        """
        defaults = {}
        
        for key, properties in schema.items():
            if "default" in properties:
                defaults[key] = properties["default"]
            elif properties.get("type") == "object" and isinstance(properties.get("default", {}), dict):
                # Recursively derive defaults for nested objects
                nested_defaults = self._derive_defaults_from_schema(properties["default"])
                if nested_defaults:
                    defaults[key] = nested_defaults
            elif properties.get("type") == "array":
                defaults[key] = []
            elif properties.get("type") == "string":
                defaults[key] = ""
            elif properties.get("type") == "integer" or properties.get("type") == "number":
                defaults[key] = 0
            elif properties.get("type") == "boolean":
                defaults[key] = False
                
        return defaults
    
    def validate_config(self, config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate a configuration against the module's schema.
        
        Args:
            config: Configuration to validate
            
        Returns:
            Tuple[bool, Optional[str]]: (is_valid, error_message)
        """
        # Basic validation - this could be expanded with JSON Schema validation
        try:
            if not self.has_config:
                return True, None
                
            # Validate required fields are present
            for key, properties in self.config_schema.items():
                if properties.get("required", False) and key not in config:
                    return False, f"Missing required configuration field: {key}"
                    
            return True, None
            
        except Exception as e:
            return False, str(e)
    
    def create_node_data(
        self, 
        node_type: str, 
        name: str, 
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a standardized node data structure.
        
        This helper method creates a node data structure that can be used
        by the frontend to create a new node in the graph.
        
        Args:
            node_type (str): The type of node (e.g., 'person', 'username').
            name (str): The name/value of the node.
            data (Optional[Dict[str, Any]]): Additional data for the node.
        
        Returns:
            Dict[str, Any]: Structured node data.
        """
        if data is None:
            data = {}
            
        return {
            "type": node_type,
            "name": name,
            "data": data,
            "source_module": self.name,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def create_relationship_data(
        self, 
        source_node_id: str, 
        target_node_id: str, 
        relationship_type: str, 
        strength: float = 0.5, 
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a standardized relationship data structure.
        
        This helper method creates a relationship data structure that can be
        used by the frontend to create a new relationship in the graph.
        
        Args:
            source_node_id (str): The ID of the source node.
            target_node_id (str): The ID of the target node.
            relationship_type (str): The type of relationship.
            strength (float): The strength of the relationship (0.0 to 1.0).
            data (Optional[Dict[str, Any]]): Additional data for the relationship.
        
        Returns:
            Dict[str, Any]: Structured relationship data.
        """
        if data is None:
            data = {}
            
        return {
            "source_node_id": source_node_id,
            "target_node_id": target_node_id,
            "type": relationship_type,
            "strength": strength,
            "data": data,
            "source_module": self.name,
            "timestamp": datetime.utcnow().isoformat()
        }