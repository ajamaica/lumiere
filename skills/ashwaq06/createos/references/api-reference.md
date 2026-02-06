# CreateOS API Reference

Complete API reference for CreateOS cloud deployment platform.

## Base URL

```
https://api-createos.nodeops.network
```

## Authentication

All API requests require authentication via Bearer token:

```
Authorization: Bearer <your-api-key>
```

Obtain API keys via `POST /v1/api-keys` or the CreateOS dashboard.

---

## Projects

### Create Project

`POST /v1/projects`

**Request Body:**

| Field               | Type    | Required | Description                                         |
| ------------------- | ------- | -------- | --------------------------------------------------- |
| uniqueName          | string  | Yes      | URL-safe identifier (4-32 chars, `^[a-zA-Z0-9-]+$`) |
| displayName         | string  | Yes      | Human-readable name (4-48 chars)                    |
| type                | string  | Yes      | `vcs`, `image`, or `upload`                         |
| source              | object  | Yes      | Source configuration (see below)                    |
| settings            | object  | Yes      | Build/runtime settings (see below)                  |
| appId               | string  | No       | App ID to associate with                            |
| enabledSecurityScan | boolean | No       | Enable vulnerability scanning                       |

**Source Configuration:**

For VCS projects:

```json
{
  "vcsName": "github",
  "vcsInstallationId": "12345678",
  "vcsRepoId": "98765432"
}
```

For image/upload projects:

```json
{}
```

**Settings Configuration:**

| Field          | Type    | Description                                     |
| -------------- | ------- | ----------------------------------------------- |
| framework      | string  | Framework identifier (nextjs, fastapi, etc.)    |
| runtime        | string  | Runtime identifier (node:20, python:3.12, etc.) |
| port           | integer | Application listen port (1-65535)               |
| directoryPath  | string  | Subdirectory path in repo (default: ".")        |
| installCommand | string  | Dependency installation command                 |
| buildCommand   | string  | Build command                                   |
| runCommand     | string  | Application start command                       |
| buildDir       | string  | Build output directory                          |
| buildVars      | object  | Build-time environment variables                |
| runEnvs        | object  | Runtime environment variables                   |
| ignoreBranches | array   | Branches to skip for auto-deploy                |
| hasDockerfile  | boolean | Use Dockerfile for build                        |
| useBuildAI     | boolean | Auto-detect build configuration                 |

