# Promonkey Backend — Project Module API Docs

Base URL: `http://localhost:6969/api`

All protected routes require:
```
Authorization: Bearer <token>
```

---

## 🚀 Complete Step-by-Step Walkthrough

Ye section ek poora real example hai — ek project banao, phases add karo, tasks assign karo, time log karo, stats dekho.

---

### STEP 1 — Admin Login (token lo)

**POST** `/api/auth/login`
```json
{
  "email": "admin@promonkey.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "661e1a2b3c4d5e6f7a8b9c0d",
    "name": "Admin User",
    "email": "admin@promonkey.com",
    "role": "admin"
  }
}
```

> Ab is `token` ko har request ke `Authorization: Bearer <token>` header mein daalo.

---

### STEP 2 — Client ka _id lo

**GET** `/api/clients`

**Response se client _id copy karo:**
```json
[
  {
    "_id": "663f1a2b3c4d5e6f7a8b9c0d",
    "clientName": "Rahul Sharma",
    "companyName": "TechCorp Pvt Ltd",
    "email": "rahul@techcorp.com"
  }
]
```

---

### STEP 3 — Employee ka _id lo (phase assign karne ke liye)

**GET** `/api/employees`

**Response se employee _ids copy karo:**
```json
[
  {
    "_id": "665b2c3d4e5f6a7b8c9d0e1f",
    "employeeId": "EMP001",
    "department": "Design",
    "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0e", "name": "UI Designer" },
    "user": { "name": "Priya Mehta", "email": "priya@promonkey.com" }
  },
  {
    "_id": "665b2c3d4e5f6a7b8c9d0e2a",
    "employeeId": "EMP002",
    "department": "Development",
    "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0f", "name": "Backend Developer" },
    "user": { "name": "Amit Kumar", "email": "amit@promonkey.com" }
  }
]
```

---

### STEP 4 — Project + Phases ek saath create karo

**POST** `/api/projects`  
**Content-Type:** `application/json` (agar koi file nahi upload karni)

```json
{
  "name": "Website Redesign",
  "client": "663f1a2b3c4d5e6f7a8b9c0d",
  "startDate": "2025-06-01",
  "estimatedEndDate": "2025-12-31",
  "description": "Full redesign of TechCorp website",
  "priority": "high",
  "status": "not_started",
  "phases": [
    {
      "name": "Discovery & Planning",
      "order": 1,
      "estimatedDuration": 80,
      "estimatedEndDate": "2025-07-15",
      "assignees": ["665b2c3d4e5f6a7b8c9d0e1f"]
    },
    {
      "name": "Design",
      "order": 2,
      "estimatedDuration": 120,
      "estimatedEndDate": "2025-09-30",
      "assignees": ["665b2c3d4e5f6a7b8c9d0e1f", "665b2c3d4e5f6a7b8c9d0e2a"]
    },
    {
      "name": "Development",
      "order": 3,
      "estimatedDuration": 200,
      "estimatedEndDate": "2025-12-15",
      "assignees": ["665b2c3d4e5f6a7b8c9d0e2a"]
    }
  ]
}
```

> **Agar file bhi upload karni hai** to `form-data` use karo aur `phases` ko JSON string ke roop mein bhejo:
> ```
> phases = [{"name":"Discovery & Planning","order":1,"estimatedDuration":80,...}]
> ```

