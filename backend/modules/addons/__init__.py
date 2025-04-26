"""
OSFiler addons package.

This package contains additional modules for the OSFiler application.
Modules are automatically discovered and imported from this directory.
"""

import os
import inspect
import importlib
from pathlib import Path

# Import BaseModule for type checking
from backend.modules.base import BaseModule

# Dictionary to store module classes
_module_classes = {}

def _find_module_classes():
    """
    Dynamically find all module classes in this directory that inherit from BaseModule.
    """
    module_classes = {}
    
    # Get the current directory
    current_dir = Path(__file__).parent
    
    # Find all Python files in the directory (excluding __init__.py)
    module_files = [f for f in os.listdir(current_dir) 
                   if f.endswith('.py') and f != '__init__.py']
    
    for file_name in module_files:
        # Get the module name without .py extension
        module_name = file_name[:-3]
        
        try:
            # Import the module
            module_path = f"backend.modules.addons.{module_name}"
            module = importlib.import_module(module_path)
            
            # Find all classes in the module that extend BaseModule
            for name, obj in inspect.getmembers(module):
                # Only process classes
                if not inspect.isclass(obj):
                    continue
                
                # Skip if not a subclass of BaseModule or if it is BaseModule itself
                try:
                    if not issubclass(obj, BaseModule) or obj is BaseModule:
                        continue
                except TypeError:
                    continue
                
                # Add the class to the module_classes dictionary
                module_classes[name] = obj
        except Exception as e:
            print(f"Error importing module {module_name}: {str(e)}")
    
    return module_classes

# Find all module classes
_module_classes = _find_module_classes()

# Export all discovered module classes
__all__ = list(_module_classes.keys())

# Import all module classes into this namespace
globals().update(_module_classes)