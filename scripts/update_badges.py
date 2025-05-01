#!/usr/bin/env python3
"""
Script to update version badges in README.md
"""

import re
import os
import sys
from typing import Dict

def read_versions() -> Dict[str, str]:
    """Read versions from environment variables set by GitHub Actions."""
    versions = {
        'python': os.getenv('PYTHON_VERSION', '3.12+'),
        'fastapi': os.getenv('FASTAPI_VERSION', '0.100+'),
        'postgresql': os.getenv('POSTGRES_VERSION', '13+'),
        'react': os.getenv('REACT_VERSION', '18.0+')
    }
    return versions

def update_readme(versions: Dict[str, str]) -> None:
    """Update version badges in README.md."""
    readme_path = 'README.md'
    
    with open(readme_path, 'r') as f:
        content = f.read()
    
    # Update Python version badge
    content = re.sub(
        r'\[!\[Python Version\]\(https://img\.shields\.io/badge/python-[\d\.]+\+-blue\.svg\)\]',
        f'[![Python Version](https://img.shields.io/badge/python-{versions["python"]}-blue.svg)]',
        content
    )
    
    # Update FastAPI version badge
    content = re.sub(
        r'\[!\[FastAPI Version\]\(https://img\.shields\.io/badge/fastapi-[\d\.]+\+-009688\.svg\)\]',
        f'[![FastAPI Version](https://img.shields.io/badge/fastapi-{versions["fastapi"]}-009688.svg)]',
        content
    )
    
    # Update PostgreSQL version badge
    content = re.sub(
        r'\[!\[PostgreSQL Version\]\(https://img\.shields\.io/badge/postgresql-[\d\.]+\+-336791\.svg\)\]',
        f'[![PostgreSQL Version](https://img.shields.io/badge/postgresql-{versions["postgresql"]}-336791.svg)]',
        content
    )
    
    # Update React version badge
    content = re.sub(
        r'\[!\[React Version\]\(https://img\.shields\.io/badge/react-[\d\.]+\+-61DAFB\.svg\)\]',
        f'[![React Version](https://img.shields.io/badge/react-{versions["react"]}-61DAFB.svg)]',
        content
    )
    
    with open(readme_path, 'w') as f:
        f.write(content)

def main():
    versions = read_versions()
    update_readme(versions)
    print("Successfully updated version badges in README.md")

if __name__ == '__main__':
    main() 