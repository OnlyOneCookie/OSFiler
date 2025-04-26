# OSFiler Setup Guide

This guide provides instructions for setting up the OSFiler application, including installation, configuration, and deployment options.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Authentication](#authentication)
  - [Storage](#storage)
- [Deployment Options](#deployment-options)
- [Development Environment](#development-environment)
  - [Backend Development](#backend-development)
  - [Frontend Development](#frontend-development)
- [Upgrading](#upgrading)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before installing OSFiler, ensure you have the following:

- Python 3.12 or higher
- Node.js 16.0 or higher
- npm 8.0 or higher
- PostgreSQL 13.0 or higher
- 4GB RAM minimum (8GB recommended)
- 10GB disk space

## Installation

### Backend Setup

1. Clone the repository:

```bash
git clone https://github.com/osfiler/osfiler.git
cd osfiler
```

2. Create a Python virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install backend dependencies:

```bash
pip install -r requirements.txt
```

4. Copy the example environment file:

```bash
cp .env.example .env
```

5. Edit the `.env` file to configure your installation.

6. Initialize the database:

```bash
python cli.py init-db
```

7. Create an admin user:

```bash
python cli.py create-admin
```

**Note:** Creating an admin user is required to access the application. The application will not automatically create a default admin user.

8. Start the backend server:

```bash
python app.py
```

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install frontend dependencies:

```bash
npm install
```

3. Create a `.env` file for the frontend:

```bash
cp .env.example .env
```

4. Edit the `.env` file to point to your backend API.

5. Build the frontend:

```bash
npm run build
```

6. Serve the frontend (for development):

```bash
npm run dev
```

Or use a web server like Nginx to serve the built files.

## Configuration

### Environment Variables

OSFiler uses environment variables for configuration. Here are the most important ones:

#### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://osfiler:osfiler@db:5432/osfiler` |
| `SECRET_KEY` | Secret key for JWT encoding | `changeme` |
| `ENVIRONMENT` | Environment (development, testing, production) | `development` |
| `DEBUG` | Enable debug mode | `false` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `TOKEN_EXPIRATION` | JWT token expiration in hours | `24` |

#### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:8000/api` |
| `REACT_APP_ENVIRONMENT` | Environment | `development` |

### Database Setup

OSFiler uses PostgreSQL as its database. The application will automatically create the necessary tables when it first starts.

For production use, it's recommended to create a dedicated PostgreSQL user and database:

```sql
CREATE USER osfiler WITH PASSWORD 'secure_password';
CREATE DATABASE osfiler;
GRANT ALL PRIVILEGES ON DATABASE osfiler TO osfiler;
```

Then update your `.env` file with the proper `DATABASE_URL`.

### Authentication

OSFiler uses JWT (JSON Web Token) for authentication. Make sure to set a strong `SECRET_KEY` in your environment variables for production deployments.

You can customize token expiration time using the `TOKEN_EXPIRATION` environment variable.

**Important:** Admin users can only be created using the CLI command:
```bash
python cli.py create-admin
```

### Storage

By default, OSFiler stores files locally. For production, you might want to configure external storage like S3. This can be configured using these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_TYPE` | Storage type (local, s3) | `local` |
| `STORAGE_PATH` | Local storage path | `./data/storage` |
| `S3_BUCKET` | S3 bucket name | |
| `S3_ACCESS_KEY` | S3 access key | |
| `S3_SECRET_KEY` | S3 secret key | |
| `S3_REGION` | S3 region | |

## Deployment Options

### Manual Deployment

For manual deployment:

1. Set up a PostgreSQL database
2. Deploy the backend API using a WSGI server like Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

3. Build the frontend:

```bash
cd frontend && npm run build
```

4. Serve the frontend with Nginx or another web server
5. Configure a reverse proxy to route API requests to the backend

*Note: Docker deployment options will be available in future releases.*

## Development Environment

### Backend Development

Run the development server:

```bash
python backend.py
```

This will start the backend API with auto-reload enabled.

### Frontend Development

Start the development server:

```bash
cd frontend
npm run dev
```

This will start the React development server with hot module replacement.

## Upgrading

To upgrade OSFiler to a newer version:

1. Back up your database and environment files
2. Pull the latest changes from the repository:

```bash
git pull origin main
```

3. Update dependencies:

```bash
# For backend
pip install -r requirements.txt

# For frontend
cd frontend
npm install
```

4. Restart the application

## Troubleshooting

### Common Issues

#### Backend won't start

- Check the logs: `backend/logs/`
- Verify database connection
- Ensure required environment variables are set
- Make sure you've created an admin user with `python cli.py create-admin`

#### Frontend shows blank screen

- Check browser console for errors
- Verify API URL is correctly set
- Check browser network tab for failed requests

#### Error: "Module not found"

- Ensure the module exists in the `backend/modules/addons` directory
- Check the module name is correct
- Verify the module follows the required structure (inherits from BaseModule)
- Use the module reload functionality in the admin panel to reload modules

#### Database connection errors

- Verify PostgreSQL is running
- Check DATABASE_URL in your .env file
- Ensure the database exists and the user has appropriate permissions

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/osfiler/osfiler/issues)
2. Join the community discussion on [Discord]()
3. Search the documentation for similar problems
4. Create a new issue with detailed information about your problem