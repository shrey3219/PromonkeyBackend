# ProMonkey CRM — Backend API

Node.js + Express + MongoDB backend for ProMonkey CRM. Supports admin & employee auth, role-based permissions, and Cloudinary image uploads.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (Bearer token)
- **File Upload:** Multer + Cloudinary
- **Email:** Nodemailer (Gmail SMTP)
- **Password Hashing:** bcryptjs

---

## Project Structure

```
PromonkeyBackend/
├── server.js
├── .env
└── src/
    ├── config/
    │   ├── db.js               # MongoDB connection
    │   └── cloudinary.js       # Cloudinary + Multer setup
    ├── controllers/
    │   ├── authController.js
    │   ├── clientController.js
    │   ├── employeeController.js
    │   ├── permissionController.js
    │   └── roleController.js
    ├── middleware/
    │   └── authMiddleware.js   # protect, authorize, checkPermission
    ├── models/
    │   ├── User.js
    │   ├── Client.js
    │   ├── Employee.js
    │   ├── Role.js
    │   └── Permission.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── clientRoutes.js
    │   ├── employeeRoutes.js
    │   ├── permissionRoutes.js
    │   └── roleRoutes.js
    └── utils/
        └── sendEmail.js        # Welcome email on employee creation
```

---

## Environment Variables

Create a `.env` file in the root:

```env
PORT=6969
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Nodemailer (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=ProMonkey CRM <your_email@gmail.com>

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification ON → App Passwords → generate 16-char code

---

## Installation & Running

```bash
npm install

# Development (nodemon)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:6969`

---

## Authentication

All protected routes require:
```
Authorization: Bearer <token>
```

Token is returned on login. Expires in **7 days**.

---

## API Reference

Base URL: `http://localhost:6969/api`

---

### Auth Routes — `/api/auth`

#### POST `/api/auth/register`
Register the admin (only one admin allowed).

- **Auth:** None
- **Content-Type:** `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `name` | text | ✅ |
| `email` | text | ✅ |
| `password` | text | ✅ |
| `profileImage` | file (image) | ❌ |

**Response `201`:**
```json
{
  "_id": "...",
  "name": "Shrey",
  "email": "shrey@pro-monkey.com",
  "role": "admin",
  "profileImage": { "url": "...", "publicId": "..." },
  "createdAt": "..."
}
```

---

#### POST `/api/auth/login`
Admin login.

- **Auth:** None
- **Content-Type:** `application/json`

```json
{ "email": "shrey@pro-monkey.com", "password": "yourpassword" }
```

**Response `200`:**
```json
{
  "token": "eyJ...",
  "user": {
    "_id": "...",
    "name": "Shrey",
    "email": "shrey@pro-monkey.com",
    "role": "admin",
    "profileImage": { "url": "...", "publicId": "..." }
  }
}
```

---

#### POST `/api/auth/employee-login`
Employee login (separate from admin).

- **Auth:** None
- **Content-Type:** `application/json`

```json
{ "email": "emp@example.com", "password": "yourpassword" }
```

**Response `200`:**
```json
{
  "token": "eyJ...",
  "user": {
    "_id": "...",
    "name": "John",
    "email": "emp@example.com",
    "phone": "9999999999",
    "role": "employee",
    "profileImage": { "url": "...", "publicId": "..." }
  },
  "employee": {
    "_id": "...",
    "employeeId": "EMP001",
    "department": "Sales",
    "joiningDate": "...",
    "status": "Active",
    "role": { "_id": "...", "name": "Sales Manager" },
    "modules": {
      "Employees": ["read"],
      "Leads": ["create", "read", "update"]
    }
  }
}
```

---

#### PUT `/api/auth/update-profile`
Update logged-in user's profile (admin & employee both).

- **Auth:** ✅ Bearer token
- **Content-Type:** `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `name` | text | ❌ |
| `phone` | text | ❌ |
| `profileImage` | file (image) | ❌ |

> Old Cloudinary image is automatically deleted when a new one is uploaded.

**Response `200`:**
```json
{
  "_id": "...",
  "name": "Updated Name",
  "email": "shrey@pro-monkey.com",
  "phone": "9876543210",
  "role": "admin",
  "profileImage": { "url": "...", "publicId": "..." }
}
```

---

### Permission Routes — `/api/permissions`

> All routes require Bearer token. Create/Update/Delete are admin-only.

#### GET `/api/permissions`
Get all active permissions (flat list).

- **Auth:** ✅ Any logged-in user

**Response `200`:**
```json
[
  {
    "_id": "...",
    "module": "Employees",
    "actions": ["create", "read", "update", "delete"],
    "isActive": true
  }
]
```

---

#### GET `/api/permissions/grouped`
Get permissions grouped by module.

- **Auth:** ✅ Any logged-in user

**Response `200`:**
```json
[
  {
    "module": "Employees",
    "permissions": [
      { "_id": "...", "name": "Manage Employees", "actions": ["create", "read"] }
    ]
  }
]
```

---

#### POST `/api/permissions`
Create a new permission.

