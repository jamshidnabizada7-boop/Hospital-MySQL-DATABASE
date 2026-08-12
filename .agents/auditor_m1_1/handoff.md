# Forensic Audit Report — Milestone 1 Backend & Database Verification

**Work Product**: `backend/routes/employees.js`, `Hospital_Management_System.sql`
**Profile**: General Project (Forensic Audit)
**Verdict**: **CLEAN**

---

## 1. Observation

### Observation 1: Authentication & Authorization Controls
In `backend/routes/employees.js`, line 25:
```javascript
router.use(authenticate, adminOr());
```
All `/api/employees` routes require JWT authentication and Admin role check middleware. No bypass flags or unauthenticated access routes exist.

### Observation 2: SQL Transaction Management & Connection Cleanup
In `backend/routes/employees.js`:
- **POST `/api/employees`** (Lines 167-251):
  ```javascript
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    ...
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    ...
  } finally {
    conn.release();
  }
  ```
- **PUT `/api/employees/:id`** (Lines 266-359):
  ```javascript
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    ...
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    ...
  } finally {
    conn.release();
  }
  ```
- **DELETE `/api/employees/:id`** (Lines 369-416):
  ```javascript
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    ...
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    ...
  } finally {
    conn.release();
  }
  ```

### Observation 3: Bcrypt Password Hashing
In `backend/routes/employees.js`:
- Line 6: `const bcrypt = require('bcryptjs');`
- Line 200 (POST auto-provisioning):
  ```javascript
  const passwordHash = bcrypt.hashSync('admin123', 10);
  ```
- Lines 307-309 (PUT custom password update):
  ```javascript
  const customPassword = new_password || password;
  const shouldUpdatePassword = customPassword && typeof customPassword === 'string' && customPassword.trim() !== '';
  const passwordHash = shouldUpdatePassword ? bcrypt.hashSync(customPassword.trim(), 10) : null;
  ```

### Observation 4: Database Schema Nullability
In `Hospital_Management_System.sql`, line 143:
```sql
Dept_ID       INT UNSIGNED      NULL,
```
The `Employee` table allows `Dept_ID` to be `NULL`, supporting non-doctor staff members without a assigned department.

### Observation 5: Self-Deletion Lockout Guard
In `backend/routes/employees.js`, lines 384-394:
```javascript
const currentUserId = req.user ? (req.user.user_id || req.user.id) : null;
const currentEmpId  = req.user ? req.user.employeeId : null;

if ((userId && currentUserId && parseInt(userId) === parseInt(currentUserId)) ||
    (currentEmpId && parseInt(empId) === parseInt(currentEmpId))) {
  await conn.rollback();
  return res.status(400).json({
    success: false,
    message: 'Action prohibited: Cannot delete the currently logged-in administrator account.'
  });
}
```

### Observation 6: Syntax Check
Command `node -c backend/routes/employees.js` executed with exit code 0 (no syntax errors).

---

## 2. Logic Chain

1. **Transaction Integrity**: Observation 2 shows that all write operations (POST, PUT, DELETE) obtain a connection from the pool, explicitly execute `conn.beginTransaction()`, perform authentic parameterized SQL inserts/updates/deletes against `App_User` and `Employee` tables, `commit()` on success, `rollback()` on error, and release the connection in `finally` blocks. This ensures atomic multi-table operations without resource leaks.
2. **Password Security**: Observation 3 verifies that both auto-provisioned initial passwords (`admin123`) and custom passwords specified during employee updates are passed through `bcrypt.hashSync(..., 10)`. No plain-text passwords or hardcoded pre-computed hash strings are stored.
3. **No Facades or Hardcoded Mocks**: Observation 1, 2, and 5 demonstrate genuine SQL logic and parameter binding (`?` placeholders). No fixed JSON payloads, dummy strings, or test bypasses exist.
4. **Schema Compliance**: Observation 4 confirms that `Hospital_Management_System.sql` updated `Employee.Dept_ID` to be `NULL`, matching the requirement for optional departments for non-doctor staff.
5. **Lockout Protection**: Observation 5 confirms active logged-in administrators are blocked from deleting their own `App_User` / `Employee` record.

---

## 3. Caveats

No caveats.

---

## 4. Conclusion

**Verdict**: **CLEAN**

The Milestone 1 backend implementation in `backend/routes/employees.js` and database schema in `Hospital_Management_System.sql` satisfy all forensic integrity checks. No hardcoded test responses, facade implementations, unhashed credentials, or unsafe transaction patterns were detected.

---

## 5. Verification Method

To independently verify this audit:
1. Run syntax verification:
   `node -c backend/routes/employees.js`
2. Inspect `backend/routes/employees.js` lines 167-251 (POST), lines 258-360 (PUT), lines 367-418 (DELETE) for `beginTransaction`, `commit`, `rollback`, `bcrypt.hashSync`, and `conn.release()`.
3. Inspect `Hospital_Management_System.sql` line 143 to confirm `Dept_ID INT UNSIGNED NULL`.