**Response `201`:**
```json
{
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Website Redesign",
  "description": "Full redesign of TechCorp website",
  "client": {
    "_id": "663f1a2b3c4d5e6f7a8b9c0d",
    "clientName": "Rahul Sharma",
    "companyName": "TechCorp Pvt Ltd",
    "email": "rahul@techcorp.com",
    "phone": "9876543210"
  },
  "startDate": "2025-06-01T00:00:00.000Z",
  "estimatedEndDate": "2025-12-31T00:00:00.000Z",
  "actualEndDate": null,
  "status": "not_started",
  "priority": "high",
  "requirementDocs": [],
  "createdBy": {
    "_id": "661e1a2b3c4d5e6f7a8b9c0d",
    "name": "Admin User",
    "email": "admin@promonkey.com"
  },
  "phases": [
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f2a",
      "project": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Discovery & Planning",
      "order": 1,
      "estimatedDuration": 80,
      "estimatedEndDate": "2025-07-15T00:00:00.000Z",
      "actualStart": null,
      "actualEnd": null,
      "status": "not_started",
      "assignees": [
        {
          "_id": "665b2c3d4e5f6a7b8c9d0e1f",
          "employeeId": "EMP001",
          "department": "Design",
          "status": "Active",
          "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0e", "name": "UI Designer" },
          "user": {
            "_id": "661e1a2b3c4d5e6f7a8b9c0e",
            "name": "Priya Mehta",
            "email": "priya@promonkey.com",
            "profileImage": { "url": "https://res.cloudinary.com/demo/image/upload/v1/promonkey/employees/priya.jpg", "publicId": "promonkey/employees/priya" }
          }
        }
      ]
    },
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f3b",
      "project": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Design",
      "order": 2,
      "estimatedDuration": 120,
      "estimatedEndDate": "2025-09-30T00:00:00.000Z",
      "actualStart": null,
      "actualEnd": null,
      "status": "not_started",
      "assignees": [
        {
          "_id": "665b2c3d4e5f6a7b8c9d0e1f",
          "employeeId": "EMP001",
          "department": "Design",
          "status": "Active",
          "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0e", "name": "UI Designer" },
          "user": { "_id": "661e1a2b3c4d5e6f7a8b9c0e", "name": "Priya Mehta", "email": "priya@promonkey.com", "profileImage": { "url": "", "publicId": "" } }
        },
        {
          "_id": "665b2c3d4e5f6a7b8c9d0e2a",
          "employeeId": "EMP002",
          "department": "Development",
          "status": "Active",
          "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0f", "name": "Backend Developer" },
          "user": { "_id": "661e1a2b3c4d5e6f7a8b9c0f", "name": "Amit Kumar", "email": "amit@promonkey.com", "profileImage": { "url": "", "publicId": "" } }
        }
      ]
    },
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f4c",
      "project": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Development",
      "order": 3,
      "estimatedDuration": 200,
      "estimatedEndDate": "2025-12-15T00:00:00.000Z",
      "actualStart": null,
      "actualEnd": null,
      "status": "not_started",
      "assignees": [
        {
          "_id": "665b2c3d4e5f6a7b8c9d0e2a",
          "employeeId": "EMP002",
          "department": "Development",
          "status": "Active",
          "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0f", "name": "Backend Developer" },
          "user": { "_id": "661e1a2b3c4d5e6f7a8b9c0f", "name": "Amit Kumar", "email": "amit@promonkey.com", "profileImage": { "url": "", "publicId": "" } }
        }
      ]
    }
  ],
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

> **Copy karo:** `project._id` aur `phases[0]._id` — agle steps mein kaam aayenge.

---

### STEP 5 — Task create karo (phase ke andar)

**POST** `/api/tasks`  
**Content-Type:** `application/json`

```json
{
  "phase": "665c3d4e5f6a7b8c9d0e1f2a",
  "name": "Create wireframes",
  "description": "Design low-fidelity wireframes for all pages",
  "assignedTo": "665b2c3d4e5f6a7b8c9d0e1f",
  "estimatedHours": 16,
  "dueDate": "2025-06-20",
  "status": "not_started",
  "steps": [
    { "title": "Homepage wireframe" },
    { "title": "Dashboard wireframe" },
    { "title": "Mobile responsive layout" }
  ]
}
```

**Response `201`:**
```json
{
  "_id": "666d4e5f6a7b8c9d0e1f2a3b",
  "phase": { "_id": "665c3d4e5f6a7b8c9d0e1f2a", "name": "Discovery & Planning", "status": "not_started" },
  "project": { "_id": "664a1b2c3d4e5f6a7b8c9d0e", "name": "Website Redesign" },
  "name": "Create wireframes",
  "description": "Design low-fidelity wireframes for all pages",
  "assignedTo": {
    "_id": "665b2c3d4e5f6a7b8c9d0e1f",
    "employeeId": "EMP001",
    "department": "Design",
    "status": "Active",
    "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0e", "name": "UI Designer" },
    "user": { "_id": "661e1a2b3c4d5e6f7a8b9c0e", "name": "Priya Mehta", "email": "priya@promonkey.com", "profileImage": { "url": "", "publicId": "" } }
  },
  "estimatedHours": 16,
  "actualHoursLogged": 0,
  "dueDate": "2025-06-20T00:00:00.000Z",
  "status": "not_started",
  "steps": [
    { "_id": "666d4e5f6a7b8c9d0e1f2a3c", "title": "Homepage wireframe", "isCompleted": false },
    { "_id": "666d4e5f6a7b8c9d0e1f2a3d", "title": "Dashboard wireframe", "isCompleted": false },
    { "_id": "666d4e5f6a7b8c9d0e1f2a3e", "title": "Mobile responsive layout", "isCompleted": false }
  ],
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