- **Auth:** ✅ Admin only
- **Content-Type:** `application/json`

| Field | Type | Required |
|---|---|---|
| `module` | string | ✅ |
| `actions` | string[] | ✅ |
| `name` | string | ❌ |

> Valid actions: `create`, `read`, `update`, `delete`

```json
{
  "module": "Leads",
  "actions": ["create", "read", "update"]
}
```

**Response `201`:** Permission object

---

#### PUT `/api/permissions/:id`
Update a permission.

- **Auth:** ✅ Admin only

| Field | Type | Required |
|---|---|---|
| `module` | string | ❌ |
| `actions` | string[] | ❌ |
| `name` | string | ❌ |

> At least one field required.

---

#### DELETE `/api/permissions/:id`
Soft-deactivate a permission (`isActive: false`).

- **Auth:** ✅ Admin only

**Response `200`:**
```json
{ "message": "Permission deactivated", "permission": { ... } }
```

---

### Role Routes — `/api/roles`

> Create/Update/Delete are admin-only.

#### GET `/api/roles`
Get all active roles with permissions.

- **Auth:** ✅ Any logged-in user

---

#### GET `/api/roles/hierarchy`
Get roles as a nested tree (parent → children).

- **Auth:** ✅ Any logged-in user

**Response `200`:**
```json
[
  {
    "_id": "...",
    "name": "Manager",
    "children": [
      { "_id": "...", "name": "Sales Executive", "children": [] }
    ]
  }
]
```

---

#### GET `/api/roles/:id`
Get a single role by ID.

- **Auth:** ✅ Any logged-in user

---

#### POST `/api/roles`
Create a new role.

- **Auth:** ✅ Admin only
- **Content-Type:** `application/json`

| Field | Type | Required |
|---|---|---|
| `name` | string | ✅ |
| `permissions` | ObjectId[] | ❌ |
| `parentRole` | ObjectId | ❌ |

```json
{
  "name": "Sales Manager",
  "permissions": ["permId1", "permId2"],
  "parentRole": "parentRoleId"
}
```

**Response `201`:** Role object with populated permissions

---

#### PUT `/api/roles/:id`
Update a role.

- **Auth:** ✅ Admin only

| Field | Type | Required |
|---|---|---|
| `name` | string | ❌ |
| `permissions` | ObjectId[] | ❌ |
| `parentRole` | ObjectId | ❌ |

---

#### DELETE `/api/roles/:id`
Soft-deactivate a role. Fails if child roles depend on it.

- **Auth:** ✅ Admin only

---

### Employee Routes — `/api/employees`

> All routes require Bearer token + respective permission check.

#### POST `/api/employees`
Create a new employee (admin only via permission check).

- **Auth:** ✅ `Employees → create`
- **Content-Type:** `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `name` | text | ✅ |
| `email` | text | ✅ |
| `password` | text | ✅ |
| `role` | ObjectId (text) | ✅ |
| `phone` | text | ❌ |
| `employeeId` | text | ❌ |
| `department` | text | ❌ |
| `joiningDate` | date (text) | ❌ |
| `profileImage` | file (image) | ❌ |

> On successful creation, a **welcome email** is sent to the employee with their login credentials (email + plain-text password).

**Response `201`:** Employee object with populated user + role

---

#### GET `/api/employees`
Get all employees.

- **Auth:** ✅ `Employees → read`

---

#### GET `/api/employees/:id`
Get a single employee by ID.

- **Auth:** ✅ `Employees → read`

---

#### PUT `/api/employees/:id`
Update employee details + optionally update profile image.

- **Auth:** ✅ `Employees → update`
- **Content-Type:** `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `employeeId` | text | ❌ |
| `department` | text | ❌ |
| `joiningDate` | date | ❌ |
| `role` | ObjectId | ❌ |
| `status` | `Active` / `Inactive` | ❌ |
| `profileImage` | file (image) | ❌ |

> Old Cloudinary image is automatically deleted when a new one is uploaded.

---

#### DELETE `/api/employees/:id`
Delete employee + linked user account + Cloudinary profile image.

- **Auth:** ✅ `Employees → delete`

**Response `200`:**
```json
{ "message": "Employee and login account deleted successfully" }
```

---

## Image Upload Rules

- **Accepted formats:** JPG, JPEG, PNG, WEBP
- **Max size:** 2 MB
- **Auto crop:** 400×400, face-centered
- **Storage folder:** `promonkey/employees` on Cloudinary
- **Field name (FormData):** `profileImage`

---

## Permission System

- Admin bypasses all permission checks automatically.
- Employees are checked against their assigned Role's permissions.
- Each permission has a `module` (e.g. `Employees`) and `actions` array (`create`, `read`, `update`, `delete`).
- Roles can have a `parentRole` for hierarchy.
- Deactivated roles/permissions block employee access immediately.

---

## Error Responses

All errors follow this format:

```json
{ "message": "Error description here" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request / validation error |
| `401` | Missing or invalid token |
| `403` | Forbidden (wrong role / no permission) |
| `404` | Resource not found |
| `500` | Internal server error |
