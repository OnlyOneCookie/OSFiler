"""
Module result utilities.

This module provides standardized builders for module results to ensure
consistent formatting and display across the application.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

class ModuleResultBuilder:
    """Builder class for standardized module results."""

    @staticmethod
    def build_card(
        title: str,
        data: dict,
        subtitle: Optional[str] = None,
        url: Optional[str] = None,
        body: Optional[str] = None,
        action: Optional[dict] = None,
        show_properties: Optional[bool] = True,
        icon: Optional[str] = None,
        image: Optional[str] = None
    ) -> dict:
        """
        Build a standardized card for module results.
        Args:
            title: Card title
            data: Card data dict
            subtitle: Optional subtitle
            url: Optional URL
            body: Optional body text
            action: Optional action dict
            show_properties: Whether to show properties
            icon: Optional icon name or path
            image: Optional image data (base64 or URL)
        Returns:
            dict: Card dict
        """
        card = {
            "title": title,
            "data": data
        }
        if subtitle:
            card["subtitle"] = subtitle
        if url:
            card["url"] = url
        if body:
            card["body"] = body
        if action:
            card["action"] = action
        if show_properties is False:
            card["show_properties"] = False
        if icon:
            card["icon"] = icon
        if image:
            card["image"] = image
        return card

    @staticmethod
    def build_result(
        cards: List[dict],
        display: str,  # 'single_card' or 'card_collection'
        title: Optional[str] = None,
        subtitle: Optional[str] = None
    ) -> dict:
        result = {
            "nodes": cards,
            "display": display
        }
        if title:
            result["title"] = title
        if subtitle:
            result["subtitle"] = subtitle
        return result

    @staticmethod
    def create_add_to_investigation_action(
        label: str = "Add to Investigation",
        node_type: str = "CUSTOM",
        node_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a standardized 'Add to Investigation' action.
        
        Args:
            label: The action label
            node_type: The type of node to add
            node_data: Additional node data
            
        Returns:
            Dict containing the formatted action
        """
        return {
            "type": "add_to_investigation",
            "label": label,
            "node_type": node_type,
            "node_data": node_data or {}
        } 