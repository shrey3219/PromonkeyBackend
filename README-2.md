# Promonkey — Project Module API Docs

Base URL: `http://localhost:6969/api`

Header (sab protected routes pe):
```
Authorization: Bearer <token>
```

---

## STEP BY STEP FLOW

```
1. Admin Login          → token lo
2. Client _id lo        → GET /api/clients
3. Employee _ids lo     → GET /api/employees
4. Project + Phases     → POST /api/projects  (ek hi call)
5. Tasks create karo    → POST /api/tasks
6. Time log karo        → POST /api/time-entries  (employee)
7. Step toggle karo     → PATCH /api/tasks/:id/steps/:stepId
8. Stats dekho          → GET /api/stats/project/:id
```

---

## 1. ADMIN LOGIN

**POST** `/api/auth/login`

```json
// REQUEST body (application/json)
{
  "email": "admin@promonkey.com",
  "password": "Admin@123"
}

// RESPONSE 200
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "661e1a2b3c4d5e6f7a8b9c0d",
    "name": "Admin User",
    "email": "admin@promonkey.com",
    "role": "admin",
    "profileImage": { "url": "", "publicId": "" }
  }
}
```

---

## 2. EMPLOYEE LOGIN (Mobile)

**POST** `/api/auth/employee-login`

```json
// REQUEST body (application/json)
{
  "email": "priya@promonkey.com",
  "password": "Priya@123"
}

// RESPONSE 200
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "661e1a2b3c4d5e6f7a8b9c0e",
    "name": "Priya Mehta",
    "email": "priya@promonkey.com",
    "phone": "9876543210",
    "role": "employee",
    "profileImage": { "url": "", "publicId": "" }
  },
  "employee": {
    "_id": "665b2c3d4e5f6a7b8c9d0e1f",
    "employeeId": "EMP001",
    "department": "Design",
    "joiningDate": "2024-01-15T00:00:00.000Z",
    "status": "Active",
    "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0e", "name": "UI Designer" },
    "modules": {
      "Projects": ["read"],
      "Tasks": ["read", "update"]
    }
  }
}
```

---

## 3. UPDATE PROFILE (Mobile — Employee apna profile update kare)

**PUT** `/api/auth/update-profile`
`Content-Type: multipart/form-data`

```
// REQUEST form-data
name          string   optional
phone         string   optional
profileImage  file     optional (jpg, png, webp — max 2MB)

// RESPONSE 200
{
  "_id": "661e1a2b3c4d5e6f7a8b9c0e",
  "name": "Priya Mehta",
  "email": "priya@promonkey.com",
  "phone": "9876543210",
  "role": "employee",
  "profileImage": {
    "url": "https://res.cloudinary.com/demo/image/upload/v1/promonkey/employees/priya.jpg",
    "publicId": "promonkey/employees/priya"
  }
}
```

---

## 4. CREATE PROJECT + PHASES (Ek hi call)

**POST** `/api/projects`
`Content-Type: application/json` (bina file ke)
`Content-Type: multipart/form-data` (file ke saath)

```json
// REQUEST body
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

Required: `name, client, startDate, estimatedEndDate`
Optional: `description, priority, status, phases, requirementDocs (file)`

Status values: `not_started | in_progress | completed | on_hold | cancelled`
Priority values: `low | medium | high | critical`

```json
// RESPONSE 201
{
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Website Redesign",
  "description": "Full redesign of TechCorp website",
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
  "progressPercent": 0,
  "totalTasks": 0,
  "completedTasks": 0,
  "requirementDocs": [],
  "createdBy": { "_id": "661e1a2b3c4d5e6f7a8b9c0d", "name": "Admin User", "email": "admin@promonkey.com" },
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
      "progressPercent": 0,
      "taskSummary": { "total": 0, "completed": 0, "inProgress": 0, "notStarted": 0 },
      "assignees": [
        {
          "_id": "665b2c3d4e5f6a7b8c9d0e1f",
          "employeeId": "EMP001",
          "department": "Design",
          "status": "Active",
          "role": { "_id": "662a1b2c3d4e5f6a7b8c9d0e", "name": "UI Designer" },
          "user": { "_id": "661e1a2b3c4d5e6f7a8b9c0e", "name": "Priya Mehta", "email": "priya@promonkey.com", "profileImage": { "url": "", "publicId": "" } }
        }
      ],
      "createdAt": "2025-06-01T10:00:00.000Z"
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
      "progressPercent": 0,
      "taskSummary": { "total": 0, "completed": 0, "inProgress": 0, "notStarted": 0 },
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
      ],
      "createdAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

