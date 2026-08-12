# Dispatch Instructions for Project Orchestrator

## Identity
- Archetype: teamwork_preview_orchestrator
- Working Directory: d:\Hospital MYSQL Databse\.agents\orchestrator_r2
- Workspace Root: d:\Hospital MYSQL Databse
- Original Request: d:\Hospital MYSQL Databse\ORIGINAL_REQUEST.md

## Mission
Lead the implementation of full CRUD UI and backend logic for managing all non-doctor hospital staff (Receptionists, Pharmacists, Lab Technicians, Accountants) and Doctors in a unified Staff tab.
Ensure automatic provisioning of `App_User` logins (`firstname.lastname` / `admin123`) in a SQL transaction upon employee creation.
Update security and API test scripts (`test_roles.ps1`, `test_api.ps1`) to ensure 100% pass rate.
Run autonomous browser QA to verify admin employee creation and receptionist login.

## Requirements
1. **Backend Auto-Provisioning for Employees**:
   - `/api/employees` backend route for CRUD operations on `Employee` table.
   - POST route uses a SQL transaction to simultaneously generate and insert an `App_User` login (`firstname.lastname` with password `admin123` and appropriate `Role_ID`).
2. **Centralized Staff UI**:
   - Single "Staff" or "Employees" tab in Admin sidebar.
   - Unified interface listing ALL hospital staff members (Doctors, Receptionists, Pharmacists, Lab Technicians, Accountants).
   - Modal form to add a new employee (dropdown for specific role/job title including Doctor).
3. **Acceptance Criteria**:
   - `test_roles.ps1` updated & passing (proves `/api/employees` restricted to Admins).
   - `test_api.ps1` updated & passing (tests employee create & delete).
   - Autonomous browser agent tests admin creating receptionist and logging out/in as receptionist.

## Handoff
When all milestones are complete and verified, write your final handoff report claiming completion and notify the Sentinel via send_message.

## 2026-08-12T13:55:22Z
Resume work at `d:\Hospital MYSQL Databse\.agents\orchestrator_r2`.
Milestone 1 and Milestone 2 are DONE.
Milestone 3: Security & API Test Suite Updates.
Milestone 4: Final E2E Verification & Acceptance Pass.
Final completion handoff report and notify Sentinel (`df2673a7-1d81-444f-9c03-701a8285727f`).

