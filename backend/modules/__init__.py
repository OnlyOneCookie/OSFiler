"""
OSFiler modules package.

This package contains all the modules available in the OSFiler application.
Modules are loaded dynamically by the ModuleRunner and provide extensible
functionality for various OSINT tasks.
"""

from backend.modules.base import BaseModule
from backend.modules.module_runner import get_module_runner

# Define the package exports
__all__ = [
    'BaseModule',
    'get_module_runner'
]