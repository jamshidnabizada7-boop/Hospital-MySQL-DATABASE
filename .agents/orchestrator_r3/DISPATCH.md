# Dispatch Instructions — 2026-08-12T17:51:03+05:00

## User Request
Enhance the Staff & Employee Management module to allow Admins to edit, delete, and manually set passwords for all staff members. Additionally, enable the creation of new Administrator accounts and ensure the Department field is exclusively required and visible for Doctors.

### Requirements:
- **R1. Staff Modification & Deletion**: Implement Edit and Delete actions in the Staff & Employee Management table for all staff members (excluding the currently logged-in Admin to prevent accidental lockouts). Ensure backend endpoints (PUT, DELETE on `/api/employees/:id`) properly handle database updates and deletions.
- **R2. Custom Password Management**: In the Edit Staff modal, provide a text input field to type and save a custom new password. If left blank, password remains unchanged. If provided, hash with bcrypt and update in `App_User` table.
- **R3. Admin Role Provisioning**: Add "Admin" or "Hospital_Admin" to the Role dropdown in Add New Staff modal to allow creating Administrator accounts (mapping to correct Role_ID in `App_User`).
- **R4. Role-Specific Fields (Department)**: Modify Add and Edit staff modal logic so Department dropdown is completely hidden and set to null in DB for non-doctor roles. Only visible and required for Doctor role.

### Acceptance Criteria:
UI/Frontend:
- Edit icon opens Edit modal populated with user data.
- New Password text field exists in Edit modal (optional).
- Delete icon prompts confirmation and removes row upon approval.
- Admin is available in Role dropdown.
- Role dropdown change to non-doctor hides Department dropdown instantly; Doctor shows it again.

Backend/Database:
- `PUT /api/employees/:id` updates employee info.
- Optional new password hashed via bcrypt and updated in `App_User`.
- `DELETE /api/employees/:id` deletes employee record and cascaded `App_User` login without FK errors.
- Admin role maps to correct `Role_ID` in `App_User` and allows login as Admin.
