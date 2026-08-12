# Staff & Employee Management Frontend Survey — Handoff Report

**Agent**: `teamwork_preview_explorer` (Explorer Survey 2)  
**Date**: 2026-08-12  
**Target Module**: Frontend UI (`frontend/index.html`, `frontend/js/staff.js`, `frontend/js/app.js`, `frontend/js/auth.js`, `frontend/js/api.js`, `frontend/js/utils.js`)

---

## 1. Observation

Direct code observations across all frontend assets for the Hospital Management System:

### 1.1 File Structure & Component Mapping
- **`frontend/index.html`**:
  - Staff Page Container (Lines 361–402): Section `<section id="page-staff" class="page-section">`, includes search `#staff-search`, role filter `#staff-role-filter`, add button `#btn-add-staff`, table body `#staff-table`, and pagination `#staff-pagination`.
  - Staff Modal Container (Lines 1024–1090): Modal overlay `#staff-modal`, form `#staff-form`, modal title `#staff-modal-title`, role selector `#staff-role-select`, Doctor-specific section `#doctor-fields-container`, and Employee-specific salary field `#employee-fields-container`.
- **`frontend/js/staff.js`**:
  - Global `Staff` singleton object (Lines 6–472).
  - Main methods: `load()` (lines 18–169), `loadMeta()` (lines 174–186), `render()` (lines 191–256), `populateFormSelects()` (lines 261–275), `onRoleChange()` (lines 280–290), `openAdd()` (lines 295–305), `openEdit()` (lines 310–361), `save()` (lines 366–454), `delete()` (lines 459–471).
- **`frontend/js/app.js`**:
  - Role definitions (Lines 4–11): `ROLE.ADMIN = 'Hospital_Admin'`, `ROLE.DOCTOR = 'Doctor'`, etc.
  - Role nav & permissions helper `App.applyRoleNav()` (Lines 90–153) and global check `canDo(action)` (Lines 214–216).
- **`frontend/js/auth.js`**:
  - Manages logged-in user state (`Auth.user`) fetched from `GET /api/auth/me` (returns `id`, `username`, `name`, `email`, `role`, `doctorId`, `employeeId`).
- **`frontend/js/api.js`**:
  - Centralized HTTP helper methods: `Api.get()`, `Api.post()`, `Api.put()`, `Api.delete()`, `Api.getQ()`.

---

### 1.2 Observation Details by Requirement Area

#### A. Staff Table Action Buttons & Logged-in User Protection
- **Observed Action Rendering** (`frontend/js/staff.js` lines 240–246):
  ```javascript
  <td>
    <div style="display:flex;gap:6px">
      ${canDo('editStaff') ? `<button class="btn btn-ghost btn-sm" onclick="Staff.openEdit(${numId}, ${isDoc})" title="Edit"><i data-lucide="pencil" width="16" height="16"></i></button>` : ''}
      ${canDo('deleteStaff') ? `<button class="btn btn-ghost btn-sm text-danger" onclick="Staff.delete(${numId}, ${isDoc})" title="Delete"><i data-lucide="trash-2" width="16" height="16"></i></button>` : ''}
    </div>
  </td>
  ```
- **Observed Bug in Permissions**:
  In `frontend/js/app.js` (lines 118–146), `window.CAN` sets permissions for patients, doctors, appointments, billing, pharmacy, and lab, but `window.CAN.editStaff` and `window.CAN.deleteStaff` are **NOT defined**. As a result, `canDo('editStaff')` returns `false`, preventing Edit and Delete action icons from displaying.
- **Logged-in User Exclusion**:
  Currently, `Staff.render()` does not compare row user IDs with `Auth.user`. `Auth.user` contains `{ id, username, doctorId, employeeId }`, while the row item `s` contains `{ User_ID, Emp_ID, Doctor_ID, Username }`.

---

#### B. Edit Staff Modal & New Password Field
- **Observed Form Inputs** (`frontend/index.html` lines 1035–1083):
  Inputs currently present: `first_name`, `last_name`, `gender`, `role` (`#staff-role-select`), `dept_id`, `date_of_birth`, `phone`, `email`, `salary`, `spec_id`, `license_number`, `experience_years`, `consultation_fee`, `qualification`.
  **No password input field exists** in `#staff-form`.
- **Observed Modal Population** (`frontend/js/staff.js` lines 310–361):
  `openEdit(id, isDoctor)` resets `#staff-form`, sets `#staff-modal-title` to "Edit Staff Member", calls `Api.get('/employees/' + id)` or `Api.get('/doctors/' + id)`, and assigns form input values.
