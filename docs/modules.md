# OSFiler Module Development Guide

This guide explains how to develop modules for the OSFiler platform. Modules are the primary way to extend OSFiler's functionality, allowing you to add new OSINT capabilities to the system.

## Table of Contents

- [Module Architecture](#module-architecture)
- [Creating a New Module](#creating-a-new-module)
- [Module Structure](#module-structure)
- [Module Discovery and Loading](#module-discovery-and-loading)
- [Module Reloading](#module-reloading)
- [Handling Parameters](#handling-parameters)
- [Creating Nodes and Relationships](#creating-nodes-and-relationships)
- [Presenting Results with Standardized Cards (utils.py)](#presenting-results-with-standardized-cards-utils.py)
- [Working with Types](#working-with-types)
- [Module Configuration](#module-configuration)
- [Example Module](#example-module)
- [Testing Modules](#testing-modules)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Module Architecture

OSFiler uses a plugin architecture that allows for easy extension through modules. Each module is a Python class that inherits from the `BaseModule` class and implements specific methods.

The core components of the module system are:

1. **BaseModule**: Abstract class that defines the interface for all modules
2. **ModuleRunner**: Responsible for discovering, loading, and executing modules
3. **Addon modules**: Individual module implementations in the addons directory

## Creating a New Module

To create a new module for OSFiler:

1. Create a new Python file in the `backend/modules/addons` directory with a descriptive name (e.g., `email_analyzer.py`)
2. Import the `BaseModule` class: `from backend.modules.base import BaseModule`
3. Create a class that inherits from `BaseModule`
4. Implement the required methods, especially `execute()`
5. Define module metadata (name, description, parameters, etc.)
6. Ensure your module name is unique and doesn't conflict with existing modules

Your module will be automatically discovered and loaded by the ModuleRunner at startup without requiring manual imports or registration.

## Module Structure

Every module must follow this basic structure:

```python
"""
Your module description.

This module provides [functionality description].
"""

import logging
from typing import Dict, Any, List, Optional

# Import BaseModule
from backend.modules.base import BaseModule

# Configure logger
logger = logging.getLogger(__name__)

class YourModuleName(BaseModule):
    """
    Your module class documentation.
    """
    
    def __init__(self):
        """
        Initialize the module.
        """
        # Initialize the base class first
        super().__init__()
        
        # Set module metadata
        self.name = "your_module_name"  # IMPORTANT: Use a unique name
        self.description = "Description of what your module does"
        self.version = "0.1.0"
        self.author = "Your Name"
        self.required_params = [
            {
                "name": "param_name",
                "type": "string",
                "description": "Description of the parameter"
            }
        ]
        self.optional_params = [
            {
                "name": "optional_param",
                "type": "integer",
                "description": "Description of the optional parameter"
            }
        ]
        self.category = "category_name"
        self.tags = ["tag1", "tag2"]
    
    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the module with the provided parameters.
        
        Args:
            params: Dictionary of parameters
            
        Returns:
            Dictionary containing the results
        """
        # Extract parameters
        param1 = params.get("param1", "")
        param2 = params.get("param2", 0)
        
        # Validate required parameters
        if not param1:
            raise ValueError("param1 is required")
        
        # Module logic here
        # ...
        
        # Return results
        return {
            "result_key": "result_value",
            "another_key": [1, 2, 3],
            "nodes": []  # Optional: nodes to be added to the graph
        }
```

## Module Discovery and Loading

Modules are automatically discovered and loaded by the ModuleRunner when the application starts.

**Important points about module discovery:**

1. Your module file must be placed in the `backend/modules/addons` directory
2. The file name should be descriptive and end with `.py`
3. The class must inherit from `BaseModule`
4. The class must set a unique `name` attribute
5. The module must implement the `execute()` method

The system uses automatic discovery, so you **do not need** to manually import your module in any `__init__.py` file.

### Dynamic Module Import System

OSFiler's dynamic import system:

1. Scans the `backend/modules/addons` directory for Python files
2. Imports each file and inspects it for classes that inherit from `BaseModule`
3. Automatically adds these classes to the module registry
4. Loads the modules into the application without requiring manual imports

## Module Reloading

When you make changes to existing modules or add new ones, you need to use the Module Management features in the admin interface to reload them:

### Reloading Options

The admin interface provides several ways to reload modules:

1. **Reload All Modules**: Click the "Reload All" button at the top of the Installed Modules section.
2. **Reload Individual Module**: Each module in the list has a reload button (circular arrow icon).
3. **Reload Selected Module**: In the Module Configuration section, after selecting a module to configure, use the "Reload Module" button.

### When to Reload Modules

You should reload modules when:

1. You've added a new module to the `backend/modules/addons` directory
2. You've made changes to an existing module's code
3. You've updated a module's dependencies
4. You're troubleshooting module issues

## Handling Parameters

Modules receive parameters through the `execute()` method. Define the parameters your module accepts in the `required_params` and `optional_params` attributes:

```python
self.required_params = [
    {
        "name": "username",
        "type": "string",
        "description": "The username to search for"
    },
    {
        "name": "investigation_id",
        "type": "string",
        "description": "The ID of the investigation"
    }
]

self.optional_params = [
    {
        "name": "timeout",
        "type": "integer",
        "description": "Timeout for requests in seconds (default: 10)"
    },
    {
        "name": "platforms",
        "type": "array",
        "description": "List of platforms to search"
    }
]
```

Parameter types supported:
- string
- integer
- number (float)
- boolean
- array
- object

In the `execute()` method, validate that all required parameters are present:

```python
def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
    # Validate that all required parameters are present
    self.validate_params(params)
    
    # Extract parameters with defaults
    username = params.get("username", "")
    investigation_id = params.get("investigation_id", "")
    timeout = int(params.get("timeout", 10))
    
    # Additional validation
    if timeout < 1:
        raise ValueError("Timeout must be at least 1 second")
    
    # Module logic...
```

## Creating Nodes and Relationships

Modules can create nodes and relationships to be added to the database using helper methods from the `BaseModule` class:

### Creating Nodes

```python
node_data = self.create_node_data(
    node_type="USERNAME",  # Use one of the standard node types
    name="john_doe",
    data={
        "platform": "twitter",
        "url": "https://twitter.com/john_doe",
        "found_at": "2023-01-01T12:00:00"
    }
)

# Add to your results
results = {
    "nodes": [node_data]
}
```

### Creating Relationships

```python
relationship_data = self.create_relationship_data(
    source_node_id="source_node_id",
    target_node_id="target_node_id",
    relationship_type="HAS_USERNAME",  # Use one of the standard relationship types
    strength=0.8,
    data={
        "discovered_at": "2023-01-01T12:00:00",
        "confidence": "high"
    }
)

# Add to your results
results = {
    "relationships": [relationship_data]
}
```

### Data Visualization

*Note: A comprehensive guide on how to display the nodes/data to the frontend will be provided in a later phase. The system currently supports multiple visualization methods, but this feature is still in development to determine the most effective and developer-friendly approaches.*

## Presenting Results with Standardized Cards (utils.py)

To ensure a consistent and user-friendly display of module results in the OSFiler frontend, all modules should use the standardized card/result builders provided in `backend/modules/utils.py`.

### Why Use the Card Builder?
- Guarantees a uniform look and feel for all module results
- Ensures compatibility with the frontend's dynamic card rendering
- Makes it easy to add actions like "Add to Investigation" to any result

### Key Utilities in `utils.py`

#### 1. `ModuleResultBuilder.build_card`
Creates a standardized card for a single result entity.

**Example:**
```python
from backend.modules.utils import ModuleResultBuilder

card = ModuleResultBuilder.build_card(
    title="Instagram",
    data={
        "platform": "instagram",
        "username": username,
        "url": profile_url,
        # ... any other properties ...
        # This will only be showed to the card body (below)
    },
    subtitle=username,
    url=profile_url,
    body="Found Instagram profile.",
    action=ModuleResultBuilder.create_add_to_investigation_action(
        node_type="SOCIAL_PROFILE",
        node_data={
            "platform": "instagram",
            "username": username,
            "url": profile_url
        }
    ),
    show_properties=False  # (Default: True) Set to False to hide property details in the card
)
```

#### 2. `ModuleResultBuilder.build_result`
Wraps a list of cards into a result object for the frontend.

**Example:**
```python
result = ModuleResultBuilder.build_result(
    cards=[card1, card2, ...],
    display="card_collection",  # or "single_card"
    title="Found Accounts",
    subtitle=f"Found {len(cards)} accounts"
)
```

#### 3. `ModuleResultBuilder.create_add_to_investigation_action`
Creates a standardized action for adding a node to the investigation graph.

**Example:**
```python
action = ModuleResultBuilder.create_add_to_investigation_action(
    label="Add to Investigation",
    node_type="SOCIAL_PROFILE",
    node_data=node_data
)
```

### Best Practices for Presenting Results
- **Always use `build_card` and `build_result`** for anything you want to display as a card in the frontend.
- **Use the `action` parameter** to add interactive buttons (e.g., "Add to Investigation").
- **Set `show_properties=False`** if you want to hide the property details in the card body.
- **Keep card data generic**—avoid hardcoding platform-specific or module-specific fields in the frontend.
- **Return a result object** with a `nodes` key (list of cards) and a `display` type.

### Example: Returning Results from a Module
```python
def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
    # ... module logic ...
    cards = []
    for ... in ...:
        card = ModuleResultBuilder.build_card(
            title=..., data=..., ...
        )
        cards.append(card)
    return ModuleResultBuilder.build_result(
        cards,
        display="card_collection",
        title="Results Title",
        subtitle="Results Subtitle"
    )
```

**By following this pattern, your module's results will always be displayed correctly and consistently in the OSFiler UI.**

## Working with Types

Standard node types include:
- PERSON
- ORGANIZATION
- USERNAME
- EMAIL
- PHONE
- ADDRESS
- WEBSITE
- SOCIAL_PROFILE
- DOCUMENT
- IMAGE
- LOCATION
- EVENT
- CUSTOM

Standard relationship types include:
- KNOWS
- OWNS
- WORKS_AT
- MEMBER_OF
- LOCATED_AT
- CONNECTED_TO
- RELATED_TO
- HAS_USERNAME
- HAS_EMAIL
- HAS_PHONE
- HAS_ADDRESS
- PARTICIPATED_IN
- CREATED
- VISITED
- CONTACTED
- FAMILY_OF
- FRIEND_OF
- COLLEAGUE_OF
- CUSTOM

If you need to work with types directly:

```python
from backend.models.type import Type

# Get all node types
node_types = Type.get_all(entity_type="node")

# Get all relationship types
relationship_types = Type.get_all(entity_type="relationship")

# Get a specific type
person_type = Type.get_by_value("PERSON", entity_type="node")

# Create a custom type if needed
custom_type = Type.create(
    value="CUSTOM_TYPE", 
    entity_type="node",
    description="A custom node type for specialized data",
    is_system=False  # User-defined, not system
)
```

## Module Configuration

Modules can have persistent configuration stored in the database:

```python
def __init__(self):
    super().__init__()
    # ... other initialization ...
    
    # Define configuration schema (optional)
    self.config_schema = {
        "type": "object",
        "properties": {
            "api_key": {
                "type": "string",
                "title": "API Key",
                "description": "Your API key for the service"
            },
            "timeout": {
                "type": "integer",
                "title": "Timeout",
                "description": "Timeout in seconds",
                "default": 30,
                "minimum": 1,
                "maximum": 300
            }
        },
        "required": ["api_key"]
    }
    
    # Access configuration in your module
    api_key = self.config.get("api_key", "")
    timeout = self.config.get("timeout", 30)
```

The configuration is automatically loaded when the module is initialized. You can update the configuration:

```python
def update_config(self, new_config):
    # Validate new configuration here if needed
    return self.save_config(new_config)
```

## Example Module

Here's a simple module that checks if a website exists:

```python
"""
Website Lookup Module for OSFiler.

This module checks if a website/domain exists and is accessible.
"""

import logging
import requests
from datetime import datetime
from typing import Dict, Any

from backend.modules.base import BaseModule

# Configure logger
logger = logging.getLogger(__name__)

class WebsiteLookupModule(BaseModule):
    """
    Simple module that checks if a website exists and is accessible.
    """
    
    def __init__(self):
        """Initialize the module."""
        # Initialize the base class first
        super().__init__()
        
        # Set module metadata
        self.name = "website_lookup"
        self.display_name = "Website Lookup"
        self.description = "Check if a website exists and gather basic information"
        self.version = "0.1.0"
        self.author = "OSFiler Team"
        
        # Define required parameters
        self.required_params = [
            {
                "name": "url",
                "type": "string",
                "description": "The website URL to check (e.g., example.com or https://example.com)"
            }
        ]
        
        # Define optional parameters
        self.optional_params = [
            {
                "name": "timeout",
                "type": "integer",
                "description": "Request timeout in seconds",
                "default": 10
            }
        ]
        
        # Set category and tags
        self.category = "reconnaissance"
        self.tags = ["website", "domain", "lookup"]
    
    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the website lookup module.
        
        Args:
            params: Dictionary containing the parameters
            
        Returns:
            Dictionary with the lookup results
        """
        # Validate that all required parameters are present
        self.validate_params(params)
        
        # Extract parameters
        url = params.get("url", "").strip()
        timeout = int(params.get("timeout", 10))
        investigation_id = params.get("investigation_id")
        
        # Ensure URL has a scheme
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        
        logger.info(f"Checking website: {url}")
        
        try:
            # Make a request to the website
            response = requests.get(url, timeout=timeout, allow_redirects=True)
            
            # Check if website exists (HTTP 200 OK)
            exists = response.status_code == 200
            
            # Get basic information
            status_code = response.status_code
            final_url = response.url
            
            # Determine server type if available
            server = response.headers.get("Server", "Unknown")
            
            # Create result data
            result = {
                "url": url,
                "exists": exists,
                "status_code": status_code,
                "final_url": final_url,
                "server": server,
                "headers": dict(response.headers),
                "checked_at": datetime.utcnow().isoformat()
            }
            
            # Create a node if this is an existing website and we have an investigation
            if exists and investigation_id:
                node_data = {
                    "url": final_url,
                    "status_code": status_code,
                    "server": server,
                    "checked_at": datetime.utcnow().isoformat()
                }
                
                # Create a node for this website
                node = self.create_node_data(
                    node_type="WEBSITE",
                    name=final_url,
                    data=node_data
                )
                
                result["nodes"] = [node]
            
            return result
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout while checking website: {url}")
            return {
                "url": url,
                "exists": False,
                "error": "Connection timed out",
                "checked_at": datetime.utcnow().isoformat()
            }
            
        except requests.exceptions.ConnectionError:
            logger.warning(f"Connection error for website: {url}")
            return {
                "url": url,
                "exists": False,
                "error": "Connection error - website might not exist",
                "checked_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error checking website {url}: {str(e)}")
            return {
                "url": url,
                "exists": False,
                "error": str(e),
                "checked_at": datetime.utcnow().isoformat()
            }
```

## Testing Modules

To test your module during development:

1. Place your module file in the `backend/modules/addons` directory
2. Start the OSFiler application (`python app.py`)
3. Check the logs to ensure your module was loaded successfully
4. Navigate to the admin Settings page and select the "Module Configuration" tab
5. If you make changes to your module code while the application is running:
   - Use the reload button for your module or the "Reload All" button
   - Check the logs to confirm the reload was successful
6. To test the module functionality:
   - Navigate to the "Modules" tab in an investigation 
   - Select your module from the dropdown list
   - Enter the required parameters
   - Click "Execute" to run the module

This workflow allows you to iterate on your module code without needing to restart the entire application.

## Troubleshooting

### Module Not Loading at Startup

If your module doesn't appear in the dropdown list:

- Check the application logs for error messages
- Ensure your module file is in the correct directory (`backend/modules/addons`)
- Make sure your module class inherits from `BaseModule`
- Verify that the `name` attribute is set and unique
- Check that you're importing `BaseModule` correctly
- Ensure the `execute` method is properly implemented

### Module Reloading Issues

If you encounter problems reloading a module:

- Check the application logs for error messages
- Verify that the module file syntax is correct
- Make sure you're logged in as an administrator
- If reloading a specific module fails, try the "Reload All Modules" option
- If reloading still fails, restart the application and check logs

### Module Loading but Not Working

If your module appears in the dropdown but doesn't work correctly:

- Check the application logs for error messages
- Ensure all required parameters are properly documented and validated
- Check for syntax errors or runtime exceptions
- Verify that you're correctly accessing parameter values
- Make sure any external libraries your module depends on are installed

## Best Practices

To create high-quality modules for OSFiler:

1. **Use Descriptive Names**: Choose clear, descriptive names for your module
2. **Documentation**: Add thorough docstrings to your module class and methods
3. **Error Handling**: Implement comprehensive error handling with informative messages
4. **Logging**: Use the logger to provide useful information about module execution
5. **Parameter Validation**: Validate all parameters thoroughly before processing
6. **Resource Cleanup**: Ensure all resources (files, connections, etc.) are properly closed
7. **Performance**: Consider performance implications for long-running operations
8. **Security**: Be cautious with user input and external API calls
9. **Testing**: Test your module thoroughly with various inputs
10. **Dependencies**: Clearly document any external dependencies
11. **Graceful Reloading**: Design modules that can be safely reloaded at runtime:
    - Avoid global state or ensure it's properly reset on initialization
    - Use proper cleanup in `__init__` method when reinitializing
    - Test module reloading during development