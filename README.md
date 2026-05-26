# Promonkey Backend API

Node.js + Express + MongoDB backend for the Promonkey project management platform.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (Bearer token)
- **File Uploads:** Cloudinary via multer-storage-cloudinary
- **Email:** Nodemailer

---

## Getting Started

```bash
# Install dependencies
npm install

# Add environment variables
cp .env.example .env   # fill in your values

# Start server
npm run dev
```

Server runs on `http://localhost:6969`

---

## Environment Variables

| Key | Description |
|-----|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EMAIL_USER` | Sender email address |
| `EMAIL_PASS` | Sender email password / app password |
| `PORT` | Server port (default: 6969) |

---

## Auth

All protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Roles
| Role | Description |
|------|-------------|
| `admin` | Full access |
| `employee` | Access based on assigned role & permissions |
| `client` | Can only view their own projects |

---

## API Reference

Base URL: `/api`

---

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and get JWT token |

---

### 👥 Clients — `/api/clients`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/clients` | Admin | Create a client (also creates login account) |
| GET | `/api/clients` | Admin / Employee (read permission) | List all clients |
| GET | `/api/clients/:id` | Admin / Employee (read permission) | Get client by ID |
| PUT | `/api/clients/:id` | Admin | Update client |
| DELETE | `/api/clients/:id` | Admin | Delete client + linked user account |

**Create / Update Client** — `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clientName` | string | ✅ | Full name |
| `email` | string | ✅ | Unique email (also used for login) |
| `phone` | string | ✅ | Phone number |
| `address` | string | ✅ | Address |
| `password` | string | ✅ (create only) | Login password |
| `companyName` | string | ❌ | Company name |
| `notes` | string | ❌ | Additional notes |
| `profileImage` | file | ❌ | Profile image (jpg/png/webp, max 2MB) |

---

### 👨‍💼 Employees — `/api/employees`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/employees` | Admin | Create employee |
| GET | `/api/employees` | Admin / Employee (read permission) | List all employees |
| GET | `/api/employees/:id` | Admin / Employee (read permission) | Get employee by ID |
| PUT | `/api/employees/:id` | Admin | Update employee |
| DELETE | `/api/employees/:id` | Admin | Delete employee |

---

### 🔑 Roles — `/api/roles`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/roles` | Admin | Create role |
| GET | `/api/roles` | Admin | List all roles |
| GET | `/api/roles/:id` | Admin | Get role by ID |
| PUT | `/api/roles/:id` | Admin | Update role |
| DELETE | `/api/roles/:id` | Admin | Delete role |

---

### 🛡️ Permissions — `/api/permissions`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/permissions` | Admin | Create permission |
| GET | `/api/permissions` | Admin | List all permissions |
| GET | `/api/permissions/:id` | Admin | Get permission by ID |
| PUT | `/api/permissions/:id` | Admin | Update permission |
| DELETE | `/api/permissions/:id` | Admin | Delete permission |

---

### 📁 Projects — `/api/projects`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/projects` | Admin | Create a project |
| GET | `/api/projects` | Admin / Employee (read permission) / Client (own) | List all projects |
| GET | `/api/projects/:id` | Admin / Employee (read permission) / Client (own) | Get project by ID |
| PUT | `/api/projects/:id` | Admin | Update project |
| PUT | `/api/projects/:id/phases` | Admin | Replace phases array |
| DELETE | `/api/projects/:id/docs/:docId` | Admin | Delete one requirement doc |
| DELETE | `/api/projects/:id` | Admin | Delete entire project |

---

#### 1. POST `/api/projects` — Create Project

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Project name |
| `client` | ObjectId | ✅ | Client `_id` |
| `startDate` | date | ✅ | ISO 8601 e.g. `2025-06-01` |
| `estimatedEndDate` | date | ✅ | ISO 8601 e.g. `2025-09-30` |
| `description` | string | ❌ | Short description |
| `actualEndDate` | date | ❌ | Actual completion date |
| `status` | string | ❌ | `not_started` \| `in_progress` \| `completed` \| `on_hold` \| `cancelled` (default: `not_started`) |
| `priority` | string | ❌ | `low` \| `medium` \| `high` \| `critical` (default: `medium`) |
| `phases` | JSON string | ❌ | Stringify'd array of phase objects |
| `requirementDocs` | file(s) | ❌ | Max 10 files — PDF, DOC, DOCX, XLS, XLSX, images, TXT (max 10MB each) |

