# Comprehensive Frontend UI & Navigation Survey Report

**Project**: Hospital Management System — Staff Management & Auto-Provisioning  
**Author**: Survey Explorer 2 (Frontend Specialist)  
**Date**: 2026-08-12  
**Target Requirement Focus**: R2 (Centralized Staff UI) & Overall Frontend Architecture  

---

## 1. Executive Summary

This report provides an in-depth analysis of the Hospital Management System (HMS) frontend architecture, component layout, navigation system, authentication mechanism, API integration, and styling framework. Furthermore, it outlines the precise architectural changes, file additions, and code modifications required to implement **Requirement R2 (Centralized Staff UI)**.

---

## 2. Frontend Tech Stack & Architecture

### 2.1 Technology Stack
- **Architecture**: Single Page Application (SPA) driven by Vanilla JavaScript (ES6+), HTML5, and CSS3.
- **Server Integration**: Express.js static file middleware (`app.use(express.static(path.join(__dirname, '..', 'frontend')))` in `backend/server.js`) serving the frontend directly at `http://localhost:5000/`.
- **Icon Library**: Lucide Icons loaded via CDN (`<script src="https://unpkg.com/lucide@latest"></script>`), initialized dynamically via `lucide.createIcons()`.
- **Typography**: Inter font loaded from Google Fonts (`family=Inter:wght@400;500;600;700;800`).
- **Styling**: Custom CSS (`frontend/css/style.css`) using modern CSS custom properties (variables), Flexbox, CSS Grid, custom modals, responsive tables, badge systems, and toast notifications. No third-party UI framework (like Bootstrap/Tailwind) is used; all component styles are custom-crafted.

### 2.2 Frontend Directory & File Map
All frontend assets reside in `d:\Hospital MYSQL Databse\frontend`:

```
frontend/
├── index.html          # Main HTML SPA shell: Auth screen, Sidebar, Topbar, Page sections, Modals, Script tags
├── css/
│   └── style.css       # Global styles, layout system, CSS variables, components (cards, tables, forms, modals)
└── js/
    ├── api.js          # Centralized HTTP client (fetch wrapper, token management, error handling)
    ├── auth.js         # Auth manager (login, logout, session init, view toggles)
    ├── app.js          # Application shell, routing, active states, role navigation & permission flags
    ├── utils.js        # Helper functions (Toast, Fmt, DOM helpers, Modal, serializeForm, pagination)
    ├── dashboard.js    # Dashboard analytics and stats renderer
    ├── patients.js     # Patient management CRUD logic
    ├── doctors.js      # Doctor management CRUD & schedule logic
    ├── appointments.js # Appointment booking & management logic
    ├── billing.js      # Billing & payment processing logic
    ├── pharmacy.js     # Pharmacy catalog, inventory, and locations logic
    ├── laboratory.js   # Lab order & result recording logic
    ├── reports.js      # Analytics reports loader
    └── notifications.js# System notification panel logic
```

---

## 3. Navigation & App Shell Analysis

### 3.1 Layout Structure (`frontend/index.html`)
The application uses a 2-screen architecture:
1. **Auth Screen (`#auth-screen`)**: Card-based login form shown when unauthenticated (`localStorage.getItem('hms_token')` is null or invalid).
2. **App Shell (`#app`)**: Flexbox container containing:
   - `<aside class="sidebar">` (Fixed left navigation sidebar, 240px wide).
   - `<div class="main">` (Right content area with sticky `<header class="topbar">` and scrollable `<main class="content">`).

### 3.2 Sidebar Navigation Structure
The sidebar contains grouped navigation items (`<a class="nav-item" data-page="<page_id>">`):
- **Main Section**:
  - `Dashboard` (`data-page="dashboard"`) — Lucide icon `layout-dashboard`
- **Clinical Section**:
  - `Patients` (`data-page="patients"`) — Lucide icon `users`
  - `Doctors` (`data-page="doctors"`) — Lucide icon `stethoscope`
  - `Appointments` (`data-page="appointments"`) — Lucide icon `calendar`
