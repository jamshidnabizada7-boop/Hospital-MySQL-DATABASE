# Original User Request

## 2026-08-12T08:31:39Z

# Teamwork Project Prompt

Implement full CRUD UI and backend logic for managing all non-doctor hospital staff (Receptionists, Pharmacists, Lab Technicians, Accountants). When an Admin adds a new staff member, the system must automatically provision an `App_User` account (`firstname.lastname` with password `admin123`) so they can log in instantly with Role-Based Access Control.

Working directory: d:\Hospital MYSQL Databse
Integrity mode: benchmark

## Requirements

### R1. Backend Auto-Provisioning for Employees
Create an `/api/employees` backend route that allows Admins to create, read, update, and delete staff records in the `Employee` table. The POST route must run a SQL transaction to simultaneously generate and insert an `App_User` login (using the appropriate Role_ID).

### R2. Centralized Staff UI
Create a single new "Staff" or "Employees" tab in the Admin sidebar. This page must be a unified interface that lists ALL hospital staff members—including **Doctors**, Receptionists, Pharmacists, Lab Technicians, and Accountants. It should contain a modal form to add a new employee (with a dropdown to select their specific role/job title, including Doctor).

## Acceptance Criteria

### Security & API Verification
- [ ] The `test_roles.ps1` script is updated to include tests for the new `/api/employees` route (proving only Admins can access it).
- [ ] The `test_api.ps1` script is updated to test creating and deleting an employee.
- [ ] Both powershell test scripts run and pass with 100% success.

### UI Verification
- [ ] An autonomous browser agent successfully logs in as `admin`, navigates to the new Staff tab, and creates a new Receptionist.
- [ ] The browser agent successfully logs out and logs back in using the newly created Receptionist's auto-generated credentials, proving the end-to-end flow works.

## 2026-08-12T12:50:17Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Wait for teamwork system to complete task

Enhance the Staff & Employee Management module to allow Admins to edit, delete, and manually set passwords for all staff members. Additionally, enable the creation of new Administrator accounts and ensure the Department field is exclusively required and visible for Doctors.

Working directory: d:\Hospital MYSQL Databse
Integrity mode: development

## Requirements

### R1. Staff Modification & Deletion
Implement Edit and Delete actions in the Staff & Employee Management table for all staff members (excluding the currently logged-in Admin to prevent accidental lockouts). Ensure the backend endpoints (`PUT`, `DELETE` on `/api/employees/:id`) properly handle these database updates and deletions.

### R2. Custom Password Management
In the Edit Staff modal, provide a text input field that allows the Admin to type and save a custom new password for the selected staff member. If left blank, the password should remain unchanged.

### R3. Admin Role Provisioning
Add "Admin" or "Hospital_Admin" to the Role / Position dropdown in the "Add New Staff Member" modal so that the System Admin can create new Administrator accounts.

### R4. Role-Specific Fields (Department)
Modify the "Add New Staff Member" (and Edit) modal logic so that the "Department" dropdown is completely hidden and its value set to `null` in the database when any non-doctor role is selected. It must only be visible and required when the "Doctor" role is chosen.

## Acceptance Criteria

### UI / Frontend
- [ ] Clicking the Edit (pencil) icon opens the Edit modal populated with the user's data.
- [ ] A "New Password" text field exists in the Edit modal (optional to fill out).
- [ ] Clicking the Delete (trash) icon prompts a confirmation and successfully removes the row from the table upon approval.
- [ ] "Admin" is available in the Role dropdown when adding a new staff member.
- [ ] Changing the Role dropdown to "Receptionist", "Admin", etc., instantly hides the Department dropdown. Changing it back to "Doctor" shows it again.

### Backend / Database
- [ ] `PUT /api/employees/:id` successfully updates the employee's information.
- [ ] If a new password is provided in the `PUT` request, it is correctly hashed via bcrypt and updated in the `App_User` table.
- [ ] `DELETE /api/employees/:id` successfully deletes the employee record (and cascaded `App_User` login) without foreign key constraint errors.
- [ ] Creating an "Admin" role successfully maps to the correct `Role_ID` in the `App_User` table and allows that user to log in as an Admin.