**Phase object shape:**
```json
{
  "name": "Discovery",
  "description": "Requirement gathering",
  "startDate": "2025-06-01",
  "endDate": "2025-06-15",
  "status": "not_started",
  "order": 1
}
```
Phase `status` values: `not_started` | `in_progress` | `completed` | `on_hold`

**Request (cURL):**
```bash
curl -X POST http://localhost:6969/api/projects \
  -H "Authorization: Bearer <token>" \
  -F "name=Website Redesign" \
  -F "client=664abc123def456789012345" \
  -F "startDate=2025-06-01" \
  -F "estimatedEndDate=2025-09-30" \
  -F "description=Full redesign of the company website" \
  -F "priority=high" \
  -F "status=not_started" \
  -F 'phases=[{"name":"Discovery","description":"Requirement gathering","startDate":"2025-06-01","endDate":"2025-06-15","status":"not_started","order":1},{"name":"Design","description":"UI/UX wireframes","startDate":"2025-06-16","endDate":"2025-07-15","status":"not_started","order":2},{"name":"Development","description":"Frontend + Backend","startDate":"2025-07-16","endDate":"2025-09-15","status":"not_started","order":3}]' \
  -F "requirementDocs=@/path/to/brief.pdf" \
  -F "requirementDocs=@/path/to/wireframes.png"
```

**✅ Response `201`:**
```json
{
  "_id": "6650f1a2c3d4e5f678901234",
  "name": "Website Redesign",
  "description": "Full redesign of the company website",
  "client": {
    "_id": "664abc123def456789012345",
    "clientName": "Rahul Sharma",
    "companyName": "Sharma Pvt Ltd",
    "email": "rahul@example.com",
    "phone": "9876543210",
    "profileImage": {
      "url": "https://res.cloudinary.com/demo/image/upload/promonkey/clients/rahul.jpg",
      "publicId": "promonkey/clients/rahul"
    }
  },
  "startDate": "2025-06-01T00:00:00.000Z",
  "estimatedEndDate": "2025-09-30T00:00:00.000Z",
  "actualEndDate": null,
  "status": "not_started",
  "priority": "high",
  "phases": [
    {
      "_id": "6650f1a2c3d4e5f678901235",
      "name": "Discovery",
      "description": "Requirement gathering",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-06-15T00:00:00.000Z",
      "status": "not_started",
      "order": 1
    },
    {
      "_id": "6650f1a2c3d4e5f678901236",
      "name": "Design",
      "description": "UI/UX wireframes",
      "startDate": "2025-06-16T00:00:00.000Z",
      "endDate": "2025-07-15T00:00:00.000Z",
      "status": "not_started",
      "order": 2
    },
    {
      "_id": "6650f1a2c3d4e5f678901237",
      "name": "Development",
      "description": "Frontend + Backend",
      "startDate": "2025-07-16T00:00:00.000Z",
      "endDate": "2025-09-15T00:00:00.000Z",
      "status": "not_started",
      "order": 3
    }
  ],
  "requirementDocs": [
    {
      "_id": "6650f1a2c3d4e5f678901238",
      "name": "brief.pdf",
      "url": "https://res.cloudinary.com/demo/raw/upload/promonkey/projects/docs/1717200000000-brief.pdf",
      "publicId": "promonkey/projects/docs/1717200000000-brief.pdf",
      "fileType": "application/pdf",
      "uploadedAt": "2025-06-01T10:00:00.000Z"
    },
    {
      "_id": "6650f1a2c3d4e5f678901239",
      "name": "wireframes.png",
      "url": "https://res.cloudinary.com/demo/image/upload/promonkey/projects/docs/1717200000001-wireframes.png",
      "publicId": "promonkey/projects/docs/1717200000001-wireframes.png",
      "fileType": "image/png",
      "uploadedAt": "2025-06-01T10:00:05.000Z"
    }
  ],
  "createdBy": {
    "_id": "6640000000000000000000001",
    "name": "Admin User",
    "email": "admin@promonkey.com"
  },
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

**❌ Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| `400` | Missing required fields | `{ "message": "name, client, startDate, and estimatedEndDate are required" }` |
| `400` | Invalid phases JSON | `{ "message": "Invalid phases format. Must be a JSON array." }` |
| `401` | No / invalid token | `{ "success": false, "message": "Not authorized, token missing" }` |
| `403` | Not admin | `{ "success": false, "message": "Access denied. Required: admin" }` |
| `404` | Client not found | `{ "message": "Client not found" }` |
| `500` | Server error | `{ "message": "<error details>" }` |

---

#### 2. GET `/api/projects` — List All Projects

**Query Params (optional):**

| Param | Example | Description |
|-------|---------|-------------|
| `status` | `?status=in_progress` | Filter by project status |
| `priority` | `?priority=high` | Filter by priority |
| `client` | `?client=664abc...` | Filter by client ID (admin/employee only) |

> Client role users automatically see only their own projects — no filter needed.

**Request:**
```bash
curl -X GET "http://localhost:6969/api/projects?status=in_progress&priority=high" \
  -H "Authorization: Bearer <token>"
