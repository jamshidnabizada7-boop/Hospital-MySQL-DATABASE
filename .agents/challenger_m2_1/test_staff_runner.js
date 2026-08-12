/**
 * test_staff_runner.js — Empirical test harness for Staff JS module
 */
const fs = require('fs');
const path = require('path');

// Basic DOM Emulation for Node.js
class MockElement {
  constructor(tagName, id = '', className = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = className;
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.innerHTML = '';
    this.value = '';
    this.type = 'text';
    this.classList = {
      _classes: new Set(className ? className.split(' ') : []),
      add: (cls) => this.classList._classes.add(cls),
      remove: (cls) => this.classList._classes.delete(cls),
      contains: (cls) => this.classList._classes.has(cls)
    };
  }

  querySelector(selector) {
    if (selector.startsWith('[name=')) {
      const name = selector.slice(6, -1);
      return this._findChild(el => el.attributes['name'] === name);
    }
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this._findChild(el => el.id === id);
    }
    return this._findChild(el => el.tagName === selector.toUpperCase());
  }

  querySelectorAll(selector) {
    const results = [];
    this._findAllChildren(el => {
      if (selector.startsWith('.')) {
        return el.classList.contains(selector.slice(1));
      }
      return el.tagName === selector.toUpperCase();
    }, results);
    return results;
  }

  _findChild(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const found = child._findChild(predicate);
      if (found) return found;
    }
    return null;
  }

  _findAllChildren(predicate, results) {
    for (const child of this.children) {
      if (predicate(child)) results.push(child);
      child._findAllChildren(predicate, results);
    }
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  reset() {
    this._findAllChildren(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        el.value = '';
      }
    }, []);
  }

  closest(selector) {
    return this;
  }
}

class MockDocument {
  constructor() {
    this.elementsById = new Map();
    this.body = new MockElement('BODY');
  }