- **Observed Form Submission** (`frontend/js/staff.js` lines 366–410):
  `save()` serializes `#staff-form` with `serializeForm('staff-form')` and dispatches `Api.put(endpoint, payload)`.

---

#### C. Role Dropdown & Department Dropdown Logic
- **Observed Role Options** (`frontend/index.html` lines 1047–1054):
  ```html
  <select class="form-control" name="role" id="staff-role-select" required onchange="Staff.onRoleChange()">
    <option value="">Select Role</option>
    <option value="Receptionist">Receptionist</option>
    <option value="Pharmacist">Pharmacist</option>
    <option value="Lab_Technician">Lab Technician</option>
    <option value="Accountant">Accountant</option>
    <option value="Doctor">Doctor</option>
  </select>
  ```
  **`Hospital_Admin` / `Admin` is missing** from `#staff-role-select`.
- **Observed Department Dropdown & Dynamic Display** (`frontend/index.html` line 1056; `frontend/js/staff.js` lines 280–290, 369):
  - In `index.html`, `dept_id` is inside a 3-column form row alongside Role and DOB, marked with `required`.
  - In `staff.js` `onRoleChange()`:
    ```javascript
    onRoleChange() {
      const roleSelect = $('staff-role-select');
      const role = roleSelect ? roleSelect.value : '';
      const isDoc = role === 'Doctor';

      const docContainer = $('doctor-fields-container');
      const empContainer = $('employee-fields-container');

      if (docContainer) docContainer.style.display = isDoc ? 'block' : 'none';
      if (empContainer) empContainer.style.display = isDoc ? 'none' : 'block';
    }
    ```
    `onRoleChange()` toggles doctor/employee container divs, but **does not hide or alter the Department dropdown**.
  - In `staff.js` `save()` line 369:
    ```javascript
    if (!data.first_name || !data.last_name || !data.role || !data.dept_id || !data.phone || !data.email) {
      Toast.warning('Please fill in all required fields (First Name, Last Name, Role, Department, Phone, Email)');
      return;
    }
    ```
    Validation unconditionally requires `dept_id` for all staff members, which prevents saving non-doctor staff if Department is hidden or omitted.

---

#### D. Frontend API Call Dispatches
- **`PUT` Request**:
  Dispatched in `Staff.save()` (`frontend/js/staff.js` lines 382–410):
  ```javascript
  const endpoint = this.editIsDoctor ? `/doctors/${this.editId}` : `/employees/${this.editId}`;
  res = await Api.put(endpoint, payload);
  ```
  Wrapper in `frontend/js/api.js` line 46: `put(path, body) { return this.request('PUT', path, body); }`.
- **`DELETE` Request**:
  Dispatched in `Staff.delete()` (`frontend/js/staff.js` lines 459–464):
  ```javascript
  const endpoint = isDoctor ? `/doctors/${id}` : `/employees/${id}`;
  const res = await Api.delete(endpoint);
  ```
  Wrapper in `frontend/js/api.js` line 47: `delete(path) { return this.request('DELETE', path); }`.

---

## 2. Logic Chain

1. **Permission Initialization (`app.js` -> `staff.js`)**:
   - `Staff.render()` uses `canDo('editStaff')` and `canDo('deleteStaff')`.
   - `canDo(action)` looks up `window.CAN[action]`.
   - `App.applyRoleNav()` sets `window.CAN.editPatient`, `window.CAN.editDoctor`, etc., but omits `editStaff` and `deleteStaff`.
   - *Reasoning*: Adding `editStaff: isAdmin, deleteStaff: isAdmin` to `window.CAN` in `App.applyRoleNav()` will immediately enable Edit and Delete buttons for Admins.

2. **Self-Deletion Prevention (`staff.js` -> `auth.js`)**:
   - `Auth.user` holds the logged-in Admin's `id` (`User_ID`), `username`, `employeeId`, or `doctorId`.
   - In `Staff.render()`, comparing `s.User_ID === Auth.user?.id` or `s.Username === Auth.user?.username` identifies self-records.
   - *Reasoning*: Hiding or disabling the delete button when `isSelf` is true guarantees Admins cannot accidentally delete their own account.

3. **Custom Password Entry (`index.html` -> `staff.js` -> `api.js`)**:
   - `PUT /api/employees/:id` accepts an optional `password` field in the request JSON payload.
   - Adding `<input name="password" type="text" class="form-control" placeholder="Leave blank to keep unchanged">` to `#staff-form` allows password entry during Edit.
   - *Reasoning*: Clearing `form.querySelector('[name=password]')` in `openEdit()` and appending `if (data.password) payload.password = data.password` in `save()` handles optional password updates cleanly.

