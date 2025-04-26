"""
OSFiler model package.

This package contains all data models for the OSFiler application, including
users, investigations, nodes, and relationships. These models provide an
object-oriented interface for interacting with the PostgreSQL database using SQLAlchemy ORM.
"""

from backend.models.user import User
from backend.models.investigation import Investigation
from backend.models.node import Node, VALID_NODE_TYPES
from backend.models.relationship import Relationship, COMMON_RELATIONSHIP_TYPES

__all__ = [
    'User',
    'Investigation',
    'Node',
    'VALID_NODE_TYPES',
    'Relationship',
    'COMMON_RELATIONSHIP_TYPES'
]