---

## 5. GET ALL PROJECTS

**GET** `/api/projects`
Query params (optional): `?status=in_progress` `?priority=high` `?client=:id`

```json
// RESPONSE 200 — array of projects (same shape as POST response above)
[
  {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Website Redesign",
    "status": "in_progress",
    "priority": "high",
    "progressPercent": 35,
    "totalTasks": 20,
    "completedTasks": 7,
    "client": { "clientName": "Rahul Sharma", "companyName": "TechCorp Pvt Ltd" },
    "phases": [ ... ]
  }
]
```

---

## 6. GET SINGLE PROJECT

**GET** `/api/projects/:id`

```json
// RESPONSE 200 — same shape as POST response with phases + progress embedded
{
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Website Redesign",
  "progressPercent": 35,
  "totalTasks": 20,
  "completedTasks": 7,
  "phases": [
    {
      "name": "Discovery & Planning",
      "progressPercent": 100,
      "taskSummary": { "total": 5, "completed": 5, "inProgress": 0, "notStarted": 0 }
    }
  ]
}
```

---

## 7. UPDATE PROJECT

**PUT** `/api/projects/:id`
`Content-Type: multipart/form-data` ya `application/json`

```json
// REQUEST body (sab optional — jo update karna ho wohi bhejo)
{
  "name": "Website Redesign v2",
  "description": "Updated description",
  "client": "663f1a2b3c4d5e6f7a8b9c0d",
  "startDate": "2025-06-01",
  "estimatedEndDate": "2026-01-31",
  "actualEndDate": "2025-12-20",
  "status": "in_progress",
  "priority": "critical"
}

// RESPONSE 200 — updated project with phases + progress
```

---

## 8. DELETE PROJECT

**DELETE** `/api/projects/:id`

```json
// RESPONSE 200
{ "message": "Project deleted successfully" }
```

---

## 9. DELETE REQUIREMENT DOC

**DELETE** `/api/projects/:id/docs/:docId`

```json
// RESPONSE 200
{ "message": "Document deleted successfully" }
```

---

## 10. CREATE PHASE (alag se)

**POST** `/api/phases`
`Content-Type: application/json`

```json
// REQUEST body
{
  "project": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Testing",
  "order": 4,
  "estimatedDuration": 60,
  "estimatedEndDate": "2025-12-28",
  "actualStart": "2025-12-16",
  "status": "not_started",
  "assignees": ["665b2c3d4e5f6a7b8c9d0e2a"]
}
```

Required: `project, name`
Optional: `order, estimatedDuration, estimatedEndDate, actualStart, status, assignees`
Status values: `not_started | in_progress | completed | on_hold`

```json
// RESPONSE 201
{
  "_id": "665c3d4e5f6a7b8c9d0e1f5d",
  "project": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Testing",
  "order": 4,
  "estimatedDuration": 60,
  "estimatedEndDate": "2025-12-28T00:00:00.000Z",
  "actualStart": "2025-12-16T00:00:00.000Z",
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
  ],
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

---

## 11. GET ALL PHASES (by project)

**GET** `/api/phases?project=664a1b2c3d4e5f6a7b8c9d0e`

```json
// RESPONSE 200 — array sorted by order
[
  { "_id": "665c3d4e5f6a7b8c9d0e1f2a", "name": "Discovery & Planning", "order": 1, ... },
  { "_id": "665c3d4e5f6a7b8c9d0e1f3b", "name": "Design", "order": 2, ... }
]
```

---

## 12. GET SINGLE PHASE

**GET** `/api/phases/:id`

```json
// RESPONSE 200 — single phase with assignees populated
{
  "_id": "665c3d4e5f6a7b8c9d0e1f2a",
  "name": "Discovery & Planning",
  "order": 1,
  "status": "in_progress",
  "assignees": [ ... ]
}
```

---

## 13. UPDATE PHASE

**PUT** `/api/phases/:id`
`Content-Type: application/json`

```json
// REQUEST body (sab optional)
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