---

### STEP 6 — Employee time log kare

Employee apna token use karega (employee login se mila hua).

**POST** `/api/time-entries`  
**Content-Type:** `application/json`

```json
{
  "taskId": "666d4e5f6a7b8c9d0e1f2a3b",
  "hoursLogged": 4.5,
  "date": "2025-06-10",
  "note": "Completed homepage wireframe draft"
}
```

**Response `201`:**
```json
{
  "_id": "667e5f6a7b8c9d0e1f2a3b4c",
  "task": { "_id": "666d4e5f6a7b8c9d0e1f2a3b", "name": "Create wireframes", "status": "not_started" },
  "phase": { "_id": "665c3d4e5f6a7b8c9d0e1f2a", "name": "Discovery & Planning" },
  "project": { "_id": "664a1b2c3d4e5f6a7b8c9d0e", "name": "Website Redesign" },
  "employee": {
    "_id": "665b2c3d4e5f6a7b8c9d0e1f",
    "employeeId": "EMP001",
    "department": "Design",
    "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0e", "name": "UI Designer" },
    "user": { "_id": "661e1a2b3c4d5e6f7a8b9c0e", "name": "Priya Mehta", "email": "priya@promonkey.com", "profileImage": { "url": "", "publicId": "" } }
  },
  "hoursLogged": 4.5,
  "date": "2025-06-10T00:00:00.000Z",
  "note": "Completed homepage wireframe draft",
  "createdAt": "2025-06-10T09:30:00.000Z"
}
```

> Task ka `actualHoursLogged` automatically `4.5` ho gaya.

---

### STEP 7 — Step complete karo (toggle)

**PATCH** `/api/tasks/666d4e5f6a7b8c9d0e1f2a3b/steps/666d4e5f6a7b8c9d0e1f2a3c`

No body needed.

**Response `200`:** Task object with step `isCompleted: true`

---

### STEP 8 — Project ki full stats dekho

**GET** `/api/stats/project/664a1b2c3d4e5f6a7b8c9d0e`

**Response `200`:**
```json
{
  "project": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Website Redesign",
    "status": "not_started",
    "priority": "high",
    "startDate": "2025-06-01T00:00:00.000Z",
    "estimatedEndDate": "2025-12-31T00:00:00.000Z"
  },
  "summary": {
    "totalPhases": 3,
    "completedPhases": 0,
    "delayedPhases": 0,
    "atRiskPhases": 0,
    "projectAtRisk": false,
    "totalEstimatedHours": 400,
    "totalActualHours": 4.5,
    "hoursOverrun": 0,
    "workingDaysElapsed": 7,
    "totalEstimatedDays": 152,
    "daysRemaining": 145
  },
  "phases": [
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f2a",
      "name": "Discovery & Planning",
      "order": 1,
      "status": "not_started",
      "estimatedDuration": 80,
      "actualHoursLogged": 4.5,
      "hoursOverrun": 0,
      "isDelayed": false,
      "isAtRisk": false,
      "taskSummary": { "total": 1, "completed": 0, "inProgress": 0, "notStarted": 1 }
    },
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f3b",
      "name": "Design",
      "order": 2,
      "status": "not_started",
      "estimatedDuration": 120,
      "actualHoursLogged": 0,
      "hoursOverrun": 0,
      "isDelayed": false,
      "isAtRisk": false,
      "taskSummary": { "total": 0, "completed": 0, "inProgress": 0, "notStarted": 0 }
    },
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f4c",
      "name": "Development",
      "order": 3,
      "status": "not_started",
      "estimatedDuration": 200,
      "actualHoursLogged": 0,
      "hoursOverrun": 0,
      "isDelayed": false,
      "isAtRisk": false,
      "taskSummary": { "total": 0, "completed": 0, "inProgress": 0, "notStarted": 0 }
    }
  ]
}
```

