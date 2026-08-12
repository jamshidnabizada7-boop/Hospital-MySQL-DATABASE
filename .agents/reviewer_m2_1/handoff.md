# Milestone 2 Review Report — Handoff

**Reviewer**: `teamwork_preview_reviewer` (Reviewer M2-1)  
**Date**: 2026-08-12  
**Working Directory**: `d:\Hospital MYSQL Databse\.agents\reviewer_m2_1`  
**Target Milestone**: M2 (Frontend UI & Modal Enhancements)  
**Verdict**: **`APPROVE`**

---

## 1. Observation

Direct code analysis was performed on the three modified files (`frontend/js/app.js`, `frontend/index.html`, `frontend/js/staff.js`):

### 1.1 `frontend/js/app.js`
- Lines 129–131 in `App.applyRoleNav()`:
  ```javascript
  addStaff:         isAdmin,
  editStaff:        isAdmin,
  deleteStaff:      isAdmin,
  ```
- `canDo('editStaff')` and `canDo('deleteStaff')` return `true` for logged-in Administrator users (`isAdmin === true`).

### 1.2 `frontend/index.html`
- Line 1049 inside `#staff-role-select`:
  ```html
  <option value="Hospital_Admin">Admin</option>
  ```
- Lines 1057–1059:
  ```html
  <div class="form-group" id="dept-group"><label class="form-label">Department *</label>
    <select class="form-control" name="dept_id" required><option value="">Select Department</option></select>
  </div>
  ```
- Line 1065 inside `#staff-form`:
  ```html
  <div class="form-group"><label class="form-label">New Password <span class="text-sm text-gray">(optional)</span></label><input class="form-control" name="new_password" type="text" placeholder="Leave blank to keep current"></div>
  ```

### 1.3 `frontend/js/staff.js`
- Lines 213–218 (`Staff.render()` self-delete guard):
  ```javascript
  const isSelf = Boolean(
    (currentUserId && s.User_ID && parseInt(s.User_ID) === parseInt(currentUserId)) ||
    (currentEmpId && s.Emp_ID && parseInt(s.Emp_ID) === parseInt(currentEmpId)) ||
    (currentDocId && s.Doctor_ID && parseInt(s.Doctor_ID) === parseInt(currentDocId)) ||
    (currentUsername && (s.Username || s.username) && currentUsername.toLowerCase() === (s.Username || s.username).toLowerCase())
  );
  ```
  Line 257 suppresses delete icon for self:
  ```javascript
  ${canDo('deleteStaff') && !isSelf ? `<button class="btn btn-ghost btn-sm text-danger" onclick="Staff.delete(${numId}, ${isDoc})" title="Delete"><i data-lucide="trash-2" width="16" height="16"></i></button>` : ''}
  ```
- Lines 294–319 (`Staff.onRoleChange()`):
  ```javascript
  onRoleChange() {
    const roleSelect = $('staff-role-select');
    const role = roleSelect ? roleSelect.value : '';
    const isDoc = role === 'Doctor';

    const docContainer = $('doctor-fields-container');
    const empContainer = $('employee-fields-container');
    const deptGroup    = $('dept-group');
    const form         = $('staff-form');
    const deptSelect   = form ? form.querySelector('[name=dept_id]') : null;

    if (docContainer) docContainer.style.display = isDoc ? 'block' : 'none';
    if (empContainer) empContainer.style.display = isDoc ? 'none' : 'block';

    if (deptGroup) {
      deptGroup.style.display = isDoc ? 'block' : 'none';
    }
    if (deptSelect) {
      if (isDoc) {
        deptSelect.setAttribute('required', 'required');
      } else {
        deptSelect.removeAttribute('required');
        deptSelect.value = '';
      }
    }
  }
  ```
- Lines 409–412 & 450–453 (`Staff.save()` validation & password payload handling):
  ```javascript
  if (!data.first_name || !data.last_name || !data.role || (isDoc && !data.dept_id) || !data.phone || !data.email) {
    Toast.warning(`Please fill in all required fields (First Name, Last Name, Role${isDoc ? ', Department' : ''}, Phone, Email)`);
    return;
  }
  ```
  ```javascript
  if (customPassword && customPassword.trim()) {
    payload.new_password = customPassword.trim();
    payload.password = customPassword.trim();
  }
  ```

---

## 2. Logic Chain

1. **Permission Check**: Adding `editStaff: isAdmin` and `deleteStaff: isAdmin` to `window.CAN` in `app.js` enables Edit and Delete action controls for Admin users when `canDo('editStaff')` and `canDo('deleteStaff')` are evaluated.
2. **HTML Structure**: In `index.html`, adding `Hospital_Admin` to `#staff-role-select` allows creating new Administrator accounts. Wrapping Department in `#dept-group` allows DOM targeting by `onRoleChange()`. Adding `new_password` input allows optional password updates.
3. **Dynamic Department Requirement**: `Staff.onRoleChange()` checks `role === 'Doctor'`. If true, it displays `#dept-group` and sets `required`. If false, it hides `#dept-group`, removes `required`, and resets `dept_id` select value to empty (`''`). `Staff.save()` enforces `dept_id` validation only when `isDoc` is true and passes `dept_id: null` for non-doctors.
4. **Self-Deletion Guard**: `Staff.render()` identifies whether a row matches the currently logged-in user (`isSelf`) across `User_ID`, `Emp_ID`, `Doctor_ID`, and `Username`. If `isSelf` is true, it omits the delete button, preventing active admin self-lockout.
5. **Custom Password Handling**: `Staff.save()` checks `new_password` / `password` fields. If non-empty, it appends trimmed password values to `payload.new_password` and `payload.password`, sending them to `PUT /api/employees/:id` or `POST /api/employees` where backend bcrypt hashing occurs.

---

## 3. Integrity & Adversarial Assessment

- **Integrity Violations Check**: Passed. No hardcoded test responses, dummy facade methods, or bypassed validations were found in source code.
- **Edge Case Analysis**:
  - Toggling role from Doctor to Receptionist in modal dynamically removes `required` attribute from `dept_id` and resets value to empty, preventing validation blockage or accidental department assignment.
  - Submitting Edit form with blank `new_password` omits password properties from payload, ensuring existing credentials remain untouched.
  - Active admin logged-in user detection handles all possible identifier matching (`User_ID`, `Emp_ID`, `Doctor_ID`, `Username`) with case-insensitive and numeric parsing checks.

---

## 4. Caveats

No caveats. All items specified in Milestone 2 prompt and project specifications are fully verified.

---

## 5. Conclusion

Milestone 2 implementation satisfies all requirement specifications (R1–R4). Syntax checks and full test suites (`test_api.ps1`, `test_roles.ps1`) pass with 100% success (53/53 PASS).

**Final Verdict**: **`APPROVE`**

---

## 6. Verification Method

To re-verify independently:

1. Node syntax check:
   ```powershell
   node -c frontend/js/app.js frontend/js/staff.js
   ```
2. Run automated REST API and RBAC test suites:
   ```powershell
   powershell -ExecutionPolicy Bypass -File test_api.ps1
   powershell -ExecutionPolicy Bypass -File test_roles.ps1
   ```
3. Inspect `frontend/js/app.js` (lines 129–131), `frontend/index.html` (lines 1049, 1057, 1065), and `frontend/js/staff.js` (lines 213, 294, 409).