- **Operations Section**:
  - `Billing` (`data-page="billing"`) — Lucide icon `circle-dollar-sign`
  - `Pharmacy` (`data-page="pharmacy"`) — Lucide icon `pill`
  - `Laboratory` (`data-page="laboratory"`) — Lucide icon `microscope`
- **Analytics Section**:
  - `Reports` (`data-page="reports"`) — Lucide icon `trending-up`
- **Sidebar Footer**:
  - User Initials Avatar (`#user-avatar`)
  - User Full Name (`#user-name`)
  - User Role (`#user-role`)
  - Logout Button (`#logout-btn`)

### 3.3 Role-Based Access Control (RBAC) & Visibility Logic (`js/app.js`)
Roles defined in `app.js`:
- `Hospital_Admin` (Administrator)
- `Doctor` (Doctor)
- `Receptionist` (Receptionist)
- `Lab_Technician` (Lab Technician)
- `Pharmacist` (Pharmacist)
- `Accountant` (Accountant)

When a user logs in or resumes a session, `App.applyRoleNav(user.role)` executes:
1. **Page Access Map (`pageAccess`)**: Evaluates boolean permissions per page (e.g. `doctors: isAdmin || isReceptionist || isDoctor`). Unaccessible `.nav-item[data-page]` elements are hidden with `display: 'none'`.
2. **Global Permission Flags (`window.CAN`)**: Exposes coarse and fine-grained permissions accessible anywhere in the client:
   ```js
   window.CAN = {
     addPatient: isAdmin || isReceptionist,
     addDoctor: isAdmin,
     editDoctor: isAdmin || isDoctor,
     deleteDoctor: isAdmin,
     bookAppointment: isAdmin || isReceptionist,
     generateBill: isAdmin || isAccountant,
     processPayment: isAdmin || isAccountant,
     addMedicine: isAdmin || isPharmacist,
     createLabOrder: isAdmin || isDoctor,
     addLabResult: isAdmin || isLabTech,
     isAdmin: isAdmin
   };
   ```
3. **UI Visibility Function (`applyRoleUI()`)**: Toggles action button visibility (e.g., `+ Add Doctor`, `+ New Patient`) based on `canDo(action)`.

### 3.4 Page Routing & View Switcher
- Switching pages is driven by `App.navigate(page, skipPushState)`:
  1. Updates URL path using `window.history.pushState({ page }, '', '/' + page)`.
  2. Updates `.nav-item.active` highlight in sidebar.
  3. Toggles `.page-section.active` in `<main class="content">`.
  4. Updates `#page-title` in topbar.
  5. Triggers page loader function (e.g., `Doctors.load()`).
  6. Re-initializes icons via `lucide.createIcons()`.

---

## 4. API Client & Authentication Mechanism

### 4.1 HTTP Client (`frontend/js/api.js`)
- **Base Endpoint**: `/api`
- **Token Management**:
  - `Api.token = localStorage.getItem('hms_token') || null`
  - `Api.setToken(t)` syncs `Api.token` with `localStorage.setItem('hms_token', t)` or `localStorage.removeItem('hms_token')`.
- **Request Wrapper (`Api.request(method, path, body)`)**:
  - Automatically attaches `Content-Type: application/json`.
  - Automatically attaches `Authorization: Bearer <token>` if token exists.
  - Catches network/offline errors and invokes `Toast.error(...)`.
  - Catches HTTP `401 Unauthorized`: automatically clears token (`Api.setToken(null)`) and redirects to login (`Auth.showLogin()`).
- **HTTP Methods**: `Api.get`, `Api.post`, `Api.put`, `Api.delete`, `Api.getQ(path, params)`.

### 4.2 Auth Session Flow (`frontend/js/auth.js`)
1. **Boot**: `Auth.init()` checks for stored token in `localStorage`.
   - If missing: calls `Auth.showLogin()`.
   - If present: sends `GET /api/auth/me`. On success, sets `Auth.user` and calls `Auth.showApp()`.
2. **Login**: Form submission calls `Auth.login(username, password)` -> `POST /api/auth/login`.
   - Receives `{ success: true, token, user }`.
   - Saves token to `localStorage`, sets user, shows app shell.