  addElement(el) {
    if (el.id) this.elementsById.set(el.id, el);
    return el;
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  querySelectorAll(selector) {
    const results = [];
    for (const el of this.elementsById.values()) {
      if (selector.startsWith('.')) {
        if (el.classList.contains(selector.slice(1))) results.push(el);
      }
    }
    return results;
  }

  addEventListener() {}
}

// Global context setup
const mockDoc = new MockDocument();
global.document = mockDoc;
global.window = { lucide: { createIcons: () => {} } };

global.FormData = class MockFormData {
  constructor(form) {
    this.entries = [];
    if (form && typeof form.querySelectorAll === 'function') {
      const inputs = form.querySelectorAll('INPUT');
      const selects = form.querySelectorAll('SELECT');
      [...inputs, ...selects].forEach(el => {
        const name = el.attributes['name'] || el.name;
        if (name) {
          this.entries.push([name, el.value || '']);
        }
      });
    }
  }
  forEach(cb) {
    this.entries.forEach(([k, v]) => cb(v, k));
  }
};

// Build DOM tree corresponding to index.html staff elements
function buildDomFromIndexHtml() {
  const staffSearch = new MockElement('INPUT', 'staff-search');
  staffSearch.value = '';
  mockDoc.addElement(staffSearch);

  const staffRoleFilter = new MockElement('SELECT', 'staff-role-filter');
  staffRoleFilter.value = '';
  mockDoc.addElement(staffRoleFilter);

  const staffCount = new MockElement('DIV', 'staff-count');
  mockDoc.addElement(staffCount);

  const staffTable = new MockElement('TBODY', 'staff-table');
  mockDoc.addElement(staffTable);

  const staffPagination = new MockElement('DIV', 'staff-pagination');
  mockDoc.addElement(staffPagination);

  const toastContainer = new MockElement('DIV', 'toast-container');
  mockDoc.addElement(toastContainer);

  const staffModal = new MockElement('DIV', 'staff-modal', 'modal-overlay hidden');
  mockDoc.addElement(staffModal);

  const staffModalTitle = new MockElement('H3', 'staff-modal-title');
  mockDoc.addElement(staffModalTitle);

  const staffForm = new MockElement('FORM', 'staff-form');
  mockDoc.addElement(staffForm);
  staffModal.appendChild(staffForm);

  // Form inputs
  const inputs = [
    { name: 'first_name', tag: 'INPUT' },
    { name: 'last_name', tag: 'INPUT' },
    { name: 'gender', tag: 'SELECT' },
    { name: 'role', tag: 'SELECT', id: 'staff-role-select' },
    { name: 'dept_id', tag: 'SELECT' },
    { name: 'date_of_birth', tag: 'INPUT', type: 'date' },
    { name: 'phone', tag: 'INPUT' },
    { name: 'email', tag: 'INPUT', type: 'email' },
    { name: 'salary', tag: 'INPUT', type: 'number' },
    { name: 'spec_id', tag: 'SELECT' },
    { name: 'license_number', tag: 'INPUT' },
    { name: 'experience_years', tag: 'INPUT', type: 'number' },
    { name: 'consultation_fee', tag: 'INPUT', type: 'number' },
    { name: 'qualification', tag: 'INPUT' }
  ];

  inputs.forEach(inp => {
    const el = new MockElement(inp.tag, inp.id || '');
    el.attributes['name'] = inp.name;
    if (inp.type) el.type = inp.type;
    staffForm.appendChild(el);
    if (inp.id) mockDoc.addElement(el);
  });

  const docFieldsContainer = new MockElement('DIV', 'doctor-fields-container');
  docFieldsContainer.style.display = 'none';
  mockDoc.addElement(docFieldsContainer);

  const empFieldsContainer = new MockElement('DIV', 'employee-fields-container');
  empFieldsContainer.style.display = 'block';
  mockDoc.addElement(empFieldsContainer);
}

buildDomFromIndexHtml();

// Load utils.js logic
const utilsCode = fs.readFileSync(path.join(__dirname, '../../frontend/js/utils.js'), 'utf8');
eval(utilsCode + '\nglobal.Toast = Toast;\nglobal.Fmt = Fmt;\nglobal.$ = $;\nglobal.$$ = $$;\nglobal.Modal = Modal;\nglobal.serializeForm = serializeForm;\nglobal.resetForm = resetForm;\nglobal.renderPagination = renderPagination;');

// Mock Api object
const mockApiCalls = [];
global.Api = {
  getCalls: () => mockApiCalls,
  clearCalls: () => { mockApiCalls.length = 0; },
  get: async (path) => {
    mockApiCalls.push({ method: 'GET', path });
    if (path === '/employees/meta/departments') {
      return { success: true, data: [{ Dept_ID: 1, Dept_Name: 'Cardiology' }, { Dept_ID: 2, Dept_Name: 'Emergency' }] };
    }
    if (path === '/doctors/meta/specializations') {
      return { success: true, data: [{ Spec_ID: 1, Spec_Name: 'Cardiologist' }] };
    }
    if (path === '/employees/50') {
      return { success: true, data: { Emp_ID: 50, First_Name: 'Jane', Last_Name: 'Doe', Gender: 'Female', Phone: '0771234567', Email: 'jane@hms.com', Dept_ID: 2, Job_Title: 'Receptionist', Salary: 25000 } };
    }
    if (path === '/doctors/50') {
      return { success: true, data: { Doctor_ID: 50, First_Name: 'Gregory', Last_Name: 'House', Gender: 'Male', Phone: '0779998877', Email: 'house@hms.com', Dept_ID: 1, Spec_ID: 1, License_Number: 'DOC-99', Qualification: 'MD' } };
    }
    return { success: true, data: {} };
  },
  getQ: async (path, params) => {
    mockApiCalls.push({ method: 'GET_Q', path, params });
    if (path === '/doctors') {
      return { success: true, data: [{ Doctor_ID: 1, First_Name: 'Dr. Gregory', Last_Name: 'House', Dept_Name: 'Diagnostics', User_ID: 10 }] };
    }
    if (path === '/employees' && params.role === 'Doctor') {
      return { success: true, data: [{ Emp_ID: 5, First_Name: 'Dr. Gregory', Last_Name: 'House', Role_Name: 'Doctor', User_ID: 10 }] };
    }
    return { success: true, data: [], total: 0, page: 1, limit: 15 };
  },
  post: async (path, body) => {
    mockApiCalls.push({ method: 'POST', path, body });
    return { success: true, credentials: { username: 'jane.doe', password: 'admin123' } };
  },
  put: async (path, body) => {
    mockApiCalls.push({ method: 'PUT', path, body });
    return { success: true };
  },
  delete: async (path) => {
    mockApiCalls.push({ method: 'DELETE', path });
    return { success: true };
  }
};

// Mock Toast tracking
const toasts = [];
global.Toast = {
  warning: (msg) => toasts.push({ type: 'warning', msg }),
  success: (msg) => toasts.push({ type: 'success', msg }),
  error: (msg) => toasts.push({ type: 'error', msg }),
  info: (msg) => toasts.push({ type: 'info', msg }),
  getLogs: () => toasts,
  clear: () => { toasts.length = 0; }
};

// Mock confirm & canDo
global.confirm = () => true;
global.canDo = () => true;

// Load staff.js code and expose global.Staff
const staffCode = fs.readFileSync(path.join(__dirname, '../../frontend/js/staff.js'), 'utf8');
eval(staffCode + '\nglobal.Staff = Staff;');

// RUN TEST SUITE
async function runTests() {
  console.log('==================================================');
  console.log('EMPIRICAL TEST SUITE: Staff JS Module');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // Test 1: Form Validation — missing required fields
  // ----------------------------------------------------
  Toast.clear();
  resetForm('staff-form');
  await Staff.save();
  const warningToast1 = Toast.getLogs().find(t => t.type === 'warning' && t.msg.includes('Please fill in all required fields'));
  assert(
    Boolean(warningToast1),
    'Test 1: Form validation triggers warning toast when required fields are missing',
    `Toasts recorded: ${JSON.stringify(Toast.getLogs())}`
  );

  // ----------------------------------------------------
  // Test 2: Doctor-specific required field — license_number
  // ----------------------------------------------------
  Toast.clear();
  resetForm('staff-form');
  const form = mockDoc.getElementById('staff-form');
  form.querySelector('[name=first_name]').value = 'John';
  form.querySelector('[name=last_name]').value = 'Doctor';
  form.querySelector('[name=gender]').value = 'Male';
  form.querySelector('[name=role]').value = 'Doctor';
  form.querySelector('[name=dept_id]').value = '1';
  form.querySelector('[name=phone]').value = '0770001122';
  form.querySelector('[name=email]').value = 'dr.john@hospital.com';

  await Staff.save();
  const warningToast2 = Toast.getLogs().find(t => t.type === 'warning' && t.msg.includes('License number is required for Doctor'));
  assert(
    Boolean(warningToast2),
    'Test 2: Selecting Doctor without license_number triggers warning toast',
    `Toasts recorded: ${JSON.stringify(Toast.getLogs())}`
  );

  // ----------------------------------------------------
  // Test 3: Dynamic field toggling — Doctor vs Employee containers
  // ----------------------------------------------------
  const roleSelect = mockDoc.getElementById('staff-role-select');
  const docContainer = mockDoc.getElementById('doctor-fields-container');
  const empContainer = mockDoc.getElementById('employee-fields-container');

  // Change role to Doctor
  roleSelect.value = 'Doctor';
  Staff.onRoleChange();
  const isDocVisibleWhenDoctor = docContainer.style.display === 'block' && empContainer.style.display === 'none';

  // Change role to Receptionist
  roleSelect.value = 'Receptionist';
  Staff.onRoleChange();
  const isEmpVisibleWhenReceptionist = docContainer.style.display === 'none' && empContainer.style.display === 'block';

  assert(
    isDocVisibleWhenDoctor && isEmpVisibleWhenReceptionist,
    'Test 3: Changing role dropdown dynamically toggles doctor vs employee fields containers',
    `Doctor role display: doc=${docContainer.style.display}, emp=${empContainer.style.display}`
  );

  // ----------------------------------------------------
  // Test 4: Form reset on modal open (Staff.openAdd())
  // ----------------------------------------------------
  form.querySelector('[name=first_name]').value = 'Temporary';
  form.querySelector('[name=last_name]').value = 'DirtyData';
  Staff.editId = 999;
  Staff.editIsDoctor = true;

  Staff.openAdd();

  const titleEl = mockDoc.getElementById('staff-modal-title');
  const modalEl = mockDoc.getElementById('staff-modal');
  const firstNameAfterReset = form.querySelector('[name=first_name]').value;

  assert(
    Staff.editId === null &&
    Staff.editIsDoctor === false &&
    firstNameAfterReset === '' &&
    titleEl.textContent === 'Add New Staff Member' &&
    !modalEl.classList.contains('hidden'),
    'Test 4: Staff.openAdd() resets form inputs, updates title, and opens modal',
    `editId=${Staff.editId}, firstName='${firstNameAfterReset}', title='${titleEl.textContent}'`
  );

  // ----------------------------------------------------
  // Test 5: Table rendering — empty placeholder, role badges, initials, user credentials
  // ----------------------------------------------------
  // Subtest 5a: Empty table placeholder
  Staff.render({ data: [], total: 0, page: 1, limit: 15 });
  const tableEl = mockDoc.getElementById('staff-table');
  const hasEmptyPlaceholder = tableEl.innerHTML.includes('No staff members found');
  assert(
    hasEmptyPlaceholder,
    'Test 5a: Render empty table placeholder when no records found',
    `HTML: ${tableEl.innerHTML}`
  );

  // Subtest 5b: Role badges, initials, and user credentials
  const mockStaffData = [
    {
      Emp_ID: 101,
      First_Name: 'Alice',
      Last_Name: 'Smith',
      Role_Name: 'Doctor',
      Job_Title: 'Doctor',
      Dept_Name: 'Cardiology',
      Phone: '0771112233',
      Email: 'alice@hospital.com',
      Username: 'alice.smith',
      Hire_Date: '2026-01-15',
      Is_Active: 1,
      is_doctor: true
    },
    {
      Emp_ID: 102,
      First_Name: 'Bob',
      Last_Name: 'Jones',
      Role_Name: 'Receptionist',
      Job_Title: 'Receptionist',
      Dept_Name: 'FrontDesk',
      Phone: '0772223344',
      Email: 'bob@hospital.com',
      Username: 'bob.jones',
      Hire_Date: '2026-02-01',
      Is_Active: 1
    },
    {
      Emp_ID: 103,
      First_Name: 'Carol',
      Last_Name: 'White',
      Role_Name: 'Lab_Technician',
      Job_Title: 'Lab Technician',
      Dept_Name: 'Laboratory',
      Phone: '0773334455',
      Email: 'carol@hospital.com',
      Username: 'carol.white',
      Hire_Date: '2026-03-10',
      Is_Active: 1
    },
    {
      Emp_ID: 104,
      First_Name: 'David',
      Last_Name: 'Brown',
      Role_Name: 'Pharmacist',
      Job_Title: 'Pharmacist',
      Dept_Name: 'Pharmacy',
      Phone: '0774445566',
      Email: 'david@hospital.com',
      Username: 'david.brown',
      Hire_Date: '2026-04-05',
      Is_Active: 1
    }
  ];

  Staff.render({ data: mockStaffData, total: 4, page: 1, limit: 15 });
  const renderHtml = tableEl.innerHTML;

  const hasInitials = renderHtml.includes('AS') && renderHtml.includes('BJ');
  const hasUserCredentials = renderHtml.includes('User: <code>alice.smith</code>') && renderHtml.includes('User: <code>bob.jones</code>');
  const hasDoctorBadge = renderHtml.includes('<span class="badge badge-info">Doctor</span>');
  const hasReceptionistBadge = renderHtml.includes('<span class="badge badge-success">Receptionist</span>');
  const hasLabBadge = renderHtml.includes('<span class="badge badge-warning">Lab_Technician</span>');
  const hasPharmacistBadge = renderHtml.includes('<span class="badge badge-primary">Pharmacist</span>');

  assert(
    hasInitials && hasUserCredentials && hasDoctorBadge && hasReceptionistBadge && hasLabBadge && hasPharmacistBadge,
    'Test 5b: Render correct role badges, initials, and user credentials for staff list',
    `Initials=${hasInitials}, Credentials=${hasUserCredentials}, Badges=${hasDoctorBadge && hasReceptionistBadge && hasLabBadge && hasPharmacistBadge}`
  );

  // ----------------------------------------------------
  // Test 6: Search & Role filtering parameters passed to Api.getQ('/employees', ...)
  // ----------------------------------------------------
  Api.clearCalls();
  const searchInput = mockDoc.getElementById('staff-search');
  const roleFilterSelect = mockDoc.getElementById('staff-role-filter');

  searchInput.value = 'John';
  roleFilterSelect.value = 'Receptionist';

  await Staff.load(1);

  const empCall = Api.getCalls().find(c => c.method === 'GET_Q' && c.path === '/employees');
  const paramsCorrect = empCall && empCall.params && empCall.params.search === 'John' && empCall.params.role === 'Receptionist';

  assert(
    Boolean(paramsCorrect),
    'Test 6: Search & role filtering parameters are correctly passed to Api.getQ("/employees", ...)',
    `API calls captured: ${JSON.stringify(Api.getCalls())}`
  );

  // ----------------------------------------------------
  // Test 7: Doctor role filtering merges and deduplicates records
  // ----------------------------------------------------
  Api.clearCalls();
  roleFilterSelect.value = 'Doctor';
  await Staff.load(1);

  const doctorDocCall = Api.getCalls().find(c => c.method === 'GET_Q' && c.path === '/doctors');
  const doctorEmpCall = Api.getCalls().find(c => c.method === 'GET_Q' && c.path === '/employees' && c.params.role === 'Doctor');

  assert(
    Boolean(doctorDocCall && doctorEmpCall),
    'Test 7: Doctor role filter queries both /doctors and /employees?role=Doctor',
    `API calls: ${JSON.stringify(Api.getCalls())}`
  );

  // ----------------------------------------------------
  // Test 8: Employee POST payload and success toast
  // ----------------------------------------------------
  Toast.clear();
  Api.clearCalls();
  Staff.openAdd();
  form.querySelector('[name=first_name]').value = 'Jane';
  form.querySelector('[name=last_name]').value = 'Doe';
  form.querySelector('[name=gender]').value = 'Female';
  form.querySelector('[name=role]').value = 'Receptionist';
  form.querySelector('[name=dept_id]').value = '2';
  form.querySelector('[name=phone]').value = '0771234567';
  form.querySelector('[name=email]').value = 'jane.doe@hospital.com';

  await Staff.save();

  const postCall = Api.getCalls().find(c => c.method === 'POST' && c.path === '/employees');
  const successToast = Toast.getLogs().find(t => t.type === 'success' && t.msg.includes('Auto-provisioned account'));

  assert(
    postCall && postCall.body.job_title === 'Receptionist' && Boolean(successToast),
    'Test 8: Employee creation POST payload contains job_title and displays auto-provisioning toast',
    `Post payload: ${JSON.stringify(postCall ? postCall.body : null)}`
  );

  // ----------------------------------------------------
  // Test 9: Edit Staff modal population
  // ----------------------------------------------------
  Api.clearCalls();
  await Staff.openEdit(50, false); // Edit Receptionist
  const editTitle = mockDoc.getElementById('staff-modal-title').textContent;
  const firstNameInEdit = form.querySelector('[name=first_name]').value;

  assert(
    editTitle === 'Edit Staff Member' && firstNameInEdit === 'Jane' && docContainer.style.display === 'none',
    'Test 9: Staff.openEdit() populates employee details and sets up modal appropriately',
    `Title=${editTitle}, FirstName=${firstNameInEdit}`
  );

  // ----------------------------------------------------
  // Test 10: Delete staff member
  // ----------------------------------------------------
  Api.clearCalls();
  await Staff.delete(50, false);
  const deleteCall = Api.getCalls().find(c => c.method === 'DELETE' && c.path === '/employees/50');

  assert(
    Boolean(deleteCall),
    'Test 10: Staff.delete() sends DELETE request to /employees/:id',
    `Delete call: ${JSON.stringify(deleteCall)}`
  );

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