**Response:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "uniqueName": "my-app",
  "displayName": "My Application",
  "type": "vcs",
  "status": "active",
  "createdAt": "2025-01-15T10:30:00Z",
  "url": "https://my-app.createos.io"
}
```

---

### List Projects

`GET /v1/projects`

**Query Parameters:**

| Param  | Type    | Default | Description                                  |
| ------ | ------- | ------- | -------------------------------------------- |
| limit  | integer | 10      | Max results (1-20)                           |
| offset | integer | 0       | Skip count                                   |
| name   | string  | -       | Filter by name (partial match)               |
| type   | string  | -       | Filter: `vcs`, `image`, `upload`             |
| status | string  | -       | Filter: `active`, `deleting`, `deleted`      |
| app    | string  | -       | Filter by app ID (use `null` for unassigned) |

---

### Get Project

`GET /v1/projects/{project_id}`

---

### Update Project

`PATCH /v1/projects/{project_id}`

**Request Body:**

```json
{
  "displayName": "New Name",
  "description": "Updated description",
  "enabledSecurityScan": true
}
```

---

### Update Project Settings

`PATCH /v1/projects/{project_id}/settings`

**Request Body:** Same as settings in Create Project

---

### Delete Project

`DELETE /v1/projects/{project_id}`

**Note:** Async operation. Project enters `deleting` status.

---

## Deployments

### Create Deployment (Image Projects)

`POST /v1/projects/{project_id}/deployments`

**Request Body:**

```json
{
  "image": "nginx:latest"
}
```

---

### Trigger Deployment (VCS Projects)

`POST /v1/projects/{project_id}/deployments/trigger`

**Request Body:**

```json
{
  "branch": "main"
}
```

---

### Upload Files (Upload Projects)

`POST /v1/projects/{project_id}/deployments/files`

**Request Body:**

```json
{
  "files": [
    { "path": "index.html", "content": "<!DOCTYPE html>..." },
    { "path": "app.js", "content": "const x = 1;" }
  ]
}
```

**Limits:** Max 100 files per request

---

### Upload Base64 Files

`POST /v1/projects/{project_id}/deployments/files/base64`

**Request Body:**

```json
{
  "files": [{ "path": "image.png", "content": "iVBORw0KGgo..." }]
}
```

---

### Upload ZIP

`POST /v1/projects/{project_id}/deployments/zip`

**Content-Type:** `multipart/form-data`

**Form Field:** `file` - ZIP file binary

---

### List Deployments

`GET /v1/projects/{project_id}/deployments`

**Query Parameters:**

| Param  | Type    | Default | Description        |
| ------ | ------- | ------- | ------------------ |
| limit  | integer | 10      | Max results (1-20) |
| offset | integer | 0       | Skip count         |

---

### Get Deployment

`GET /v1/projects/{project_id}/deployments/{deployment_id}`

**Response:**

```json
{
  "id": "deployment-uuid",
  "status": "deployed",
  "image": "nginx:latest",
  "createdAt": "2025-01-15T10:30:00Z",
  "deployedAt": "2025-01-15T10:35:00Z",
  "url": "https://deployment-hash.createos.io"
}
```

**Deployment Statuses:** `queued`, `building`, `deploying`, `deployed`, `failed`, `sleeping`

---

### Retry Deployment

`POST /v1/projects/{project_id}/deployments/{deployment_id}/retry`

**Query Parameters:**

| Param    | Type   | Default    | Description               |
| -------- | ------ | ---------- | ------------------------- |
| settings | string | deployment | `project` or `deployment` |

---

### Cancel Deployment

`POST /v1/projects/{project_id}/deployments/{deployment_id}/cancel`

**Note:** Only works for `queued` or `building` status

---

### Wake Deployment

`POST /v1/projects/{project_id}/deployments/{deployment_id}/wake`

**Note:** Wakes a `sleeping` deployment

---

### Get Build Logs

`GET /v1/projects/{project_id}/deployments/{deployment_id}/logs/build`

**Query Parameters:**

| Param | Type    | Default | Description   |
| ----- | ------- | ------- | ------------- |
| skip  | integer | 0       | Lines to skip |

---

### Get Runtime Logs

`GET /v1/projects/{project_id}/deployments/{deployment_id}/logs/runtime`

**Query Parameters:**

| Param         | Type    | Default | Description      |
| ------------- | ------- | ------- | ---------------- |
| since-seconds | integer | 60      | Look-back window |

---

## Environments

### Create Environment

`POST /v1/projects/{project_id}/environments`

**Request Body:**

```json
{
  "uniqueName": "production",
  "displayName": "Production",
  "description": "Live production environment",
  "branch": "main",
  "isAutoPromoteEnabled": true,
  "resources": {
    "cpu": 500,
    "memory": 1024,
    "replicas": 2
  },
  "settings": {
    "runEnvs": {
      "NODE_ENV": "production",
      "DATABASE_URL": "postgresql://..."
    }
  }
}
```

**Resource Limits:**

| Resource | Min | Max  | Unit       |
| -------- | --- | ---- | ---------- |
| cpu      | 200 | 500  | millicores |
| memory   | 500 | 1024 | MB         |
| replicas | 1   | 3    | instances  |

---

### List Environments

`GET /v1/projects/{project_id}/environments`

---

### Update Environment

`PATCH /v1/projects/{project_id}/environments/{environment_id}`

**Request Body:**

```json
{
  "displayName": "Production",
  "description": "Updated description",
  "branch": "main",
  "isAutoPromoteEnabled": false
}
```

---

### Update Environment Variables

`PATCH /v1/projects/{project_id}/environments/{environment_id}/variables`

**Request Body:**

```json
{
  "runEnvs": {
    "NEW_VAR": "value",
    "UPDATED_VAR": "new-value"
  },
  "port": 8080
}
```

**Note:** `port` only available for image projects

---

### Update Resources

`PATCH /v1/projects/{project_id}/environments/{environment_id}/resources`

**Request Body:**

```json
{
  "cpu": 500,
  "memory": 1024,
  "replicas": 3
}
```

---

### Assign Deployment

`POST /v1/projects/{project_id}/environments/{environment_id}/assign`

**Request Body:**

```json
{
  "deploymentId": "deployment-uuid"
}
```

---

### Delete Environment

`DELETE /v1/projects/{project_id}/environments/{environment_id}`

---

## Domains

### Create Domain

`POST /v1/projects/{project_id}/domains`

**Request Body:**

```json
{
  "name": "api.example.com",
  "environmentId": "optional-env-uuid"
}
```

---

### List Domains

`GET /v1/projects/{project_id}/domains`

---

### Refresh Domain

`POST /v1/projects/{project_id}/domains/{domain_id}/refresh`

**Note:** Triggers DNS verification. Only for `pending` status.

---

### Update Domain Environment

`PATCH /v1/projects/{project_id}/domains/{domain_id}/environment`

**Request Body:**

```json
{
  "environmentId": "env-uuid"
}
```

---

### Delete Domain

`DELETE /v1/projects/{project_id}/domains/{domain_id}`

---

## Apps

### Create App

`POST /v1/apps`

**Request Body:**

```json
{
  "name": "My Platform",
  "description": "All services for my platform",
  "color": "#3B82F6"
}
```

---

### List Apps

`GET /v1/apps`

---

### Update App

`PATCH /v1/apps/{app_id}`

---

### Delete App

`DELETE /v1/apps/{app_id}`

**Note:** Projects are unassigned, not deleted.

---

### Add Projects to App

`POST /v1/apps/{app_id}/projects`

**Request Body:**

```json
{
  "projectIds": ["uuid1", "uuid2"]
}
```

---

### Remove Projects from App

`DELETE /v1/apps/{app_id}/projects`

**Request Body:**

```json
{
  "projectIds": ["uuid1"]
}
```

---

## GitHub Integration

### Install GitHub App

`POST /v1/github/install`

**Request Body:**

```json
{
  "installationId": 12345678,
  "code": "oauth-code-from-github"
}
```

---

### List Connected Accounts

`GET /v1/github/accounts`

---

### List Repositories

`GET /v1/github/{installation_id}/repositories`

---

### List Branches

`GET /v1/github/{installation_id}/repositories/{owner}/{repo}/branches`

**Query Parameters:**

| Param     | Type    | Default | Description                |
| --------- | ------- | ------- | -------------------------- |
| page      | integer | 1       | Page number                |
| per-page  | integer | 30      | Results per page (max 100) |
| protected | string  | -       | Filter: `true` or `false`  |

---

### Get Repository Content

`GET /v1/github/{installation_id}/repositories/{owner}/{repo}/content`

**Query Parameters:**

| Param   | Type   | Required | Description       |
| ------- | ------ | -------- | ----------------- |
| branch  | string | Yes      | Branch name       |
| treeSha | string | No       | Specific tree SHA |

---

## Analytics

### Get Environment Analytics

`GET /v1/projects/{project_id}/environments/{environment_id}/analytics`

**Query Parameters:**

| Param | Type    | Default    | Description    |
| ----- | ------- | ---------- | -------------- |
| start | integer | 1 hour ago | Unix timestamp |
| end   | integer | now        | Unix timestamp |

**Response:**

```json
{
  "overall": {
    "total": 10000,
    "success": 9500,
    "clientErrors": 400,
    "serverErrors": 100
  },
  "rpm": {
    "peak": 250,
    "average": 150
  },
  "successPercentage": 95.0,
  "topPaths": [...],
  "topErrors": [...]
}
```

---

## Security

### Trigger Security Scan

`POST /v1/projects/{project_id}/deployments/{deployment_id}/security/scan`

**Note:** Security scanning must be enabled on project.

---

### Get Security Scan

`GET /v1/projects/{project_id}/deployments/{deployment_id}/security`

---

### Download Security Report

`GET /v1/projects/{project_id}/deployments/{deployment_id}/security/download`

**Note:** Returns signed URL. Only when status is `successful`.

---

## API Keys

### Create API Key

`POST /v1/api-keys`

**Request Body:**

```json
{
  "name": "production-key",
  "description": "CI/CD integration",
  "expiryAt": "2025-12-31T23:59:59Z"
}
```

**Response includes key once:** Store it securely!

---

### List API Keys

`GET /v1/api-keys`

---

### Update API Key

`PATCH /v1/api-keys/{api_key_id}`

---

### Revoke API Key

`DELETE /v1/api-keys/{api_key_id}`

---

## User

### Get Current User

`GET /v1/user`

---

### Get Quotas

`GET /v1/user/quotas`

---

### Get Supported Types

`GET /v1/supported-types`

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid project name",
    "details": {...}
  }
}
```

**Common Error Codes:**

| Code             | HTTP Status | Description              |
| ---------------- | ----------- | ------------------------ |
| VALIDATION_ERROR | 400         | Invalid request data     |
| UNAUTHORIZED     | 401         | Missing/invalid API key  |
| FORBIDDEN        | 403         | Insufficient permissions |
| NOT_FOUND        | 404         | Resource not found       |
| CONFLICT         | 409         | Resource already exists  |
| RATE_LIMITED     | 429         | Too many requests        |
| INTERNAL_ERROR   | 500         | Server error             |

---

## Rate Limits

- 100 requests per minute per API key
- 1000 requests per hour per API key
- Deployment uploads: 10 per minute

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704070800
```
