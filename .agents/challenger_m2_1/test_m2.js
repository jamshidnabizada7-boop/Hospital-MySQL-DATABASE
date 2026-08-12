const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runTests() {
  console.log("=== EMPIRICAL TEST SUITE: MILESTONE 2 FRONTEND IMPLEMENTATION ===");
  
  const rootDir = path.resolve(__dirname, '../../');
  const htmlPath = path.join(rootDir, 'frontend', 'index.html');
  const appJsPath = path.join(rootDir, 'frontend', 'js', 'app.js');
  const staffJsPath = path.join(rootDir, 'frontend', 'js', 'staff.js');
  
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  // Strip external script tags to avoid network fetch attempts by JSDOM
  htmlContent = htmlContent.replace(/<script\s+src="[^"]*"><\/script>/gi, '');

  const appJsContent = fs.readFileSync(appJsPath, 'utf8').replace(/^const App =/m, 'window.App =');
  const staffJsContent = fs.readFileSync(staffJsPath, 'utf8').replace(/^const Staff =/m, 'window.Staff =');

  const dom = new JSDOM(htmlContent, {
    url: "http://localhost/",
    runScripts: "outside-only"
  });

  const { window } = dom;
  const { document } = window;

  // Mock global helpers required by staff.js and app.js
  window.$ = id => document.getElementById(id);
  window.$$ = sel => document.querySelectorAll(sel);
  window.Toast = {
    success: (msg) => console.log('Toast.success:', msg),
    error: (msg) => console.log('Toast.error:', msg),
    warning: (msg) => console.log('Toast.warning:', msg),
    info: (msg) => console.log('Toast.info:', msg)
  };
  window.Fmt = {
    initials: name => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U',
    date: d => d ? new Date(d).toLocaleDateString() : '—'
  };
  window.Modal = {
    open: () => {},
    close: () => {}
  };
  window.renderPagination = () => {};
  window.resetForm = formId => {
    const form = document.getElementById(formId);
    if (form) form.reset();
  };
  window.serializeForm = formId => {
    const form = document.getElementById(formId);
    if (!form) return {};
    const formData = new window.FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  };
  window.Api = {
    get: async () => ({ success: true, data: [] }),
    getQ: async () => ({ success: true, data: [] }),
    post: async () => ({ success: true }),
    put: async () => ({ success: true }),
    delete: async () => ({ success: true })
  };

  // Evaluate app.js and staff.js in JSDOM context
  window.eval(appJsContent);
  window.eval(staffJsContent);

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedTests++;
    }
  }

  console.log("\n--- Requirement 1: DOM Structure Verification ---");
  const deptGroup = document.getElementById('dept-group');
  assert(deptGroup !== null, "#dept-group element exists in index.html");

  const roleSelect = document.getElementById('staff-role-select');
  assert(roleSelect !== null, "#staff-role-select element exists in index.html");

  if (roleSelect) {
    const adminOpt = Array.from(roleSelect.options).find(o => o.value === 'Hospital_Admin');
    assert(adminOpt !== undefined && adminOpt.textContent.includes('Admin'), "<option value=\"Hospital_Admin\">Admin</option> exists in #staff-role-select");
  }

  const staffForm = document.getElementById('staff-form');
  assert(staffForm !== null, "#staff-form element exists in index.html");

  const newPasswordInput = staffForm ? staffForm.querySelector('input[name="new_password"]') : null;
  assert(newPasswordInput !== null, "input[name=new_password] exists in #staff-form");


  console.log("\n--- Requirement 2: Staff.onRoleChange() Logic ---");
  const docContainer = document.getElementById('doctor-fields-container');
  const empContainer = document.getElementById('employee-fields-container');
  const deptSelect = staffForm ? staffForm.querySelector('[name=dept_id]') : null;

  // Test selecting Doctor
  if (roleSelect) {
    roleSelect.value = 'Doctor';
    window.Staff.onRoleChange();
    assert(docContainer.style.display === 'block', "Doctor container visible (display: block) when Doctor role selected");
    assert(empContainer.style.display === 'none', "Employee container hidden (display: none) when Doctor role selected");
    assert(deptGroup.style.display === 'block', "Dept group visible (display: block) when Doctor role selected");
    assert(deptSelect.hasAttribute('required'), "dept_id has required attribute when Doctor role selected");

    // Test selecting Receptionist
    roleSelect.value = 'Receptionist';
    window.Staff.onRoleChange();
    assert(docContainer.style.display === 'none', "Doctor container hidden (display: none) when Receptionist role selected");
    assert(empContainer.style.display === 'block', "Employee container visible (display: block) when Receptionist role selected");
    assert(deptGroup.style.display === 'none', "Dept group hidden (display: none) when Receptionist role selected");
    assert(!deptSelect.hasAttribute('required'), "dept_id required attribute removed when Receptionist role selected");
    assert(deptSelect.value === '', "dept_id value reset to empty when non-doctor role selected");

    // Test selecting Hospital_Admin
    roleSelect.value = 'Hospital_Admin';
    window.Staff.onRoleChange();
    assert(deptGroup.style.display === 'none', "Dept group hidden (display: none) when Hospital_Admin role selected");
    assert(!deptSelect.hasAttribute('required'), "dept_id required attribute removed when Hospital_Admin role selected");
  }


  console.log("\n--- Requirement 3: Staff.render() Self-Delete Suppression ---");
  window.CAN = { editStaff: true, deleteStaff: true };
  window.Auth = { user: { id: 10, username: 'admin_user', employeeId: 101 } };

  const testStaffData = [
    {
      Emp_ID: 101,
      User_ID: 10,
      First_Name: 'Active',
      Last_Name: 'Admin',
      Username: 'admin_user',
      Role_Name: 'Hospital_Admin',
      Job_Title: 'Hospital_Admin',
      Is_Active: 1
    },
    {
      Emp_ID: 202,
      User_ID: 20,
      First_Name: 'Jane',
      Last_Name: 'Doe',
      Username: 'jane_rec',
      Role_Name: 'Receptionist',
      Job_Title: 'Receptionist',
      Is_Active: 1
    }
  ];

  window.Staff.render({ data: testStaffData, total: 2, page: 1, limit: 15 });
  const staffTable = document.getElementById('staff-table');
  const rows = staffTable.querySelectorAll('tr');

  assert(rows.length === 2, "2 rows rendered in staff table");

  if (rows.length >= 2) {
    const adminRowHtml = rows[0].innerHTML;
    const janeRowHtml = rows[1].innerHTML;

    assert(!adminRowHtml.includes('Staff.delete(101'), "Active logged-in admin row DOES NOT contain delete button");
    assert(adminRowHtml.includes('Staff.openEdit(101'), "Active logged-in admin row DOES contain edit button");

    assert(janeRowHtml.includes('Staff.delete(202'), "Other staff member row DOES contain delete button");
    assert(janeRowHtml.includes('Staff.openEdit(202'), "Other staff member row DOES contain edit button");
  }


  console.log("\n--- Requirement 4: Staff.save() Payload Generation ---");
  let lastCall = null;
  window.Api.post = async (endpoint, payload) => {
    lastCall = { method: 'POST', endpoint, payload };
    return { success: true, credentials: { username: 'test.user' } };
  };
  window.Api.put = async (endpoint, payload) => {
    lastCall = { method: 'PUT', endpoint, payload };
    return { success: true };
  };

  // Helper to set form values
  function setFormValues(fields) {
    for (const [name, val] of Object.entries(fields)) {
      const input = staffForm.querySelector(`[name="${name}"]`);
      if (input) {
        if (input.tagName === 'SELECT') {
          // If option doesn't exist, create it for testing
          if (!Array.from(input.options).some(o => o.value === val)) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            input.appendChild(opt);
          }
        }
        input.value = val;
      }
    }
  }

  // Case 4a: Add new non-doctor without password
  window.Staff.editId = null;
  window.Staff.editIsDoctor = false;
  setFormValues({
    first_name: 'Alex',
    last_name: 'Smith',
    role: 'Receptionist',
    phone: '0712345678',
    email: 'alex@hospital.com',
    salary: '2500',
    new_password: ''
  });
  roleSelect.value = 'Receptionist';
  window.Staff.onRoleChange();

  await window.Staff.save();
  assert(lastCall && lastCall.method === 'POST' && lastCall.endpoint === '/employees', "Staff.save() posts to /employees for new Receptionist");
  assert(lastCall && lastCall.payload.dept_id === null, "Payload dept_id is null for non-doctor role");
  assert(lastCall && !lastCall.payload.new_password && !lastCall.payload.password, "Payload does not contain password when new_password is empty");

  // Case 4b: Add new non-doctor WITH custom password
  lastCall = null;
  setFormValues({
    first_name: 'Alex',
    last_name: 'Smith',
    role: 'Receptionist',
    phone: '0712345678',
    email: 'alex@hospital.com',
    salary: '2500',
    new_password: 'customSecret123'
  });

  await window.Staff.save();
  assert(lastCall && (lastCall.payload.new_password === 'customSecret123' || lastCall.payload.password === 'customSecret123'), "Payload includes custom password when provided on creation");

  // Case 4c: Edit non-doctor WITH custom password
  lastCall = null;
  window.Staff.editId = 5;
  window.Staff.editIsDoctor = false;
  setFormValues({
    first_name: 'Alex',
    last_name: 'Smith',
    role: 'Pharmacist',
    phone: '0712345678',
    email: 'alex@hospital.com',
    salary: '3000',
    new_password: 'updatedPassword999'
  });
  roleSelect.value = 'Pharmacist';
  window.Staff.onRoleChange();

  await window.Staff.save();
  assert(lastCall && lastCall.method === 'PUT' && lastCall.endpoint === '/employees/5', "Staff.save() puts to /employees/5 for editing employee #5");
  assert(lastCall && lastCall.payload.dept_id === null, "Payload dept_id is null on update for non-doctor");
  assert(lastCall && (lastCall.payload.new_password === 'updatedPassword999' || lastCall.payload.password === 'updatedPassword999'), "Payload includes updated custom password on edit");

  // Case 4d: Edit non-doctor WITHOUT custom password
  lastCall = null;
  window.Staff.editId = 5;
  window.Staff.editIsDoctor = false;
  setFormValues({
    first_name: 'Alex',
    last_name: 'Smith',
    role: 'Pharmacist',
    phone: '0712345678',
    email: 'alex@hospital.com',
    salary: '3000',
    new_password: ''
  });

  await window.Staff.save();
  assert(lastCall && !lastCall.payload.new_password && !lastCall.payload.password, "Payload omits password on edit when input is left blank");

  // Case 4e: Add Doctor role
  lastCall = null;
  window.Staff.editId = null;
  window.Staff.editIsDoctor = false;
  setFormValues({
    first_name: 'House',
    last_name: 'MD',
    role: 'Doctor',
    dept_id: '2',
    phone: '0799999999',
    email: 'house@hospital.com',
    license_number: 'DOC-7777',
    spec_id: '1'
  });
  roleSelect.value = 'Doctor';
  window.Staff.onRoleChange();

  await window.Staff.save();
  if (!lastCall) console.log("DEBUG: lastCall was null after Staff.save() for Doctor!");
  else console.log("DEBUG: lastCall for Doctor:", lastCall);

  assert(lastCall && lastCall.method === 'POST' && lastCall.endpoint === '/doctors', "Staff.save() posts to /doctors for Doctor role");
  assert(lastCall && lastCall.payload.dept_id === '2', "Payload dept_id is preserved for Doctor role");


  console.log("\n================ SUMMARY ================");
  console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);

  if (failedTests > 0) {
    console.error("\nRESULT: REJECT - One or more empirical tests failed.");
    process.exit(1);
  } else {
    console.log("\nRESULT: APPROVE - All empirical tests passed successfully!");
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Fatal error running test suite:", err);
  process.exit(1);
});
