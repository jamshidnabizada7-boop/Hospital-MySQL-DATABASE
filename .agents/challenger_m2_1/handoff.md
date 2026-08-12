# Empirical Challenge Report — Milestone 2 Frontend Implementation

## Verdict
**APPROVE**

---

## 1. Observation

Empirical testing was conducted against the Milestone 2 frontend implementation (`frontend/index.html`, `frontend/js/staff.js`, `frontend/js/app.js`) using a headless JSDOM test suite (`d:\Hospital MYSQL Databse\.agents\challenger_m2_1\test_m2.js`).

### Exact Code & DOM Findings
1. **DOM Elements (`index.html`)**:
   - Element `#dept-group` exists at line 1057 (`<div class="form-group" id="dept-group">`).
   - Element `#staff-role-select` exists at line 1047 (`<select class="form-control" name="role" id="staff-role-select">`).
   - Option `<option value="Hospital_Admin">Admin</option>` exists inside `#staff-role-select` at line 1049.
   - Input `<input class="form-control" name="new_password" type="text" placeholder="Leave blank to keep current">` exists inside `#staff-form` at line 1065.

2. **Role Selection Display Logic (`Staff.onRoleChange()` in `staff.js:294-319`)**:
   - When role is selected as `"Doctor"`:
     - `#doctor-fields-container` display set to `'block'`
     - `#employee-fields-container` display set to `'none'`
     - `#dept-group` display set to `'block'`
     - `dept_id` select attribute `required` set.
   - When role is selected as non-doctor (e.g., `"Receptionist"`, `"Hospital_Admin"`, `"Pharmacist"`):
     - `#doctor-fields-container` display set to `'none'`
     - `#employee-fields-container` display set to `'block'`
     - `#dept-group` display set to `'none'`
     - `dept_id` select attribute `required` removed and `.value` reset to `""`.

3. **Active User Lockout Protection (`Staff.render()` in `staff.js:208-260`)**:
   - `isSelf` detection logic compares `Auth.user` (or `App.user`) `id`/`user_id`, `employeeId`, `doctorId`, and `username` against the current row.
   - When `isSelf` evaluates to `true`:
     - Line 257 evaluates `${canDo('deleteStaff') && !isSelf ? ... : ''}`, suppressing the delete button rendered HTML for the active logged-in admin row.
   - When `isSelf` evaluates to `false`:
     - The delete icon button (`Staff.delete(numId, isDoc)`) is rendered.

4. **Payload Generation (`Staff.save()` in `staff.js:405-497`)**:
   - Non-Doctor payload explicitly sets `dept_id: null`.
   - Custom password (`new_password` or `password`) is included in payload as `new_password` and `password` if non-empty string provided.
   - If `new_password` input is empty string or whitespace, password properties are omitted from the request payload.
   - Doctor payload routes to `POST /doctors` or `PUT /doctors/:id` preserving `dept_id` and requiring `license_number`.

---

## 2. Logic Chain

1. **DOM Elements Verification**:
   - Evaluated `index.html` DOM tree structure. Verified existence of `#dept-group`, `#staff-role-select` containing `Hospital_Admin`, and `input[name=new_password]` inside `#staff-form`. All elements exist and match spec.

2. **Role Selection Handler Verification**:
   - Executed `Staff.onRoleChange()` under Doctor and non-doctor roles in DOM harness. Confirmed dynamic element visibility (`dept-group`, `doctor-fields-container`, `employee-fields-container`) and required attribute toggles execute instantaneously as specified in R4.

3. **Self-Delete Suppression Verification**:
   - Initialized `Auth.user` mock and rendered staff table containing logged-in user and other staff members. Verified active user row HTML excludes delete action button, satisfying R1 lockout prevention requirement.

4. **Payload Generation Verification**:
   - Executed `Staff.save()` for create and edit operations across non-doctor and doctor roles. Confirmed optional custom password mapping and explicit null assignment for `dept_id` on non-doctor roles as required by R2 and R4.

---

## 3. Caveats

- **CSS Visual Layout**: Verification was performed via DOM structure inspection and JS state evaluation in JSDOM. Browser layout rendering (px alignment/CSS computed styles) was verified via element display attribute testing rather than visual pixel comparison.
- **Backend API Integration**: This harness mocks API responses (`Api.post`, `Api.put`, `Api.get`) to verify payload composition; actual backend database integration testing is in Milestone 1/3 scope.

---

## 4. Conclusion

The Milestone 2 frontend implementation (`index.html`, `js/staff.js`, `js/app.js`) fully satisfies all required criteria (R1, R2, R3, R4) specified in the requirements document. All 31 empirical unit and DOM assertions passed with zero failures.

Verdict: **APPROVE**

---

## 5. Verification Method

To independently verify this empirical challenge:

Run the Node/JSDOM test script created in the challenger directory:

```bash
cd "d:\Hospital MYSQL Databse\.agents\challenger_m2_1"
node test_m2.js
```

Expected Output:
```
=== EMPIRICAL TEST SUITE: MILESTONE 2 FRONTEND IMPLEMENTATION ===
...
TOTAL TESTS: 31
PASSED: 31
FAILED: 0

RESULT: APPROVE - All empirical tests passed successfully!
```