// RESPONSE 200 — updated phase with assignees populated
```

---

## 14. DELETE PHASE

**DELETE** `/api/phases/:id`

```json
// RESPONSE 200
{ "message": "Phase deleted successfully" }
```

---

## 15. CREATE TASK

**POST** `/api/tasks`
`Content-Type: application/json`

```json
// REQUEST body
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

Required: `phase, name`
Optional: `description, assignedTo, estimatedHours, dueDate, status, steps`
Status values: `not_started | in_progress | completed | on_hold`

```json
// RESPONSE 201
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

## 16. GET TASKS

**GET** `/api/tasks`
Query params (optional):

| Param | Example | Use |
|---|---|---|
| phase | `?phase=665c3d...` | Phase ke tasks |
| project | `?project=664a1b...` | Project ke saare tasks |
| assignedTo | `?assignedTo=665b2c...` | Employee ke tasks (Mobile) |
| status | `?status=in_progress` | Status filter |

```json
// RESPONSE 200 — array of task objects (same shape as POST response)
```

---

## 17. GET SINGLE TASK

**GET** `/api/tasks/:id`

```json
// RESPONSE 200 — single task (same shape as POST response)
```

---

## 18. UPDATE TASK

**PUT** `/api/tasks/:id`
`Content-Type: application/json`

```json
// REQUEST body (sab optional)
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

// RESPONSE 200 — updated task (same shape as POST response)
```

---

## 19. TOGGLE STEP (Mobile + CRM dono)

**PATCH** `/api/tasks/:id/steps/:stepId`
No body needed.

```json
// RESPONSE 200
{
  "_id": "666d4e5f6a7b8c9d0e1f2a3b",
  "name": "Create wireframes",
  "status": "in_progress",
  "steps": [
    { "_id": "666d4e5f6a7b8c9d0e1f2a3c", "title": "Homepage wireframe", "isCompleted": true },
    { "_id": "666d4e5f6a7b8c9d0e1f2a3d", "title": "Dashboard wireframe", "isCompleted": false },
    { "_id": "666d4e5f6a7b8c9d0e1f2a3e", "title": "Mobile responsive layout", "isCompleted": false }
  ]
}
```

---

## 20. DELETE TASK

**DELETE** `/api/tasks/:id`

```json
// RESPONSE 200
{ "message": "Task deleted successfully" }
```

---

## 21. LOG TIME (Mobile — Employee)

**POST** `/api/time-entries`
`Content-Type: application/json`
Employee ka _id JWT token se automatically aata hai.

```json
// REQUEST body
{
  "taskId": "666d4e5f6a7b8c9d0e1f2a3b",
  "hoursLogged": 4.5,
  "date": "2025-06-10",
  "note": "Homepage wireframe completed"
}
```

Required: `taskId, hoursLogged`
Optional: `date (default today), note`

```json
// RESPONSE 201
{
  "_id": "667e5f6a7b8c9d0e1f2a3b4c",
  "task": { "_id": "666d4e5f6a7b8c9d0e1f2a3b", "name": "Create wireframes", "status": "in_progress" },
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
  "note": "Homepage wireframe completed",
  "createdAt": "2025-06-10T09:30:00.000Z",
  "updatedAt": "2025-06-10T09:30:00.000Z"
}
```

> Task ka `actualHoursLogged` automatically 4.5 ho gaya.

---

## 22. GET TIME ENTRIES

**GET** `/api/time-entries`
Query params (optional):

| Param | Example | Use |
|---|---|---|
| task | `?task=666d4e...` | Ek task ki entries |
| phase | `?phase=665c3d...` | Phase ki entries |
| project | `?project=664a1b...` | Project ki entries |
| employee | `?employee=665b2c...` | Employee ki entries (Mobile) |

```json
// RESPONSE 200 — array sorted by date desc (same shape as POST response)
```

---

## 23. DELETE TIME ENTRY

**DELETE** `/api/time-entries/:id`

```json
// RESPONSE 200
{ "message": "Time entry deleted successfully" }
```

> Task ka `actualHoursLogged` automatically recalculate ho jaata hai.

---

## 24. PROJECT STATS (CRM — progress bar + at-risk)

**GET** `/api/stats/project/:projectId`

```json
// RESPONSE 200
{
  "project": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "Website Redesign",
    "client": { "clientName": "Rahul Sharma", "companyName": "TechCorp Pvt Ltd" },
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
    "progressPercent": 35,
    "totalTasks": 20,
    "completedTasks": 7,
    "totalEstimatedHours": 400,
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
      "progressPercent": 100,
      "estimatedEndDate": "2025-07-15T00:00:00.000Z",
      "actualStart": "2025-06-01T00:00:00.000Z",
      "actualEnd": "2025-07-18T00:00:00.000Z",
      "taskSummary": { "total": 5, "completed": 5, "inProgress": 0, "notStarted": 0, "progressPercent": 100 }
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
      "progressPercent": 20,
      "estimatedEndDate": "2025-08-30T00:00:00.000Z",
      "actualStart": "2025-07-19T00:00:00.000Z",
      "actualEnd": null,
      "taskSummary": { "total": 10, "completed": 2, "inProgress": 3, "notStarted": 5, "progressPercent": 20 }
    }
  ]
}
```

---

## 25. EMPLOYEE STATS (Mobile)

**GET** `/api/stats/employee/:employeeId`

```json
// RESPONSE 200
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

