# OSFiler API Documentation

This document provides detailed information about the OSFiler API, including authentication, available endpoints, request/response formats, and usage examples.

## Table of Contents

- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Investigation Endpoints](#investigation-endpoints)
  - [Node Endpoints](#node-endpoints)
  - [Relationship Endpoints](#relationship-endpoints)
  - [Module Endpoints](#module-endpoints)
  - [Type Endpoints](#type-endpoints)
  - [User Endpoints](#user-endpoints)
  - [System Endpoints](#system-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Versioning](#api-versioning)

## Authentication

OSFiler API uses JWT (JSON Web Token) for authentication. To authenticate, you need to obtain a token by sending your credentials to the `/api/auth/login` endpoint.

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": "user_uuid",
  "username": "your_username",
  "is_admin": true
}
```

### Using the Token

Include the token in the `Authorization` header of your requests:

```http
GET /api/investigations
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The token expires after a certain period (default: 24 hours). If your token expires, you'll need to request a new one.

## API Endpoints

### Authentication Endpoints

#### Login

```http
POST /api/auth/login
```

Request body:

```json
{
  "username": "your_username",
  "password": "your_password"
}
```

#### Register (Admin-only)

```http
POST /api/auth/register
```

Request body:

```json
{
  "username": "new_user",
  "password": "secure_password",
  "email": "user@example.com",
  "full_name": "John Doe"
}
```

#### Get Current User

```http
GET /api/auth/me
```

#### Change Password

```http
POST /api/auth/change-password
```

Request body:

```json
{
  "old_password": "current_password",
  "new_password": "new_secure_password"
}
```

### Investigation Endpoints

#### List Investigations

```http
GET /api/investigations
```

Optional query parameters:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 100)
- `include_archived`: Include archived investigations (default: false)

#### Get Investigation

```http
GET /api/investigations/{investigation_id}
```

#### Create Investigation

```http
POST /api/investigations
```

Request body:

```json
{
  "title": "Investigation Title",
  "description": "Investigation description",
  "tags": ["tag1", "tag2"]
}
```

#### Update Investigation

```http
PUT /api/investigations/{investigation_id}
```

Request body:

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["tag1", "tag2", "tag3"],
  "is_archived": false
}
```

#### Delete Investigation

```http
DELETE /api/investigations/{investigation_id}
```

#### Archive Investigation

```http
POST /api/investigations/{investigation_id}/archive
```

#### Unarchive Investigation

```http
POST /api/investigations/{investigation_id}/unarchive
```

#### Export Investigation

```http
GET /api/investigations/{investigation_id}/export
```

#### Import Investigation

```http
POST /api/investigations/import
```

Request body: The JSON exported from another investigation

### Node Endpoints

#### List Nodes

```http
GET /api/investigations/{investigation_id}/nodes
```

Optional query parameters:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 100)
- `type_filter`: Filter by node type

#### Get Node

```http
GET /api/nodes/{node_id}
```

#### Create Node

```http
POST /api/nodes
```

Request body:

```json
{
  "investigation_id": "investigation_uuid",
  "type": "PERSON",
  "name": "John Doe",
  "data": {
    "age": 30,
    "occupation": "Developer"
  }
}
```

#### Update Node

```http
PUT /api/nodes/{node_id}
```

Request body:

```json
{
  "type": "PERSON",
  "name": "John Smith",
  "data": {
    "age": 31,
    "occupation": "Senior Developer"
  }
}
```

#### Delete Node

```http
DELETE /api/nodes/{node_id}
```

#### Search Nodes

```http
GET /api/investigations/{investigation_id}/nodes/search?query=john
```

Optional query parameters:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 100)
- `type_filter`: Filter by node type

### Relationship Endpoints

#### List Relationships

```http
GET /api/investigations/{investigation_id}/relationships
```

Optional query parameters:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 100)
- `type_filter`: Filter by relationship type

#### Get Relationship

```http
GET /api/relationships/{relationship_id}
```

#### Create Relationship

```http
POST /api/relationships
```

Request body:

```json
{
  "investigation_id": "investigation_uuid",
  "source_node_id": "source_node_uuid",
  "target_node_id": "target_node_uuid",
  "type": "KNOWS",
  "strength": 0.8,
  "data": {
    "since": "2020-01-01",
    "context": "Work colleagues"
  }
}
```

#### Update Relationship

```http
PUT /api/relationships/{relationship_id}
```

Request body:

```json
{
  "type": "WORKS_WITH",
  "strength": 0.9,
  "data": {
    "since": "2019-01-01",
    "context": "Project partners"
  }
}
```

#### Delete Relationship

```http
DELETE /api/relationships/{relationship_id}
```

#### Check Relationship Exists

```http
GET /api/nodes/{source_id}/connected/{target_id}
```

### Module Endpoints

#### List Modules

```http
GET /api/modules
```

#### Get Module

```http
GET /api/modules/{module_name}
```

#### Execute Module

```http
POST /api/modules/{module_name}/execute
```

Request body:

```json
{
  "param1": "value1",
  "param2": "value2",
  "investigation_id": "investigation_uuid"
}
```

#### Get Module Parameters

```http
GET /api/modules/{module_name}/params
```

#### Get Module Configuration

```http
GET /api/modules/{module_name}/config
```

#### Update Module Configuration

```http
POST /api/modules/{module_name}/config
```

Request body: Module-specific configuration object

#### Reload Module

```http
POST /api/modules/{module_name}/reload
```

#### Reload All Modules

```http
POST /api/modules/reload-all
```

### Type Endpoints

#### Get Node Types

```http
GET /api/types/node
```

#### Get Relationship Types

```http
GET /api/types/relationship
```

#### Get Type

```http
GET /api/types/{type_id}
```

#### Create Type

```http
POST /api/types
```

Request body:

```json
{
  "value": "CUSTOM_TYPE",
  "entity_type": "node",
  "description": "Custom node type description"
}
```

#### Update Type

```http
PUT /api/types/{type_id}
```

Request body:

```json
{
  "value": "UPDATED_TYPE",
  "description": "Updated description"
}
```

#### Delete Type

```http
DELETE /api/types/{type_id}
```

### User Endpoints

#### List Users (Admin-only)

```http
GET /api/users
```

#### Get User (Admin-only)

```http
GET /api/users/{user_id}
```

#### Create User (Admin-only)

```http
POST /api/users
```

Request body:

```json
{
  "username": "new_user",
  "password": "secure_password",
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_admin": false
}
```

#### Update User (Admin-only)

```http
PUT /api/users/{user_id}
```

Request body:

```json
{
  "email": "updated@example.com",
  "full_name": "John Smith",
  "is_admin": true,
  "is_active": true
}
```

#### Delete User (Admin-only)

```http
DELETE /api/users/{user_id}
```

### System Endpoints

#### Health Check

```http
GET /api/health
```

#### System Settings

```http
GET /api/settings
```

## Error Handling

The API uses standard HTTP status codes to indicate success or failure:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request format or parameters
- `401 Unauthorized`: Authentication failed
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses have the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. If you exceed the rate limit, you'll receive a `429 Too Many Requests` response with a `Retry-After` header indicating when you can try again.

## API Versioning

The current version of the API is v1, which is implied in the base URL `/api/`. Future versions may be accessed via `/api/v2/`, etc.
