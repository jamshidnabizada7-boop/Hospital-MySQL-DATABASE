## 2026-08-12T12:53:51Z
Your working directory is: d:\Hospital MYSQL Databse\.agents\explorer_m1_1
Identity: teamwork_preview_explorer (Explorer M1)

Task: Produce a detailed step-by-step implementation blueprint for Milestone 1 (DB Migration & Backend Core).

Please read:
1. ORIGINAL_REQUEST.md at: d:\Hospital MYSQL Databse\ORIGINAL_REQUEST.md
2. DISPATCH.md at: d:\Hospital MYSQL Databse\.agents\orchestrator_r3\DISPATCH.md
3. PROJECT.md at: d:\Hospital MYSQL Databse\.agents\orchestrator_r3\PROJECT.md
4. Explorer Survey 1 handoff at: d:\Hospital MYSQL Databse\.agents\explorer_survey_1\handoff.md
5. Explorer Survey 3 handoff at: d:\Hospital MYSQL Databse\.agents\explorer_survey_3\handoff.md

Detail the exact code modifications required for:
1. Database Schema ALTER execution and update to `Hospital_Management_System.sql` (`Employee.Dept_ID` -> `INT UNSIGNED NULL`).
2. `backend/routes/employees.js`:
   - `POST /api/employees`: handle `job_title` containing "Admin" or "Hospital_Admin" mapping to `Role_ID = 1`. Allow `dept_id` to be optional/null for non-doctor roles (`Dept_ID = dept_id ? parseInt(dept_id) : null`).
   - `PUT /api/employees/:id`: update employee fields. Handle optional custom password (`new_password` or `password` in body): if non-empty, hash with `bcrypt.hashSync(password, 10)` and update `App_User.Password_Hash`. Handle `dept_id` as nullable for non-doctors.
   - `DELETE /api/employees/:id`: verify target employee is not the currently logged-in admin (`req.user.user_id` or `req.user.id`). If target matches logged-in user, return `400 Bad Request`. Otherwise, delete `Employee` and linked `App_User` transactionally.

Deliverable:
Write a detailed handoff report to `d:\Hospital MYSQL Databse\.agents\explorer_m1_1\handoff.md` with exact code snippets, SQL statements, and verification steps. Update `progress.md` with `Last visited: [timestamp]` header.