```

**✅ Response `200`:**
```json
[
  {
    "_id": "6650f1a2c3d4e5f678901234",
    "name": "Website Redesign",
    "description": "Full redesign of the company website",
    "client": {
      "_id": "664abc123def456789012345",
      "clientName": "Rahul Sharma",
      "companyName": "Sharma Pvt Ltd",
      "email": "rahul@example.com",
      "phone": "9876543210",
      "profileImage": {
        "url": "https://res.cloudinary.com/demo/image/upload/promonkey/clients/rahul.jpg",
        "publicId": "promonkey/clients/rahul"
      }
    },
    "startDate": "2025-06-01T00:00:00.000Z",
    "estimatedEndDate": "2025-09-30T00:00:00.000Z",
    "actualEndDate": null,
    "status": "in_progress",
    "priority": "high",
    "phases": [
      {
        "_id": "6650f1a2c3d4e5f678901235",
        "name": "Discovery",
        "description": "Requirement gathering",
        "startDate": "2025-06-01T00:00:00.000Z",
        "endDate": "2025-06-15T00:00:00.000Z",
        "status": "completed",
        "order": 1
      }
    ],
    "requirementDocs": [
      {
        "_id": "6650f1a2c3d4e5f678901238",
        "name": "brief.pdf",
        "url": "https://res.cloudinary.com/demo/raw/upload/promonkey/projects/docs/brief.pdf",
        "publicId": "promonkey/projects/docs/brief.pdf",
        "fileType": "application/pdf",
        "uploadedAt": "2025-06-01T10:00:00.000Z"
      }
    ],
    "createdBy": {
      "_id": "6640000000000000000000001",
      "name": "Admin User",
      "email": "admin@promonkey.com"
    },
    "createdAt": "2025-06-01T10:00:00.000Z",
    "updatedAt": "2025-06-10T08:00:00.000Z"
  }
]
```

**❌ Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| `401` | No / invalid token | `{ "success": false, "message": "Not authorized, token missing" }` |
| `403` | No read permission | `{ "success": false, "message": "Access denied. You do not have \"read\" permission on \"Projects\"" }` |
| `500` | Server error | `{ "message": "<error details>" }` |

---

#### 3. GET `/api/projects/:id` — Get Project by ID

**Request:**
```bash
curl -X GET http://localhost:6969/api/projects/6650f1a2c3d4e5f678901234 \
  -H "Authorization: Bearer <token>"
```

**✅ Response `200`:** *(same shape as single object in list above)*

**❌ Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| `403` | Client accessing another client's project | `{ "message": "Access denied" }` |
| `404` | Project not found | `{ "message": "Project not found" }` |
| `401` | No / invalid token | `{ "success": false, "message": "Not authorized, token missing" }` |

---

#### 4. PUT `/api/projects/:id` — Update Project

**Content-Type:** `multipart/form-data`  
All fields are optional. Only send what you want to change. New `requirementDocs` files are **appended** (existing docs are not removed).

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | New project name |
| `client` | ObjectId | Change linked client |
| `description` | string | Update description |
| `startDate` | date | Update start date |
| `estimatedEndDate` | date | Update estimated end date |
| `actualEndDate` | date | Set actual completion date |
| `status` | string | `not_started` \| `in_progress` \| `completed` \| `on_hold` \| `cancelled` |
| `priority` | string | `low` \| `medium` \| `high` \| `critical` |
| `phases` | JSON string | Replaces entire phases array |
| `requirementDocs` | file(s) | New files to append (max 10 per request) |

**Request:**
```bash
curl -X PUT http://localhost:6969/api/projects/6650f1a2c3d4e5f678901234 \
  -H "Authorization: Bearer <token>" \
  -F "status=in_progress" \
  -F "actualEndDate=2025-09-20" \
  -F "requirementDocs=@/path/to/updated-spec.pdf"
