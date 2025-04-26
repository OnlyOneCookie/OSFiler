"""
Module Runner.

A simple, robust plugin system that loads all module files from the addons directory.
Every module in the addons folder that extends BaseModule is available to run
on the modules tab of an investigation page.
"""

import importlib
import inspect
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.modules.base import BaseModule

# Configure logger
logger = logging.getLogger(__name__)

class ModuleRunner:
    """
    A simple module runner that loads modules from the addons directory.
    
    Attributes:
        modules (Dict[str, BaseModule]): Dictionary of loaded modules.
        addons_dir (Path): Path to the addons directory.
    """
    
    _instance = None
    
    def __new__(cls):
        """Create a new ModuleRunner instance if one doesn't exist."""
        if cls._instance is None:
            cls._instance = super(ModuleRunner, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the ModuleRunner instance."""
        if self._initialized:
            return
        
        # Initialize modules dictionary
        self.modules = {}
        
        # Set the addons directory path
        self.addons_dir = Path(__file__).parent / "addons"
        
        # Load all modules from the addons directory
        self.load_modules()
        
        self._initialized = True
    
    def load_modules(self) -> None:
        """Load all modules from the addons directory."""
        logger.info(f"Loading modules from {self.addons_dir}")
        
        # Check if addons directory exists
        if not self.addons_dir.exists():
            logger.error(f"Addons directory does not exist: {self.addons_dir}")
            return
        
        # Get all Python files in the addons directory (excluding __init__.py)
        addon_files = [f for f in os.listdir(self.addons_dir) 
                      if f.endswith('.py') and f != '__init__.py']
        
        # Clear the modules dictionary
        self.modules = {}
        
        # Import each addon file
        for addon_file in addon_files:
            try:
                # Get the module name without .py extension
                file_name = addon_file[:-3]
                
                # Import the module
                module_path = f"backend.modules.addons.{file_name}"
                addon_module = importlib.import_module(module_path)
                
                # Find all classes in the module that extend BaseModule
                for name, obj in inspect.getmembers(addon_module):
                    # Only process classes
                    if not inspect.isclass(obj):
                        continue
                    
                    # Skip if not a subclass of BaseModule or if it is BaseModule itself
                    try:
                        if not issubclass(obj, BaseModule) or obj is BaseModule:
                            continue
                    except TypeError:
                        continue
                    
                    # Create an instance of the module
                    try:
                        instance = obj()
                        
                        # Skip if the module has no name or it's trying to register as 'base_module'
                        if not hasattr(instance, 'name') or not instance.name or instance.name == 'base_module':
                            logger.warning(f"Module {name} has invalid name: {getattr(instance, 'name', None)}")
                            continue
                        
                        # Store the module using its name
                        module_name = instance.name
                        self.modules[module_name] = instance
                        logger.info(f"Registered module: {module_name}")
                    except Exception as e:
                        logger.error(f"Error instantiating module {name}: {str(e)}", exc_info=True)
            
            except Exception as e:
                logger.error(f"Error processing module file {addon_file}: {str(e)}", exc_info=True)
        
        # Log the loaded modules
        if self.modules:
            logger.info(f"Successfully loaded {len(self.modules)} modules: {list(self.modules.keys())}")
        else:
            logger.warning("No modules were loaded from the addons directory.")
    
    def get_modules(self) -> List[Dict[str, Any]]:
        """
        Get a list of all available modules with their metadata.
        
        Returns:
            List[Dict[str, Any]]: List of module metadata.
        """
        modules_list = []
        
        logger.debug(f"Available modules: {list(self.modules.keys())}")
        
        for module_name, module in self.modules.items():
            try:
                # Get module metadata and add to list
                metadata = module.get_metadata()
                
                # Force has_config to match the module's value
                metadata["has_config"] = module.has_config
                
                # Ensure config_schema is included if has_config is True
                if module.has_config and not metadata.get("config_schema"):
                    metadata["config_schema"] = module.config_schema or {}
                
                modules_list.append(metadata)
            except Exception as e:
                logger.error(f"Error getting metadata for module {module_name}: {str(e)}")
        
        logger.debug(f"Returning {len(modules_list)} modules")
        return modules_list
    
    def get_module(self, module_name: str) -> Optional[BaseModule]:
        """
        Get a module by name.
        
        Args:
            module_name (str): The name of the module to retrieve.
        
        Returns:
            Optional[BaseModule]: The module if found, None otherwise.
        """
        module = self.modules.get(module_name)
        if not module:
            logger.warning(f"Module not found: {module_name}")
        return module
    
    def execute_module(self, module_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a module with parameters.
        
        Args:
            module_name (str): The name of the module to execute.
            params (Dict[str, Any]): Parameters for module execution.
        
        Returns:
            Dict[str, Any]: The results of the module execution.
        """
        # Get the module
        module = self.get_module(module_name)
        
        if not module:
            error_msg = f"Module not found: {module_name}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Run the module
        logger.info(f"Executing module: {module_name}")
        try:
            result = module.run(params)
            return result
        except Exception as e:
            logger.error(f"Error executing module {module_name}: {str(e)}", exc_info=True)
            raise
    
    def reload_modules(self) -> None:
        """Reload all modules."""
        logger.info("Reloading all modules")
        
        # Clear module cache for addons
        for name, module in list(sys.modules.items()):
            if name.startswith('backend.modules.addons.'):
                del sys.modules[name]
        
        # Load modules again
        self.load_modules()
        
        logger.info("Modules reloaded successfully")
    
    def reload_module(self, module_name: str) -> bool:
        """
        Reload a specific module.
        
        Args:
            module_name (str): The name of the module to reload.
            
        Returns:
            bool: True if successfully reloaded, False otherwise.
        """
        # Get the current module
        module = self.get_module(module_name)
        if not module:
            logger.warning(f"Cannot reload module {module_name}: not found")
            return False
        
        try:
            # Get the module's class
            module_class = module.__class__
            
            # Get the module's file name from the module class
            module_path = module_class.__module__
            file_name = module_path.split('.')[-1]
            
            logger.info(f"Reloading module {module_name} from file {file_name}")
            
            # Remove from sys.modules
            full_module_path = f"backend.modules.addons.{file_name}"
            if full_module_path in sys.modules:
                del sys.modules[full_module_path]
            
            # Remove from modules dictionary
            if module_name in self.modules:
                del self.modules[module_name]
            
            # Import the module again
            addon_module = importlib.import_module(full_module_path)
            
            # Find the module class in the reloaded module
            new_instance = None
            for name, obj in inspect.getmembers(addon_module):
                if (inspect.isclass(obj) and 
                    issubclass(obj, BaseModule) and 
                    obj is not BaseModule and
                    obj.__name__ == module_class.__name__):
                    
                    # Create an instance of the module
                    new_instance = obj()
                    break
            
            if new_instance:
                self.modules[new_instance.name] = new_instance
                logger.info(f"Module {module_name} reloaded successfully")
                return True
            else:
                logger.warning(f"Module class {module_class.__name__} not found in reloaded module")
                return False
            
        except Exception as e:
            logger.error(f"Error reloading module {module_name}: {str(e)}", exc_info=True)
            return False

# Create a singleton instance of the module runner
module_runner = ModuleRunner()

def get_module_runner() -> ModuleRunner:
    """Get the module runner instance."""
    return module_runner