---

### Quick Reference — Kya kab use karna hai

```
Pehli baar setup:
  POST /api/auth/login              → token lo
  GET  /api/clients                 → client _id lo
  GET  /api/employees               → employee _ids lo

Project banana:
  POST /api/projects                → project + phases ek saath

Baad mein phase add karna:
  POST /api/phases                  → alag se phase add karo

Task banana:
  POST /api/tasks                   → phase _id do, employee assign karo

Time log karna (employee kare):
  POST /api/time-entries            → task _id do, hours do

Step complete karna:
  PATCH /api/tasks/:id/steps/:stepId

Stats dekhna:
  GET /api/stats/project/:projectId
  GET /api/stats/employee/:employeeId

Project update karna:
  PUT /api/projects/:id

Phase update / employee reassign:
  PUT /api/phases/:id
```

---

## Table of Contents

1. [Projects](#1-projects)
2. [Phases](#2-phases)
3. [Tasks](#3-tasks)
4. [Time Entries](#4-time-entries)
5. [Stats](#5-stats)

---

## 1. Projects

### POST `/api/projects`
**Auth:** Admin only  
**Content-Type:** `multipart/form-data` (because of file uploads)

**Request Body:**
```
name             string   required
client           ObjectId required  (Client _id)
startDate        date     required  e.g. "2025-06-01"
estimatedEndDate date     required  e.g. "2025-12-31"
description      string   optional
status           string   optional  not_started | in_progress | completed | on_hold | cancelled
priority         string   optional  low | medium | high | critical
requirementDocs  file[]   optional  max 10 files (pdf, docx, xls, xlsx, images, txt — max 10MB each)
```

**Response `201`:**
```json
{
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Website Redesign",
  "description": "Full redesign of client website",
  "client": {
    "_id": "663f1a2b3c4d5e6f7a8b9c0d",
    "clientName": "Rahul Sharma",
    "companyName": "TechCorp Pvt Ltd",
    "email": "rahul@techcorp.com",
    "phone": "9876543210",
    "profileImage": { "url": "", "publicId": "" }
  },
  "startDate": "2025-06-01T00:00:00.000Z",
  "estimatedEndDate": "2025-12-31T00:00:00.000Z",
  "actualEndDate": null,
  "status": "not_started",
  "priority": "high",
  "requirementDocs": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0f",
      "name": "requirements.pdf",
      "url": "https://res.cloudinary.com/demo/raw/upload/promonkey/projects/docs/requirements.pdf",
      "publicId": "promonkey/projects/docs/1234567890-requirements.pdf",
      "fileType": "application/pdf",
      "uploadedAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "createdBy": {
    "_id": "661e1a2b3c4d5e6f7a8b9c0d",
    "name": "Admin User",
    "email": "admin@promonkey.com"
  },
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

---

### GET `/api/projects`
**Auth:** Admin / Employee (needs Projects read permission) / Client (sees own only)  
**Query Params (optional):**
```
status    string   not_started | in_progress | completed | on_hold | cancelled
priority  string   low | medium | high | critical
client    ObjectId filter by client (admin/employee only)
```

**Response `200`:** Array of project objects (same shape as above)

---

### GET `/api/projects/:id`
**Auth:** Admin / Employee (Projects read) / Client (own project only)

**Response `200`:** Single project object (same shape as POST response)

**Response `404`:**
```json
{ "message": "Project not found" }
```

---

### PUT `/api/projects/:id`
**Auth:** Admin only  
**Content-Type:** `multipart/form-data`

**Request Body** (all optional — send only what you want to update):
```
name             string
client           ObjectId
startDate        date
estimatedEndDate date
actualEndDate    date
status           string   not_started | in_progress | completed | on_hold | cancelled
priority         string   low | medium | high | critical
description      string
requirementDocs  file[]   new files get appended to existing docs
```

**Response `200`:** Updated project object

---

### DELETE `/api/projects/:id/docs/:docId`
**Auth:** Admin only

Deletes a single requirement document from the project and removes it from Cloudinary.

**Response `200`:**
```json
{ "message": "Document deleted successfully" }
```

---

### DELETE `/api/projects/:id`
**Auth:** Admin only

Deletes the project and all its requirement docs from Cloudinary.

**Response `200`:**
```json
{ "message": "Project deleted successfully" }
```

---

## 2. Phases

Phases belong to a Project. Each phase has assigned employees and tracks estimated vs actual duration.

### POST `/api/phases`
**Auth:** Admin only  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "project": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Discovery & Planning",
  "order": 1,
  "estimatedDuration": 80,
  "estimatedEndDate": "2025-07-15",
  "actualStart": "2025-06-01",
  "status": "in_progress",
  "assignees": [
    "665b2c3d4e5f6a7b8c9d0e1f",
    "665b2c3d4e5f6a7b8c9d0e2a"
  ]
}
```

| Field             | Type       | Required | Notes                                      |
|-------------------|------------|----------|--------------------------------------------|
| project           | ObjectId   | Yes      | Project _id                                |
| name              | string     | Yes      |                                            |
| order             | number     | No       | Sort order, default 0                      |
| estimatedDuration | number     | No       | In hours, default 0                        |
| estimatedEndDate  | date       | No       |                                            |
| actualStart       | date       | No       |                                            |
| status            | string     | No       | not_started \| in_progress \| completed \| on_hold |
| assignees         | ObjectId[] | No       | Array of Employee _ids                     |

**Response `201`:**
```json
{
  "_id": "665c3d4e5f6a7b8c9d0e1f2a",
  "project": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Discovery & Planning",
  "order": 1,
  "estimatedDuration": 80,
  "estimatedEndDate": "2025-07-15T00:00:00.000Z",
  "actualStart": "2025-06-01T00:00:00.000Z",
  "actualEnd": null,
  "status": "in_progress",
  "assignees": [
    {
      "_id": "665b2c3d4e5f6a7b8c9d0e1f",
      "employeeId": "EMP001",
      "department": "Design",
      "status": "Active",
      "role": {
        "_id": "662a1b2c3d4e5f6a7b8c9d0e",
        "name": "UI Designer"
      },
      "user": {
        "_id": "661e1a2b3c4d5e6f7a8b9c0e",
        "name": "Priya Mehta",
        "email": "priya@promonkey.com",
        "profileImage": { "url": "https://res.cloudinary.com/demo/image/upload/v1/promonkey/employees/priya.jpg", "publicId": "promonkey/employees/priya" }
      }
    }
  ],
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

---

### GET `/api/phases`
**Auth:** Admin / Employee (Projects read)  
**Query Params (optional):**
```
project   ObjectId   filter phases by project id
```

**Example:** `GET /api/phases?project=664a1b2c3d4e5f6a7b8c9d0e`

**Response `200`:** Array of phase objects sorted by `order` asc

---

### GET `/api/phases/:id`
**Auth:** Admin / Employee (Projects read)

**Response `200`:** Single phase object (same shape as POST response)

---

### PUT `/api/phases/:id`
**Auth:** Admin only  
**Content-Type:** `application/json`

**Request Body** (all optional):
```json
{
  "name": "Discovery & Planning",
  "order": 1,
  "estimatedDuration": 100,
  "estimatedEndDate": "2025-07-20",
  "actualStart": "2025-06-01",
  "actualEnd": "2025-07-18",
  "status": "completed",
  "assignees": ["665b2c3d4e5f6a7b8c9d0e1f"]
}
```

**Response `200`:** Updated phase object

---

### DELETE `/api/phases/:id`
**Auth:** Admin only

**Response `200`:**
```json
{ "message": "Phase deleted successfully" }
```

---

## 3. Tasks

Tasks belong to a Phase (and inherit the project ref automatically). Each task is assigned to one employee and has optional checklist steps.

### POST `/api/tasks`
**Auth:** Admin only  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "phase": "665c3d4e5f6a7b8c9d0e1f2a",
  "name": "Create wireframes",
  "description": "Design low-fidelity wireframes for all pages",
  "assignedTo": "665b2c3d4e5f6a7b8c9d0e1f",
  "estimatedHours": 16,
  "dueDate": "2025-06-20",
  "status": "not_started",
  "steps": [
    { "title": "Homepage wireframe" },
    { "title": "Dashboard wireframe" },
    { "title": "Mobile responsive layout" }
  ]
}
```

| Field          | Type       | Required | Notes                                      |
|----------------|------------|----------|--------------------------------------------|
| phase          | ObjectId   | Yes      | Phase _id                                  |
| name           | string     | Yes      |                                            |
| description    | string     | No       |                                            |
| assignedTo     | ObjectId   | No       | Employee _id                               |
| estimatedHours | number     | No       | Default 0                                  |
| dueDate        | date       | No       |                                            |
| status         | string     | No       | not_started \| in_progress \| completed \| on_hold |
| steps          | object[]   | No       | `[{ "title": "string" }]`                  |

**Response `201`:**
```json
{
  "_id": "666d4e5f6a7b8c9d0e1f2a3b",
  "phase": {
    "_id": "665c3d4e5f6a7b8c9d0e1f2a",
    "name": "Discovery & Planning",
    "status": "in_progress"
  },
  "project": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Website Redesign"
  },
  "name": "Create wireframes",
  "description": "Design low-fidelity wireframes for all pages",
  "assignedTo": {
    "_id": "665b2c3d4e5f6a7b8c9d0e1f",
    "employeeId": "EMP001",
    "department": "Design",
    "status": "Active",
    "role": {
      "_id": "662a1b2c3d4e5f6a7b8c9d0e",
      "name": "UI Designer"
    },
    "user": {
      "_id": "661e1a2b3c4d5e6f7a8b9c0e",
      "name": "Priya Mehta",
      "email": "priya@promonkey.com",
      "profileImage": { "url": "https://res.cloudinary.com/demo/image/upload/v1/promonkey/employees/priya.jpg", "publicId": "promonkey/employees/priya" }
    }
  },
  "estimatedHours": 16,
  "actualHoursLogged": 0,
  "dueDate": "2025-06-20T00:00:00.000Z",
  "status": "not_started",
  "steps": [
    { "_id": "666d4e5f6a7b8c9d0e1f2a3c", "title": "Homepage wireframe", "isCompleted": false },
    { "_id": "666d4e5f6a7b8c9d0e1f2a3d", "title": "Dashboard wireframe", "isCompleted": false },
    { "_id": "666d4e5f6a7b8c9d0e1f2a3e", "title": "Mobile responsive layout", "isCompleted": false }
  ],
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

---

### GET `/api/tasks`
**Auth:** Admin / Employee (Projects read)  
**Query Params (optional):**
```
phase       ObjectId   filter by phase
project     ObjectId   filter by project
assignedTo  ObjectId   filter by employee
status      string     not_started | in_progress | completed | on_hold
```

**Examples:**
```
GET /api/tasks?phase=665c3d4e5f6a7b8c9d0e1f2a
GET /api/tasks?project=664a1b2c3d4e5f6a7b8c9d0e
GET /api/tasks?assignedTo=665b2c3d4e5f6a7b8c9d0e1f
GET /api/tasks?status=in_progress
```

**Response `200`:** Array of task objects sorted by `createdAt` asc

---

### GET `/api/tasks/:id`
**Auth:** Admin / Employee (Projects read)

**Response `200`:** Single task object (same shape as POST response)

---

### PUT `/api/tasks/:id`
**Auth:** Admin only  
**Content-Type:** `application/json`

**Request Body** (all optional):
```json
{
  "name": "Create wireframes",
  "description": "Updated description",
  "assignedTo": "665b2c3d4e5f6a7b8c9d0e2a",
  "estimatedHours": 20,
  "dueDate": "2025-06-25",
  "status": "in_progress",
  "steps": [
    { "_id": "666d4e5f6a7b8c9d0e1f2a3c", "title": "Homepage wireframe", "isCompleted": true },
    { "_id": "666d4e5f6a7b8c9d0e1f2a3d", "title": "Dashboard wireframe", "isCompleted": false }
  ]
}
```

**Response `200`:** Updated task object

---

### PATCH `/api/tasks/:id/steps/:stepId`
**Auth:** Any authenticated user

Toggles a single step's `isCompleted` between `true` and `false`.

**No request body needed.**

**Response `200`:** Full task object with updated step

---

### DELETE `/api/tasks/:id`
**Auth:** Admin only

**Response `200`:**
```json
{ "message": "Task deleted successfully" }
```

---

## 4. Time Entries

Employees log hours against a task. `actualHoursLogged` on the task auto-updates on every log/delete.

### POST `/api/time-entries`
**Auth:** Any authenticated user (employee logs their own time — pulled from JWT)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "taskId": "666d4e5f6a7b8c9d0e1f2a3b",
  "hoursLogged": 4.5,
  "date": "2025-06-10",
  "note": "Completed homepage wireframe draft"
}
```

| Field       | Type     | Required | Notes                          |
|-------------|----------|----------|--------------------------------|
| taskId      | ObjectId | Yes      | Task _id                       |
| hoursLogged | number   | Yes      | Min 0.1                        |
| date        | date     | No       | Defaults to today              |
| note        | string   | No       |                                |

**Response `201`:**
```json
{
  "_id": "667e5f6a7b8c9d0e1f2a3b4c",
  "task": {
    "_id": "666d4e5f6a7b8c9d0e1f2a3b",
    "name": "Create wireframes",
    "status": "in_progress"
  },
  "phase": {
    "_id": "665c3d4e5f6a7b8c9d0e1f2a",
    "name": "Discovery & Planning"
  },
  "project": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Website Redesign"
  },
  "employee": {
    "_id": "665b2c3d4e5f6a7b8c9d0e1f",
    "employeeId": "EMP001",
    "department": "Design",
    "role": {
      "_id": "662a1b2c3d4e5f6a7b8c9d0e",
      "name": "UI Designer"
    },
    "user": {
      "_id": "661e1a2b3c4d5e6f7a8b9c0e",
      "name": "Priya Mehta",
      "email": "priya@promonkey.com",
      "profileImage": { "url": "https://res.cloudinary.com/demo/image/upload/v1/promonkey/employees/priya.jpg", "publicId": "promonkey/employees/priya" }
    }
  },
  "hoursLogged": 4.5,
  "date": "2025-06-10T00:00:00.000Z",
  "note": "Completed homepage wireframe draft",
  "createdAt": "2025-06-10T09:30:00.000Z",
  "updatedAt": "2025-06-10T09:30:00.000Z"
}
```

> After this call, `task.actualHoursLogged` is automatically updated to the new total.

---

### GET `/api/time-entries`
**Auth:** Any authenticated user  
**Query Params (optional):**
```
task      ObjectId   filter by task
phase     ObjectId   filter by phase
project   ObjectId   filter by project
employee  ObjectId   filter by employee
```

**Examples:**
```
GET /api/time-entries?task=666d4e5f6a7b8c9d0e1f2a3b
GET /api/time-entries?project=664a1b2c3d4e5f6a7b8c9d0e
GET /api/time-entries?employee=665b2c3d4e5f6a7b8c9d0e1f
```

**Response `200`:** Array of time entry objects sorted by `date` desc

---

### DELETE `/api/time-entries/:id`
**Auth:** Any authenticated user

Deletes the entry and recalculates `actualHoursLogged` on the linked task.

**Response `200`:**
```json
{ "message": "Time entry deleted successfully" }
```

---

## 5. Stats

### GET `/api/stats/project/:projectId`
**Auth:** Admin / Employee (Projects read)

Returns full stats for a project — each phase's estimated vs actual hours, delay flags, at-risk flags, and working days breakdown.

**Response `200`:**
```json
{
  "project": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Website Redesign",
    "client": {
      "_id": "663f1a2b3c4d5e6f7a8b9c0d",
      "clientName": "Rahul Sharma",
      "companyName": "TechCorp Pvt Ltd"
    },
    "status": "in_progress",
    "priority": "high",
    "startDate": "2025-06-01T00:00:00.000Z",
    "estimatedEndDate": "2025-12-31T00:00:00.000Z",
    "actualEndDate": null
  },
  "summary": {
    "totalPhases": 3,
    "completedPhases": 1,
    "delayedPhases": 1,
    "atRiskPhases": 1,
    "projectAtRisk": true,
    "totalEstimatedHours": 320,
    "totalActualHours": 145,
    "hoursOverrun": 0,
    "workingDaysElapsed": 20,
    "totalEstimatedDays": 152,
    "daysRemaining": 132
  },
  "phases": [
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f2a",
      "name": "Discovery & Planning",
      "order": 1,
      "status": "completed",
      "estimatedDuration": 80,
      "actualHoursLogged": 95,
      "hoursOverrun": 15,
      "isDelayed": true,
      "isAtRisk": false,
      "estimatedEndDate": "2025-07-15T00:00:00.000Z",
      "actualStart": "2025-06-01T00:00:00.000Z",
      "actualEnd": "2025-07-18T00:00:00.000Z",
      "taskSummary": {
        "total": 5,
        "completed": 5,
        "inProgress": 0,
        "notStarted": 0
      }
    },
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f3b",
      "name": "Design",
      "order": 2,
      "status": "in_progress",
      "estimatedDuration": 120,
      "actualHoursLogged": 50,
      "hoursOverrun": 0,
      "isDelayed": false,
      "isAtRisk": true,
      "estimatedEndDate": "2025-08-30T00:00:00.000Z",
      "actualStart": "2025-07-19T00:00:00.000Z",
      "actualEnd": null,
      "taskSummary": {
        "total": 8,
        "completed": 3,
        "inProgress": 2,
        "notStarted": 3
      }
    },
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f4c",
      "name": "Development",
      "order": 3,
      "status": "not_started",
      "estimatedDuration": 120,
      "actualHoursLogged": 0,
      "hoursOverrun": 0,
      "isDelayed": false,
      "isAtRisk": false,
      "estimatedEndDate": "2025-11-30T00:00:00.000Z",
      "actualStart": null,
      "actualEnd": null,
      "taskSummary": {
        "total": 12,
        "completed": 0,
        "inProgress": 0,
        "notStarted": 12
      }
    }
  ]
}
```

**Logic explained:**
- `isDelayed` → `actualHoursLogged > estimatedDuration`
- `isAtRisk` → today is past `estimatedEndDate` and phase is not completed
- `projectAtRisk` → true if any phase is delayed or at risk
- `workingDaysElapsed` → Mon–Fri days from project `startDate` to today
- `daysRemaining` → `totalEstimatedDays - workingDaysElapsed`

---

### GET `/api/stats/employee/:employeeId`
**Auth:** Any authenticated user

Returns total hours logged by an employee, broken down by project.

**Response `200`:**
```json
{
  "totalHours": 145.5,
  "projects": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "projectName": "Website Redesign",
      "totalHours": 95,
      "taskCount": 4
    },
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d1f",
      "projectName": "Mobile App",
      "totalHours": 50.5,
      "taskCount": 3
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error shapes:

| Status | When |
|--------|------|
| 400    | Missing required fields or invalid data |
| 401    | No token or invalid token |
| 403    | Insufficient role or permission |
| 404    | Resource not found |
| 500    | Server error |

```json
{ "message": "Descriptive error message here" }
```

---

## Data Hierarchy

```
Project
  └── Phase (separate collection, linked via project ref)
        └── Task (linked via phase + project ref)
              └── TimeEntry (linked via task + phase + project + employee ref)
```

- One project → many phases
- One phase → many tasks, many assignees (employees)
- One task → one assignedTo (employee), many time entries
- One time entry → one employee, one task