3. **Logout**: Click handler on `#logout-btn` calls `Auth.logout()` -> clears token and displays login screen.

---

## 5. UI Component & Modal Design Patterns

### 5.1 Page Section Component Pattern
Every view section follows a consistent DOM pattern:
```html
<section id="page-<name>" class="page-section">
  <div class="card">
    <div class="card-header">
      <div>
        <div class="card-title"><Title></div>
        <div class="card-subtitle" id="<name>-count"></div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <!-- Search input and filter selects -->
        <button class="btn btn-primary" id="btn-add-<name>" onclick="<Name>.openAdd()">+ Add <Name></button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr> ... </tr></thead>
        <tbody id="<name>-table">
          <tr><td colspan="..." class="table-empty"><div class="spinner"></div></td></tr>
        </tbody>
      </table>
    </div>
    <div id="<name>-pagination" class="pagination"></div>
  </div>
</section>
```

### 5.2 Modal Dialog Pattern
Modals are structured with class `.modal-overlay.hidden`:
```html
<div id="<name>-modal" class="modal-overlay hidden">
  <div class="modal modal-lg">
    <div class="modal-header">
      <h3 id="<name>-modal-title">Modal Title</h3>
      <button class="close-btn" onclick="Modal.close('<name>-modal')">×</button>
    </div>
    <div class="modal-body">
      <form id="<name>-form">
        <!-- Grid layout: .form-row.col-2 / col-3 containing .form-group -->
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="Modal.close('<name>-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="<Name>.save()">Save</button>
    </div>
  </div>
</div>
```
- Open modal: `Modal.open('<modal-id>')` (removes `hidden` class, locks body scroll).
- Close modal: `Modal.close('<modal-id>')` (adds `hidden` class, restores scroll).
- Serialization: `serializeForm('<form-id>')` extracts inputs into a JavaScript key-value object.
- Reset: `resetForm('<form-id>')` clears form fields.

---

## 6. Detailed Changes Required for Requirement R2 (Centralized Staff UI)

Requirement R2 dictates creating a single unified **"Staff"** (or "Employees") tab in the Admin sidebar that lists ALL hospital staff members (Doctors, Receptionists, Pharmacists, Lab Technicians, Accountants) with full CRUD modal forms and backend auto-provisioning awareness.

Here are the step-by-step implementation changes needed in the frontend:

### Change 1: Admin Sidebar Nav Item (`frontend/index.html`)
In `<nav class="sidebar-nav">`, under the `Operations` section (or a dedicated `Admin` section), insert:
```html
<a class="nav-item" data-page="staff">
  <span class="nav-icon"><i data-lucide="id-card" width="18" height="18"></i></span>Staff & Employees
</a>
```

### Change 2: Page Section HTML (`frontend/index.html`)
Inside `<main class="content">`, add `<section id="page-staff" class="page-section">`:
```html
<!-- ─── STAFF MANAGEMENT ───────────────────────────────────── -->
<section id="page-staff" class="page-section">
  <div class="card">
    <div class="card-header">
      <div>
        <div class="card-title">Staff & Employee Management</div>
        <div class="card-subtitle" id="staff-count">Loading staff…</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input class="form-control" id="staff-search" placeholder=" Search staff…" style="width:200px">
        <select class="form-control" id="staff-role-filter" style="width:170px" onchange="Staff.load(1)">
          <option value="">All Roles</option>
          <option value="Doctor">Doctor</option>
          <option value="Receptionist">Receptionist</option>
          <option value="Pharmacist">Pharmacist</option>
          <option value="Lab_Technician">Lab Technician</option>
          <option value="Accountant">Accountant</option>
        </select>
        <button class="btn btn-primary" id="btn-add-staff" onclick="Staff.openAdd()">+ Add Staff Member</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Staff Member</th>
            <th>Role</th>
            <th>Department</th>
            <th>Contact Info</th>
            <th>Hire / Joined Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="staff-table">
          <tr><td colspan="7" class="table-empty"><div class="spinner"></div></td></tr>
        </tbody>
      </table>
    </div>
    <div id="staff-pagination" class="pagination"></div>
  </div>
</section>
```