4. **Admin Role Provisioning (`index.html` -> `staff.js`)**:
   - Backend `mapJobTitleToRoleName` in `backend/routes/employees.js` converts role names containing "admin" to `ROLES.ADMIN` (`Hospital_Admin`).
   - Adding `<option value="Hospital_Admin">Admin</option>` to `#staff-role-select` in `index.html` enables admins to select the Admin role.
   - *Reasoning*: Selecting `Hospital_Admin` passes `job_title: 'Hospital_Admin'` to `POST /api/employees`, which resolves `Role_ID = 1` (`Hospital_Admin`).

5. **Conditional Department Field (`index.html` -> `staff.js`)**:
   - Requirement R4 states Department must be visible and required ONLY for Doctors, and set to `null` for non-doctors.
   - Wrapping Department in a dedicated group element `#dept-group` allows `Staff.onRoleChange()` to hide it when `role !== 'Doctor'`.
   - *Reasoning*: Updating `Staff.save()` validation to check `dept_id` only when `data.role === 'Doctor'` and passing `dept_id: isDoc ? data.dept_id : null` ensures non-doctor staff can be created/updated with `Dept_ID = null`.

---

## 3. Caveats

- **Doctor vs Employee Endpoint Distinction**:
  - `staff.js` manages both Doctors and non-doctor Employees. Editing/Deleting doctors uses `/api/doctors/:id`, while non-doctors use `/api/employees/:id`.
  - Backend `PUT /api/employees/:id` handles password hashing for `App_User` if `password` is sent in the body. If password logic is also expected for doctors, verify `PUT /api/doctors/:id` backend route.
- **Backend Admin Role Mapping**:
  - Option values `Hospital_Admin` or `Admin` both map to `ROLES.ADMIN` via `mapJobTitleToRoleName()` in `backend/routes/employees.js`. `Hospital_Admin` matches the exact string in `Role.Role_Name`.

---

## 4. Conclusion

The frontend structure for Staff & Employee Management is clean and well-organized in `frontend/js/staff.js` and `frontend/index.html`. To fully satisfy requirements R1–R4, the implementer needs to apply the following targeted modifications:

1. **`frontend/js/app.js`**: Add `editStaff: isAdmin` and `deleteStaff: isAdmin` to `window.CAN` in `applyRoleNav()`.
2. **`frontend/js/staff.js`**:
   - In `render()`: Check `isSelf` using `Auth.user` and conditionally suppress the delete button.
   - In `onRoleChange()`: Show/hide `#dept-group` based on `role === 'Doctor'`.
   - In `save()`: Update field validation to check `dept_id` only for doctors, set `dept_id: isDoc ? data.dept_id : null`, and pass optional `password` in payload if filled.
3. **`frontend/index.html`**:
   - Add `<option value="Hospital_Admin">Admin</option>` to `#staff-role-select`.
   - Wrap Department dropdown in `#dept-group` to allow explicit show/hide toggling.
   - Add `<input name="password" type="text" class="form-control">` to `#staff-form` for optional password setting.

---

## 5. Verification Method

### 5.1 Static Verification
1. Inspect `frontend/js/app.js` to ensure `window.CAN.editStaff` and `window.CAN.deleteStaff` are set.
2. Inspect `frontend/index.html` to confirm `#staff-role-select` contains the `Hospital_Admin` option and the password input field exists in `#staff-form`.
3. Inspect `frontend/js/staff.js` to verify `onRoleChange()`, `openEdit()`, and `save()` handle `dept_id` hiding/nullification and `password` payload passing.

### 5.2 Browser / E2E Verification
1. Log in as `admin` (`admin` / `admin123`).
2. Navigate to Staff tab. Confirm Edit (pencil) and Delete (trash) icons appear on staff rows.
3. Confirm that the logged-in `admin` row has the Delete icon hidden or disabled.
4. Click "Add Staff Member". Select "Receptionist". Confirm Department dropdown is hidden.
5. Select "Doctor". Confirm Department dropdown appears and is required.
6. Create an "Admin" staff member with Role "Admin". Confirm account auto-provisioning works.
7. Click Edit on an existing staff member. Enter a custom password in "New Password" field and save. Verify successful login with the new password.
8. Click Delete on a test staff member. Confirm confirmation prompt appears and row is removed upon approval.
