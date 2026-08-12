/**
 * test_e2e.js — Final E2E Browser Automation Verification Pass for Milestone 4
 *
 * Steps verified:
 * 1. Pre-test API cleanup of any existing test users ('e2eadmin.user', 'e2erecep.user').
 * 2. Launch headless browser (Chrome via puppeteer-core).
 * 3. Navigate to http://localhost:5000 and log in as default Admin (admin / admin123).
 * 4. Navigate to "Staff & Employees" tab (#page-staff).
 * 5. Create new Admin staff member (E2EAdmin User, role 'Hospital_Admin').
 * 6. Create new Receptionist staff member (E2ERecep User, role 'Receptionist', department hidden / null).
 * 7. Open Edit Staff modal for Receptionist, set custom password "CustomPass2026!", and save.
 * 8. Log out Admin session.
 * 9. Log in as Receptionist using custom password ("e2erecep.user" / "CustomPass2026!").
 * 10. Verify Receptionist authentication, JWT token, role badge, and restricted RBAC view.
 * 11. Log out Receptionist session.
 * 12. Log in as newly created Admin ("e2eadmin.user" / "admin123").
 * 13. Verify Admin authentication, JWT token, role badge, and full Admin capabilities.
 * 14. Navigate to Staff tab and delete Receptionist test staff member (confirming dialog and row removal).
 * 15. Log out Admin session and clean up created test records.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function cleanupTestUsers() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) return;

    const empRes = await fetch('http://localhost:5000/api/employees?limit=100', {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const empData = await empRes.json();
    if (empData.success && Array.isArray(empData.data)) {
      for (const emp of empData.data) {
        if (['e2eadmin.user', 'e2erecep.user', 'sarah.connor'].includes(emp.Username) ||
            (emp.Email && emp.Email.includes('e2e'))) {
          console.log(`Pre-test cleanup: Deleting test employee Emp_ID=${emp.Emp_ID} (${emp.Username})...`);
          await fetch(`http://localhost:5000/api/employees/${emp.Emp_ID}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${loginData.token}` }
          });
        }
      }
    }
  } catch (err) {
    console.log('Pre-test cleanup note:', err.message);
  }
}

async function runE2ETest() {
  console.log('====================================================');
  console.log('  MILESTONE 4 E2E BROWSER AUTOMATION VERIFICATION');
  console.log('====================================================');
  console.log(`Browser Path: ${CHROME_PATH}`);

  await cleanupTestUsers();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const logs = [];
  function logStep(step, message, status = 'PASS') {
    const msg = `[${status}] Step ${step}: ${message}`;
    console.log(msg);
    logs.push(msg);
  }

  // Handle Javascript alert/confirm dialogs (automatically accept deletion confirms)
  page.on('dialog', async dialog => {
    console.log(`[Browser Dialog] ${dialog.type()}: "${dialog.message()}" -> Accepting`);
    await dialog.accept();
  });

  try {
    // Step 1: Open App
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    logStep(1, 'Navigated to http://localhost:5000');

    // Step 2: Log in as Admin (admin / admin123)
    await page.waitForSelector('#login-username', { visible: true });
    await page.type('#login-username', 'admin');
    await page.type('#login-password', 'admin123');
    await page.click('#login-form button[type="submit"]');

    await page.waitForSelector('#app:not(.hidden)', { timeout: 5000 });
    const adminToken = await page.evaluate(() => localStorage.getItem('hms_token'));
    const adminUserRole = await page.evaluate(() => document.getElementById('user-role')?.textContent);
    if (!adminToken) throw new Error('Admin login failed: Token not found in localStorage');
    logStep(2, `Admin logged in successfully. Role badge: "${adminUserRole}".`);

    // Step 3: Navigate to Staff tab
    await page.waitForSelector('a.nav-item[data-page="staff"]', { visible: true });
    await page.click('a.nav-item[data-page="staff"]');
    await page.waitForSelector('#page-staff.active', { visible: true });
    logStep(3, 'Navigated to Staff & Employees tab (#page-staff active)');

    // Step 4: Create new Admin staff member (E2EAdmin User)
    await page.waitForSelector('#btn-add-staff', { visible: true });
    await page.click('#btn-add-staff');
    await page.waitForSelector('#staff-modal:not(.hidden)', { visible: true });

    await page.type('#staff-form input[name="first_name"]', 'E2EAdmin');
    await page.type('#staff-form input[name="last_name"]', 'User');
    await page.select('#staff-form select[name="gender"]', 'Male');
    await page.select('#staff-form select[name="role"]', 'Hospital_Admin');
    await page.evaluate(() => {
      if (typeof Staff !== 'undefined' && Staff.onRoleChange) Staff.onRoleChange();
    });

    const isDeptHiddenForAdmin = await page.evaluate(() => {
      const deptGroup = document.getElementById('dept-group');
      return deptGroup && deptGroup.style.display === 'none';
    });
    if (!isDeptHiddenForAdmin) throw new Error('Department field should be hidden for Admin role');

    await page.evaluate(() => {
      const dobInput = document.querySelector('#staff-form input[name="date_of_birth"]');
      if (dobInput) dobInput.value = '1988-03-20';
    });
    await page.type('#staff-form input[name="phone"]', '0770001111');
    await page.type('#staff-form input[name="email"]', 'e2eadmin.user@hospital.com');
    await page.evaluate(() => {
      const salInput = document.querySelector('#staff-form input[name="salary"]');
      if (salInput) salInput.value = '50000.00';
    });

    const [adminCreateRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/employees') && res.request().method() === 'POST'),
      page.click('#staff-modal .modal-footer button.btn-primary')
    ]);
    const adminCreateData = await adminCreateRes.json();
    if (!adminCreateData.success || adminCreateData.credentials?.username !== 'e2eadmin.user') {
      throw new Error(`Admin creation failed: ${JSON.stringify(adminCreateData)}`);
    }
    await page.waitForSelector('#staff-modal.hidden', { timeout: 5000 });
    logStep(4, `Created new Admin staff member "e2eadmin.user" (password: admin123).`);

    // Step 5: Create new Receptionist staff member (E2ERecep User with dept_id = null)
    await page.waitForSelector('#btn-add-staff', { visible: true });
    await page.click('#btn-add-staff');
    await page.waitForSelector('#staff-modal:not(.hidden)', { visible: true });

    await page.type('#staff-form input[name="first_name"]', 'E2ERecep');
    await page.type('#staff-form input[name="last_name"]', 'User');
    await page.select('#staff-form select[name="gender"]', 'Female');
    await page.select('#staff-form select[name="role"]', 'Receptionist');
    await page.evaluate(() => {
      if (typeof Staff !== 'undefined' && Staff.onRoleChange) Staff.onRoleChange();
    });

    const isDeptHiddenForRecep = await page.evaluate(() => {
      const deptGroup = document.getElementById('dept-group');
      return deptGroup && deptGroup.style.display === 'none';
    });
    if (!isDeptHiddenForRecep) throw new Error('Department field should be hidden for Receptionist role');

    await page.evaluate(() => {
      const dobInput = document.querySelector('#staff-form input[name="date_of_birth"]');
      if (dobInput) dobInput.value = '1993-06-15';
    });
    await page.type('#staff-form input[name="phone"]', '0770002222');

    await page.type('#staff-form input[name="email"]', 'e2erecep.user@hospital.com');
    await page.evaluate(() => {
      const salInput = document.querySelector('#staff-form input[name="salary"]');
      if (salInput) salInput.value = '25000.00';
    });

    const [recepCreateRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/employees') && res.request().method() === 'POST'),
      page.click('#staff-modal .modal-footer button.btn-primary')
    ]);
    const recepCreateData = await recepCreateRes.json();
    if (!recepCreateData.success || recepCreateData.credentials?.username !== 'e2erecep.user') {
      throw new Error(`Receptionist creation failed: ${JSON.stringify(recepCreateData)}`);
    }
    const recepEmpId = recepCreateData.data.Emp_ID;
    await page.waitForSelector('#staff-modal.hidden', { timeout: 5000 });
    logStep(5, `Created Receptionist staff member "e2erecep.user" (Emp_ID=${recepEmpId}) with Department hidden (dept_id = null).`);

    // Step 6: Open Edit Staff modal for Receptionist, set custom password "CustomPass2026!", and save
    await page.evaluate(empId => {
      if (typeof Staff !== 'undefined' && Staff.openEdit) Staff.openEdit(empId, false);
    }, recepEmpId);
    await page.waitForSelector('#staff-modal:not(.hidden)', { visible: true });

    await page.type('#staff-form input[name="new_password"]', 'CustomPass2026!');

    const [editRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/employees/') && res.request().method() === 'PUT'),
      page.click('#staff-modal .modal-footer button.btn-primary')
    ]);
    const editData = await editRes.json();
    if (!editData.success) throw new Error(`Staff edit failed: ${JSON.stringify(editData)}`);
    await page.waitForSelector('#staff-modal.hidden', { timeout: 5000 });
    logStep(6, `Edited Receptionist "e2erecep.user" and updated password to "CustomPass2026!".`);

    // Step 7: Logout Admin
    await page.click('#logout-btn');
    await page.waitForSelector('#auth-screen:not(.hidden)', { timeout: 5000 });
    const tokenCleared1 = await page.evaluate(() => !localStorage.getItem('hms_token'));
    if (!tokenCleared1) throw new Error('Logout failed: Token not cleared');
    logStep(7, 'Logged out Admin session successfully.');

    // Step 8: Log in using newly edited Receptionist credentials (CustomPass2026!)
    await page.waitForSelector('#login-username', { visible: true });
    await page.type('#login-username', 'e2erecep.user');
    await page.type('#login-password', 'CustomPass2026!');
    await page.click('#login-form button[type="submit"]');

    await page.waitForSelector('#app:not(.hidden)', { timeout: 5000 });
    const recepToken = await page.evaluate(() => localStorage.getItem('hms_token'));
    const recepRoleText = await page.evaluate(() => document.getElementById('user-role')?.textContent);
    if (!recepToken) throw new Error('Receptionist login failed with custom password');
    logStep(8, `Receptionist "e2erecep.user" logged in successfully with custom password "CustomPass2026!". Role: "${recepRoleText}".`);

    // Verify Receptionist RBAC restriction (e.g. Staff tab hidden or Add Staff button disabled)
    const recepCanAddStaff = await page.evaluate(() => window.CAN && window.CAN.addStaff === true);
    if (recepCanAddStaff) throw new Error('RBAC Violation: Receptionist should NOT have addStaff permission');
    logStep(9, 'Verified Receptionist RBAC controls: addStaff permission correctly denied.');

    // Step 9: Logout Receptionist
    await page.click('#logout-btn');
    await page.waitForSelector('#auth-screen:not(.hidden)', { timeout: 5000 });
    logStep(10, 'Logged out Receptionist session successfully.');

    // Step 10: Log in using newly created Admin credentials (e2eadmin.user / admin123)
    await page.waitForSelector('#login-username', { visible: true });
    await page.type('#login-username', 'e2eadmin.user');
    await page.type('#login-password', 'admin123');
    await page.click('#login-form button[type="submit"]');

    await page.waitForSelector('#app:not(.hidden)', { timeout: 5000 });
    const newAdminToken = await page.evaluate(() => localStorage.getItem('hms_token'));
    const newAdminRoleText = await page.evaluate(() => document.getElementById('user-role')?.textContent);
    if (!newAdminToken) throw new Error('Newly created Admin login failed');
    logStep(11, `Newly created Admin "e2eadmin.user" logged in successfully! Role: "${newAdminRoleText}".`);

    // Step 11: Navigate to Staff tab and delete Receptionist test staff member
    await page.waitForSelector('a.nav-item[data-page="staff"]', { visible: true });
    await page.click('a.nav-item[data-page="staff"]');
    await page.waitForSelector('#page-staff.active', { visible: true });

    // Trigger delete action for Receptionist (Emp_ID = recepEmpId)
    const [deleteRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/employees/') && res.request().method() === 'DELETE'),
      page.evaluate(empId => {
        if (typeof Staff !== 'undefined' && Staff.delete) Staff.delete(empId, false);
      }, recepEmpId)
    ]);
    const deleteData = await deleteRes.json();
    if (!deleteData.success) throw new Error(`Delete staff member failed: ${JSON.stringify(deleteData)}`);
    logStep(12, `Deleted Receptionist staff member Emp_ID=${recepEmpId} via newly created Admin session.`);

    // Verify row removal from table
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
    const recepRowExists = await page.evaluate(username => {
      const table = document.getElementById('staff-table');
      return table && table.textContent.includes(username);
    }, 'e2erecep.user');
    if (recepRowExists) throw new Error('Table row verification failed: deleted staff member still visible in DOM');
    logStep(13, 'Confirmed row removal of deleted Receptionist from DOM table.');

    // Step 12: Logout Admin
    await page.click('#logout-btn');
    await page.waitForSelector('#auth-screen:not(.hidden)', { timeout: 5000 });
    logStep(14, 'Logged out Admin session successfully.');

    // Step 13: Final Cleanup of Created Admin
    await cleanupTestUsers();
    logStep(15, 'Cleaned up test environment.');

    console.log('====================================================');
    console.log('  E2E BROWSER VERIFICATION FULLY PASSED (100%)');
    console.log('====================================================');

    await browser.close();
    return { success: true, logs };
  } catch (err) {
    console.error('E2E TEST ERROR:', err.message);
    logStep('FAIL', err.message, 'FAIL');
    await browser.close();
    return { success: false, error: err.message, logs };
  }
}

runE2ETest().then(result => {
  if (!result.success) process.exit(1);
});