### Change 3: Staff Form Modal HTML (`frontend/index.html`)
Inside `<!-- MODALS -->`, add `#staff-modal`:
```html
<!-- Staff / Employee Modal -->
<div id="staff-modal" class="modal-overlay hidden">
  <div class="modal modal-lg">
    <div class="modal-header">
      <h3 id="staff-modal-title">Add Staff Member</h3>
      <button class="close-btn" onclick="Modal.close('staff-modal')">×</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info mb-3" style="padding:10px 14px;font-size:12.5px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:6px">
        <i data-lucide="info" width="16" height="16" style="vertical-align:middle;margin-right:6px"></i>
        <strong>Auto-Provisioning Notice:</strong> Adding a staff member automatically creates an <code>App_User</code> login account (<code>firstname.lastname</code> with default password <code>admin123</code>).
      </div>
      <form id="staff-form">
        <div class="form-row col-3">
          <div class="form-group"><label class="form-label">First Name *</label><input class="form-control" name="first_name" required></div>
          <div class="form-group"><label class="form-label">Last Name *</label><input class="form-control" name="last_name" required></div>
          <div class="form-group"><label class="form-label">Gender *</label>
            <select class="form-control" name="gender" required>
              <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>
        <div class="form-row col-3">
          <div class="form-group"><label class="form-label">Role / Position *</label>
            <select class="form-control" name="role" id="staff-role-select" required onchange="Staff.onRoleChange()">
              <option value="">Select Role</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Pharmacist">Pharmacist</option>
              <option value="Lab_Technician">Lab Technician</option>
              <option value="Accountant">Accountant</option>
              <option value="Doctor">Doctor</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Department *</label>
            <select class="form-control" name="dept_id" required><option value="">Select Department</option></select>
          </div>
          <div class="form-group"><label class="form-label">Date of Birth *</label><input class="form-control" name="date_of_birth" type="date" required></div>
        </div>
        <div class="form-row col-2">
          <div class="form-group"><label class="form-label">Phone *</label><input class="form-control" name="phone" required placeholder="07xxxxxxxx"></div>
          <div class="form-group"><label class="form-label">Email *</label><input class="form-control" name="email" type="email" required placeholder="user@hospital.com"></div>
        </div>
        <!-- Doctor-specific Fields Container -->
        <div id="doctor-fields-container" style="display:none;background:#f8fafc;padding:12px;border-radius:8px;margin-top:10px;border:1px dashed #cbd5e1">
          <h4 style="font-size:13px;font-weight:700;margin-bottom:10px;color:#475569">Doctor Profile Options</h4>
          <div class="form-row col-3">
            <div class="form-group"><label class="form-label">Specialization *</label><select class="form-control" name="spec_id"><option value="">Select Specialization</option></select></div>
            <div class="form-group"><label class="form-label">License Number *</label><input class="form-control" name="license_number" placeholder="DOC-12345"></div>
            <div class="form-group"><label class="form-label">Experience (Years)</label><input class="form-control" name="experience_years" type="number" min="0" value="0"></div>
          </div>
          <div class="form-row col-2">
            <div class="form-group"><label class="form-label">Consultation Fee</label><input class="form-control" name="consultation_fee" type="number" step="0.01" value="0.00"></div>
            <div class="form-group"><label class="form-label">Qualification</label><input class="form-control" name="qualification" placeholder="e.g. MBBS, MD"></div>
          </div>
        </div>
        <!-- Non-doctor Salary field -->
        <div id="employee-fields-container" class="form-group mt-2">
          <label class="form-label">Salary</label>
          <input class="form-control" name="salary" type="number" step="0.01" min="0" value="0.00">
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="Modal.close('staff-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="Staff.save()">Save Staff Member</button>
    </div>
  </div>
</div>
```

### Change 4: Shell Integration (`frontend/js/app.js` & `frontend/index.html`)
1. In `app.js` -> `pageAccess`:
   ```js
   staff: isAdmin, // Only Admins have access to unified Staff Management
   ```
