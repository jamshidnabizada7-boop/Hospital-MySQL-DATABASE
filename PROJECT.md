# Project: Hospital Management System Staff Management & Auto-Provisioning

## Architecture
- **Backend**: Node.js + Express v5.2.1 (`backend/server.js`, CommonJS).
- **Database**: MySQL 8.0 connection pool via `mysql2/promise` (`backend/db.js`).
- **Database Tables**: `App_User` (login credentials, `Role_ID`), `Employee` (staff demographics, `User_ID`, `Dept_ID`), `Role` (system roles 1=Admin, 2=Receptionist, 3=Doctor, 4=Lab_Technician, 5=Pharmacist, 6=Accountant).
- **Frontend**: Vanilla JS (ES6+) Single Page Application served statically by Express (`frontend/`).
- **Authentication**: JWT Bearer token headers (`Authorization: Bearer <token>`), `bcryptjs` password hashing (cost factor 10).
- **Security & Authorization**: Express middleware `authenticate` and `authorize(ROLES.ADMIN)` / `adminOr()`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Backend Employee CRUD API | GET, GET /:id, PUT, DELETE endpoints for `/api/employees` restricted to Admin | M1 | R1 |
| 2 | Backend Auto-Provisioning | POST `/api/employees` running atomic SQL transaction to auto-create `App_User` (`firstname.lastname` / `admin123`) | M1 | R1 |
| 3 | Centralized Staff UI Tab | Admin sidebar "Staff & Employees" tab, table listing all staff (including Doctors) with role badge, search, pagination | M2 | R2 |
| 4 | Staff Modal Form | Dynamic modal form to add staff with role dropdown (Doctor, Receptionist, Pharmacist, Lab Tech, Accountant) and department select | M2 | R2 |
| 5 | Security & API Test Updates | Update `test_roles.ps1` (verifying Admin-only `/api/employees`) and `test_api.ps1` (CRUD + auto-provisioned login) | M3 | Acceptance Criteria |
| 6 | E2E Browser Verification | Browser automation verifying Admin creating Receptionist and logging in as provisioned Receptionist | M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend API & Auto-Provisioning | `backend/routes/employees.js`, `backend/server.js` | none | DONE |
| M2 | Centralized Staff UI | `frontend/js/staff.js`, `frontend/index.html`, `frontend/js/app.js` | M1 | DONE |
| M3 | Security & API Test Suite | `test_roles.ps1`, `test_api.ps1` | M1 | DONE |
| M4 | Final E2E Verification & Acceptance | End-to-end browser test & 100% test pass verification | M1, M2, M3 | DONE |

## Interface Contracts

### Backend API: `POST /api/employees`
- **Request Headers**: `Authorization: Bearer <admin_token>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "first_name": "Jane",
    "last_name": "Doe",
    "gender": "Female",
    "date_of_birth": "1995-03-20",
    "job_title": "Receptionist",
    "phone": "0771234567",
    "email": "jane.doe@hospital.com",
    "dept_id": 1,
    "salary": 25000.00,
    "hire_date": "2026-08-12"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "emp_id": 12,
    "user_id": 15,
    "username": "jane.doe",
    "message": "Employee added successfully and login account provisioned",
    "credentials": {
      "username": "jane.doe",
      "password": "admin123"
    }
  }
  ```

### Backend API: `GET /api/employees`
- **Request Headers**: `Authorization: Bearer <admin_token>`
- **Query Params**: `search`, `role`, `dept_id`, `page` (default 1), `limit` (default 20)
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": [
      {
        "Emp_ID": 12,
        "First_Name": "Jane",
        "Last_Name": "Doe",
        "Job_Title": "Receptionist",
        "Role_Name": "Receptionist",
        "Dept_Name": "Emergency",
        "Phone": "0771234567",
        "Email": "jane.doe@hospital.com",
        "Username": "jane.doe",
        "Is_Active": 1
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
  ```

### Frontend Module Contract: `frontend/js/staff.js`
- `Staff.load(page)`: Fetches `/api/employees` and renders staff table and pagination.
- `Staff.openAdd()`: Opens modal `#staff-modal` with clean inputs and populated selects.
- `Staff.save()`: Serializes form data, validates, and POSTs/PUTs to `/api/employees`.
- `Staff.delete(id)`: Sends DELETE `/api/employees/:id` after confirmation.

## Code Layout
- `backend/routes/employees.js`: New route file for Employee CRUD & auto-provisioning transaction.
- `backend/server.js`: Express server entry point, registering `app.use('/api/employees', ...)`.
- `frontend/index.html`: Admin sidebar nav item, `#page-staff` view container, `#staff-modal` form, script tags.
- `frontend/js/app.js`: Routing dictionary (`validPages`, `titles`, `loaders`, `pageAccess`, `window.CAN`).
- `frontend/js/staff.js`: New UI module handling staff table rendering and form submission.
- `test_roles.ps1`: Role-based access control tests for `/api/employees`.
- `test_api.ps1`: Functional API integration tests for `/api/employees` and auto-provisioned user login.