## ALL APIs SUMMARY

| # | Method | Endpoint | Auth | Who |
|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | None | Admin |
| 2 | POST | `/api/auth/employee-login` | None | Employee |
| 3 | PUT | `/api/auth/update-profile` | Token | Both |
| 4 | POST | `/api/projects` | Admin | CRM |
| 5 | GET | `/api/projects` | Token | CRM + Mobile |
| 6 | GET | `/api/projects/:id` | Token | CRM + Mobile |
| 7 | PUT | `/api/projects/:id` | Admin | CRM |
| 8 | DELETE | `/api/projects/:id` | Admin | CRM |
| 9 | DELETE | `/api/projects/:id/docs/:docId` | Admin | CRM |
| 10 | POST | `/api/phases` | Admin | CRM |
| 11 | GET | `/api/phases?project=:id` | Token | CRM |
| 12 | GET | `/api/phases/:id` | Token | CRM |
| 13 | PUT | `/api/phases/:id` | Admin | CRM |
| 14 | DELETE | `/api/phases/:id` | Admin | CRM |
| 15 | POST | `/api/tasks` | Admin | CRM |
| 16 | GET | `/api/tasks` | Token | CRM + Mobile |
| 17 | GET | `/api/tasks/:id` | Token | CRM + Mobile |
| 18 | PUT | `/api/tasks/:id` | Admin | CRM |
| 19 | PATCH | `/api/tasks/:id/steps/:stepId` | Token | CRM + Mobile |
| 20 | DELETE | `/api/tasks/:id` | Admin | CRM |
| 21 | POST | `/api/time-entries` | Token | Mobile |
| 22 | GET | `/api/time-entries` | Token | CRM + Mobile |
| 23 | DELETE | `/api/time-entries/:id` | Token | Both |
| 24 | GET | `/api/stats/project/:id` | Token | CRM |
| 25 | GET | `/api/stats/employee/:id` | Token | Mobile |

---

## ERROR RESPONSES

```json
{ "message": "Descriptive error message" }
```

| Status | Reason |
|---|---|
| 400 | Required field missing ya invalid data |
| 401 | Token nahi hai ya invalid hai |
| 403 | Permission nahi hai |
| 404 | Resource nahi mila |
| 500 | Server error |