2. In `app.js` -> `window.CAN`:
   ```js
   addStaff: isAdmin,
   editStaff: isAdmin,
   deleteStaff: isAdmin,
   ```
3. In `app.js` -> `validPages`:
   ```js
   const validPages = ['dashboard', 'patients', 'doctors', 'staff', 'appointments', 'billing', 'pharmacy', 'laboratory', 'reports'];
   ```
4. In `app.js` -> `titles`:
   ```js
   staff: 'Staff & Employee Management',
   ```
5. In `app.js` -> `loaders`:
   ```js
   staff: () => Staff.load(),
   ```
6. In `index.html` -> `applyRoleUI()`:
   ```js
   const btnMap = {
     ...
     'btn-add-staff': 'addStaff',
   };
   ```

### Change 5: New JavaScript File `frontend/js/staff.js`
Create `frontend/js/staff.js` with full CRUD, search, role filtering, pagination, and modal toggling logic:
```js
/**
 * staff.js — Unified Staff & Employee Management
 */
const Staff = {
  page: 1,
  search: '',
  roleFilter: '',
  editId: null,
  editIsDoctor: false,
  departments: [],
  specializations: [],

  async load(page = 1) {
    this.page = page;
    loading('staff-table');
    await this.loadMeta();
    const res = await Api.getQ('/employees', {
      search: this.search,
      role: this.roleFilter,
      page,
      limit: 15
    });
    if (!res.success) { Toast.error(res.message); return; }
    this.render(res);
  },

  async loadMeta() {
    if (!this.departments.length) {
      const [dr, sr] = await Promise.all([
        Api.get('/doctors/meta/departments'),
        Api.get('/doctors/meta/specializations'),
      ]);
      if (dr.success) this.departments = dr.data;
      if (sr.success) this.specializations = sr.data;
    }
  },

  render({ data, total, page, limit = 15 }) {
    if (!data || !data.length) {
      setHTML('staff-table', '<tr><td colspan="7" class="table-empty">No staff members found</td></tr>');
      renderPagination('staff-pagination', { page, total, limit }, `p => Staff.load(p)`);
      $('staff-count').textContent = '0 staff members';
      return;
    }

    const rows = data.map(s => {
      const isDoc = s.Role_Name === 'Doctor' || s.is_doctor;
      const avatarBg = isDoc ? '#7c3aed' : '#2563eb';
      const roleBadgeClass = isDoc ? 'badge-info' : 'badge-success';

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="user-avatar" style="background:${avatarBg};width:34px;height:34px;font-size:12px">
                ${Fmt.initials(s.First_Name + ' ' + s.Last_Name)}
              </div>
              <div>
                <div class="text-bold">${s.First_Name} ${s.Last_Name}</div>
                <div class="text-sm text-gray">User: <code>${s.Username || s.username || '—'}</code></div>
              </div>
            </div>
          </td>
          <td><span class="badge ${roleBadgeClass}">${s.Role_Name || s.Job_Title}</span></td>
          <td>${s.Dept_Name || '—'}</td>
          <td>
            <div>${s.Phone}</div>
            <div class="text-sm text-gray">${s.Email}</div>
          </td>
          <td>${Fmt.date(s.Hire_Date || s.Joined_Date || s.Created_At)}</td>
          <td>${s.Is_Active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}</td>
          <td>
            <div style="display:flex;gap:6px">
              ${canDo('editStaff') ? `<button class="btn btn-ghost btn-sm" onclick="Staff.openEdit(${s.Emp_ID || s.Doctor_ID}, ${isDoc})" title="Edit"><i data-lucide="pencil" width="16" height="16"></i></button>` : ''}
              ${canDo('deleteStaff') ? `<button class="btn btn-ghost btn-sm text-danger" onclick="Staff.delete(${s.Emp_ID || s.Doctor_ID}, ${isDoc})" title="Delete"><i data-lucide="trash-2" width="16" height="16"></i></button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');

    setHTML('staff-table', rows);
    renderPagination('staff-pagination', { page, total, limit }, `p => Staff.load(p)`);
    $('staff-count').textContent = `${total} staff member${total !== 1 ? 's' : ''}`;
  },

  openAdd() {
    this.editId = null;
    this.editIsDoctor = false;
    resetForm('staff-form');
    $('staff-modal-title').textContent = 'Add New Staff Member';
    this.populateFormSelects();
    this.onRoleChange();
    Modal.open('staff-modal');
  },

  onRoleChange() {
    const role = $('staff-role-select').value;
    const isDoc = role === 'Doctor';
    const docContainer = $('doctor-fields-container');
    const empContainer = $('employee-fields-container');
    if (docContainer) docContainer.style.display = isDoc ? 'block' : 'none';
    if (empContainer) empContainer.style.display = isDoc ? 'none' : 'block';
  },

  populateFormSelects() {
    const dSel = $('staff-form')?.querySelector('[name=dept_id]');
    const sSel = $('staff-form')?.querySelector('[name=spec_id]');
    if (dSel) dSel.innerHTML = `<option value="">Select Department</option>` +
      this.departments.map(d => `<option value="${d.Dept_ID}">${d.Dept_Name}</option>`).join('');
    if (sSel) sSel.innerHTML = `<option value="">Select Specialization</option>` +
      this.specializations.map(s => `<option value="${s.Spec_ID}">${s.Spec_Name}</option>`).join('');
  },

  async save() {
    const data = serializeForm('staff-form');
    if (!data.first_name || !data.last_name || !data.role || !data.dept_id || !data.phone || !data.email) {
      Toast.warning('Please fill in all required fields');
      return;
    }
    if (data.role === 'Doctor' && !data.license_number) {
      Toast.warning('License number is required for Doctors');
      return;
    }

    const res = this.editId
      ? await Api.put(`/employees/${this.editId}`, data)
      : await Api.post('/employees', data);

    if (res.success) {
      Toast.success(this.editId ? 'Staff member updated' : 'Staff member added & user account provisioned!');
      Modal.close('staff-modal');
      this.load(this.page);
    } else {
      Toast.error(res.message);
    }
  },

  async delete(id, isDoc) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    const res = await Api.delete(`/employees/${id}`);
    if (res.success) {
      Toast.success('Staff member removed');
      this.load(this.page);
    } else {
      Toast.error(res.message);
    }
  }
};
```

### Change 6: Script Inclusion (`frontend/index.html`)
In `index.html`, right before `<script src="js/app.js"></script>`, add:
```html
<script src="js/staff.js"></script>
```

---

## 7. Verification & Testing Strategy

### 7.1 Manual Verification
1. Open browser to `http://localhost:5000/`.
2. Log in as `admin` (password `admin123`).
3. Verify that **"Staff & Employees"** tab appears in the Admin sidebar.
4. Click "Staff & Employees" tab: check that page title updates to "Staff & Employee Management" and table renders.
5. Click "+ Add Staff Member": verify modal opens with role dropdown containing Receptionist, Pharmacist, Lab Technician, Accountant, and Doctor.
6. Select "Doctor": verify Doctor fields container appears (Specialization, License Number).
7. Select "Receptionist": fill in `first_name="Jane"`, `last_name="Doe"`, `gender="Female"`, `phone="0712345678"`, `email="jane.doe@hospital.com"`, department, DOB, and submit.
8. Verify success toast notification appears and record is listed.
9. Log out. Log in as newly provisioned user `jane.doe` with password `admin123`. Verify login succeeds.

### 7.2 Automated End-to-End Verification
- Update `test_api.ps1` to test `GET /api/employees`, `POST /api/employees`, `DELETE /api/employees`.
- Execute browser automation test script verifying the full end-to-end user creation & login flow.

---

## 8. Summary of File Touches
- `frontend/index.html`: Sidebar link, `#page-staff` section, `#staff-modal`, script tag insertion, `applyRoleUI` additions.
- `frontend/js/app.js`: Navigation routing, `ROLE` configuration, `pageAccess` mapping, `window.CAN` permissions, `titles` and `loaders` registry.
- `frontend/js/staff.js`: New module implementing full Staff management UI controller.
