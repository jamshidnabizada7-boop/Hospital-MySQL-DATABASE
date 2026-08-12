# Forensic Audit Report — Milestone 2 Frontend Code Changes

**Work Product**: `frontend/js/app.js`, `frontend/index.html`, `frontend/js/staff.js`
**Profile**: General Project
**Verdict**: CLEAN

---

## 1. Observation

Direct code examination of `frontend/js/app.js`, `frontend/index.html`, and `frontend/js/staff.js` revealed:

1. **Role Permissions & Global Capabilities (`frontend/js/app.js`)**:
   - Lines 4-11: `ROLE` constant defined for `'Hospital_Admin'`, `'Doctor'`, `'Receptionist'`, `'Lab_Technician'`, `'Pharmacist'`, `'Accountant'`.
   - Lines 118-150: `window.CAN` defines permissions: `addStaff: isAdmin`, `editStaff: isAdmin`, `deleteStaff: isAdmin`.
   - Dynamic page access map at lines 99-109 restricts `staff` page to `isAdmin`.

2. **UI Controls & Modal Markup (`frontend/index.html`)**:
   - Line 1049: `#staff-role-select` includes `<option value="Hospital_Admin">Admin</option>`.
   - Lines 1057-1059: `#dept-group` containing department select `<select class="form-control" name="dept_id" required>`.
   - Line 1065: `<input class="form-control" name="new_password" type="text" placeholder="Leave blank to keep current">` in `#staff-form`.

3. **Staff Controller & Dynamic Behaviors (`frontend/js/staff.js`)**:
   - Lines 202-218: `isSelf` calculation comparing logged-in user (`Auth.user`/`App.user`) against rendered row (`User_ID`, `Emp_ID`, `Doctor_ID`, `Username`).
   - Line 257: Delete button rendering conditionally guarded by `${canDo('deleteStaff') && !isSelf ? ...}` to prevent self-deletion lockouts.
   - Lines 294-319: `Staff.onRoleChange()` dynamically toggles visibility and HTML5 `required` attribute of `#dept-group` based on whether `role === 'Doctor'`. For non-doctor roles, `#dept-group` is hidden and `dept_id` select value is cleared to `""`.
   - Lines 405-497: `Staff.save()` collects custom password from `new_password` or `password` field, includes it in payload when non-empty, and explicitly sets `dept_id: null` for non-doctor roles when making `Api.put` or `Api.post` requests.

4. **Test Suite Verification**:
   - Powershell test suites `test_api.ps1` and `test_roles.ps1` executed cleanly against the running service with 100% success (53 PASS | 0 FAIL).

---

## 2. Logic Chain

1. **Authentic Frontend Logic**: The implementation uses real DOM manipulation, event listeners (`onRoleChange`, `openEdit`, `save`, `delete`), and genuine API integration (`Api.get`, `Api.post`, `Api.put`, `Api.delete`). There are no hardcoded responses, pre-baked PASS strings, or facade functions.
2. **Role Dropdown Option**: Adding `Hospital_Admin` to `#staff-role-select` in `index.html` allows Admins to provision new Administrator accounts. `staff.js` maps this value to backend payloads correctly.
3. **Dynamic Department Field**: `Staff.onRoleChange()` dynamically manages `#dept-group` visibility and required status. `Staff.save()` enforces department requirement for Doctors while sending `dept_id: null` for non-doctors.
4. **Custom Password Field**: Input field `new_password` in `#staff-form` allows optional password updates. `Staff.save()` checks and attaches `new_password` and `password` to backend payload when provided.
5. **Self-Delete Protection**: Comparing active session details with row data in `Staff.render()` and checking `!isSelf` before rendering the delete button ensures an logged-in Admin cannot self-delete from the UI table.

---

## 3. Caveats

- Browser test execution depends on active backend API service running on port 3000 (which was verified active during audit execution).
- No caveats regarding code authenticity or integrity.

---

## 4. Conclusion

Milestone 2 frontend code changes (`frontend/js/app.js`, `frontend/index.html`, `frontend/js/staff.js`) are authentically implemented without facades, hardcoded mocks, or bypasses. All requirements (Role dropdown Admin option, dynamic Department toggling, custom password input, and self-delete UI guard) are verified clean.

**Final Verdict**: `CLEAN`

---

## 5. Verification Method

Independent verification can be executed via command line:

```bash
# 1. Syntax check
node -c frontend/js/app.js frontend/js/staff.js

# 2. Run API test suite
powershell -ExecutionPolicy Bypass -File .\test_api.ps1

# 3. Run RBAC test suite
powershell -ExecutionPolicy Bypass -File .\test_roles.ps1
```