```

**✅ Response `200`:** *(full updated project object — same shape as create response)*

**❌ Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| `400` | Invalid phases JSON | `{ "message": "Invalid phases format. Must be a JSON array." }` |
| `403` | Not admin | `{ "success": false, "message": "Access denied. Required: admin" }` |
| `404` | Project not found | `{ "message": "Project not found" }` |
| `404` | New client ID not found | `{ "message": "Client not found" }` |

---

#### 5. PUT `/api/projects/:id/phases` — Replace Phases

**Content-Type:** `application/json`

**Request body:**
```json
{
  "phases": [
    {
      "name": "Discovery",
      "description": "Requirement gathering",
      "startDate": "2025-06-01",
      "endDate": "2025-06-15",
      "status": "completed",
      "order": 1
    },
    {
      "name": "Design",
      "description": "UI/UX wireframes",
      "startDate": "2025-06-16",
      "endDate": "2025-07-15",
      "status": "in_progress",
      "order": 2
    }
  ]
}
```

**Request:**
```bash
curl -X PUT http://localhost:6969/api/projects/6650f1a2c3d4e5f678901234/phases \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"phases":[{"name":"Discovery","status":"completed","order":1},{"name":"Design","status":"in_progress","order":2}]}'
```

**✅ Response `200`:** *(full updated project object with new phases)*

**❌ Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| `400` | phases is not an array | `{ "message": "phases must be an array" }` |
| `403` | Not admin | `{ "success": false, "message": "Access denied. Required: admin" }` |
| `404` | Project not found | `{ "message": "Project not found" }` |

---

#### 6. DELETE `/api/projects/:id/docs/:docId` — Delete One Requirement Doc

Removes a single document from the project and deletes it from Cloudinary.

**Request:**
```bash
curl -X DELETE http://localhost:6969/api/projects/6650f1a2c3d4e5f678901234/docs/6650f1a2c3d4e5f678901238 \
  -H "Authorization: Bearer <token>"
```

**✅ Response `200`:**
```json
{
  "message": "Document deleted successfully"
}
```

**❌ Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| `403` | Not admin | `{ "success": false, "message": "Access denied. Required: admin" }` |
| `404` | Project not found | `{ "message": "Project not found" }` |
| `404` | Doc ID not found | `{ "message": "Document not found" }` |

---

#### 7. DELETE `/api/projects/:id` — Delete Project

Deletes the project and **all its requirement docs from Cloudinary**.

**Request:**
```bash
curl -X DELETE http://localhost:6969/api/projects/6650f1a2c3d4e5f678901234 \
  -H "Authorization: Bearer <token>"
```

**✅ Response `200`:**
```json
{
  "message": "Project deleted successfully"
}
```

**❌ Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| `403` | Not admin | `{ "success": false, "message": "Access denied. Required: admin" }` |
| `404` | Project not found | `{ "message": "Project not found" }` |

---

## Cloudinary Upload Folders

| Type | Folder |
|------|--------|
| Employee profile images | `promonkey/employees` |
| Client profile images | `promonkey/clients` |
| Admin profile images | `promonkey/admins` |
| Project requirement docs | `promonkey/projects/docs` |

---

## Project Structure

```
src/
├── config/
│   ├── cloudinary.js     # Multer + Cloudinary setup
│   └── db.js             # MongoDB connection
├── controllers/
│   ├── authController.js
│   ├── clientController.js
│   ├── employeeController.js
│   ├── permissionController.js
│   ├── projectController.js
│   └── roleController.js
├── middleware/
│   └── authMiddleware.js  # protect, authorize, checkPermission
├── models/
│   ├── Client.js
│   ├── Employee.js
│   ├── Permission.js
│   ├── Project.js
│   ├── Role.js
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   ├── clientRoutes.js
│   ├── employeeRoutes.js
│   ├── permissionRoutes.js
│   ├── projectRoutes.js
│   └── roleRoutes.js
└── utils/
    └── sendEmail.js
server.js
```
