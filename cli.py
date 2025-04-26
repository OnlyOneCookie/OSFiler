"""
Command Line Interface for OSFiler.

This module provides CLI commands for managing the OSFiler application.
"""

import argparse
import getpass
import logging
import os
import sys

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.user import User
from backend.core.database import initialize_database

# Configure logger
logger = logging.getLogger(__name__)

def setup_logging(log_level: str = "INFO") -> None:
    """Set up logging for CLI commands."""
    logging.basicConfig(
        level=getattr(logging, log_level),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler()]
    )

def create_admin_command(args):
    """
    Create an admin user.
    """
    # Check if admin users already exist
    existing_admins = User.count_admins()
    if existing_admins > 0 and not args.force:
        print(f"There are already {existing_admins} admin users in the system.")
        response = input("Do you want to create another admin user? [y/N]: ")
        if response.lower() != 'y':
            print("Operation cancelled.")
            return
    
    # Get username
    username = args.username
    if not username:
        username = input("Enter admin username: ")
    
    # Check if username exists
    existing_user = User.get_by_username(username)
    if existing_user:
        print(f"User '{username}' already exists.")
        if existing_user.is_admin:
            print(f"User '{username}' is already an admin.")
            return
        else:
            response = input(f"Do you want to promote '{username}' to admin? [y/N]: ")
            if response.lower() == 'y':
                existing_user.is_admin = True
                existing_user.update()
                print(f"User '{username}' has been promoted to admin.")
                return
            else:
                print("Operation cancelled.")
                return
    
    # Get email
    email = args.email
    if not email:
        email = input("Enter admin email: ")
    
    # Get password
    password = args.password
    if not password:
        password = getpass.getpass("Enter admin password: ")
        confirm_password = getpass.getpass("Confirm admin password: ")
        if password != confirm_password:
            print("Passwords do not match. Operation cancelled.")
            return
    
    # Create the admin user
    try:
        User.create(
            username=username,
            email=email,
            password=password,
            is_admin=True
        )
        print(f"Admin user '{username}' created successfully.")
    except Exception as e:
        print(f"Error creating admin user: {str(e)}")

def init_db_command() -> None:
    """Initialize the database."""
    try:
        initialize_database()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")

def main() -> None:
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(description="OSFiler CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Create admin command
    create_admin_parser = subparsers.add_parser("create-admin", help="Create an admin user")
    create_admin_parser.add_argument("--username", help="Admin username")
    create_admin_parser.add_argument("--email", help="Admin email")
    create_admin_parser.add_argument("--password", help="Admin password")
    create_admin_parser.add_argument("--force", action="store_true", help="Create admin even if other admins exist")
    
    # Initialize database command
    init_db_parser = subparsers.add_parser("init-db", help="Initialize the database")
    
    # Add log level argument to all commands
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
                       help="Set the logging level")
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.log_level)
    
    # Execute command
    if args.command == "create-admin":
        create_admin_command(args)
    elif args.command == "init-db":
        init_db_command()
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 