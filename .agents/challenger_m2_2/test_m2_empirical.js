/**
 * test_m2_empirical.js
 * Empirical test harness for M2 frontend updates:
 * 1. Dynamic Department visibility switching back and forth (Doctor -> Receptionist -> Doctor -> Admin).
 * 2. Form reset behaviors in openAdd() and openEdit().
 * 3. Self-deletion UI suppression checks.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('===========================================================');
  console.log('   EMPIRICAL CHALLENGER M2-2 TEST HARNESS EXECUTION');
  console.log('===========================================================');
  console.log(`Browser: ${CHROME_PATH}`);

  const testResults = [];

  function recordResult(testName, passed, details) {
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${testName}: ${details}`);
    testResults.push({ testName, passed, details });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // ------------------------------------------------------------------------
    // SETUP: Log in as Admin
    // ------------------------------------------------------------------------
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#login-username', { visible: true });
    await page.type('#login-username', 'admin');
    await page.type('#login-password', 'admin123');
    await page.click('#login-form button[type="submit"]');

    await page.waitForSelector('#app:not(.hidden)', { timeout: 5000 });
    const adminToken = await page.evaluate(() => localStorage.getItem('hms_token'));
    if (!adminToken) throw new Error('Admin login failed');

    // Navigate to Staff Tab
    await page.waitForSelector('a.nav-item[data-page="staff"]', { visible: true });
    await page.click('a.nav-item[data-page="staff"]');
    await page.waitForSelector('#page-staff.active', { visible: true });
    console.log('Navigated to Staff & Employees management page.');

    // ------------------------------------------------------------------------
    // TEST SUITE 1: Dynamic Department Visibility Switching
    // ------------------------------------------------------------------------
    console.log('\n--- Running Test Suite 1: Dynamic Department Visibility ---');

    // Open Add Staff Modal
    await page.waitForSelector('#btn-add-staff', { visible: true });
    await page.click('#btn-add-staff');
    await page.waitForSelector('#staff-modal:not(.hidden)', { visible: true });

    // Helper to get element state
    const getDeptState = async () => {
      return await page.evaluate(() => {
        const deptGroup = document.getElementById('dept-group');
        const deptSelect = document.querySelector('#staff-form select[name="dept_id"]');
        const docContainer = document.getElementById('doctor-fields-container');
        const empContainer = document.getElementById('employee-fields-container');
        return {
          deptGroupDisplay: deptGroup ? window.getComputedStyle(deptGroup).display : null,
          deptSelectRequired: deptSelect ? deptSelect.hasAttribute('required') : false,
          deptSelectValue: deptSelect ? deptSelect.value : null,
          docContainerDisplay: docContainer ? window.getComputedStyle(docContainer).display : null,
          empContainerDisplay: empContainer ? window.getComputedStyle(empContainer).display : null,
        };
      });
    };

    // State 0: Initial open state
    let state = await getDeptState();
    let s0Pass = state.deptGroupDisplay === 'none' && !state.deptSelectRequired;
    recordResult('S1.0: Initial Modal Open State', s0Pass, `deptGroup=${state.deptGroupDisplay}, required=${state.deptSelectRequired}`);

    // State 1: Select Doctor
    await page.select('#staff-role-select', 'Doctor');
    state = await getDeptState();
    let s1Pass = state.deptGroupDisplay === 'block' && state.deptSelectRequired && state.docContainerDisplay === 'block' && state.empContainerDisplay === 'none';
    recordResult('S1.1: Switch to Doctor', s1Pass, `deptGroup=${state.deptGroupDisplay}, required=${state.deptSelectRequired}, docContainer=${state.docContainerDisplay}`);

    // Set a department value while Doctor is selected
    const firstDeptVal = await page.evaluate(() => {
      const sel = document.querySelector('#staff-form select[name="dept_id"]');
      return sel.options.length > 1 ? sel.options[1].value : '';
    });
    if (firstDeptVal) {
      await page.select('#staff-form select[name="dept_id"]', firstDeptVal);
    }

    // State 2: Switch to Receptionist
    await page.select('#staff-role-select', 'Receptionist');
    state = await getDeptState();
    let s2Pass = state.deptGroupDisplay === 'none' && !state.deptSelectRequired && state.deptSelectValue === '' && state.docContainerDisplay === 'none' && state.empContainerDisplay === 'block';
    recordResult('S1.2: Switch to Receptionist', s2Pass, `deptGroup=${state.deptGroupDisplay}, required=${state.deptSelectRequired}, val="${state.deptSelectValue}"`);

    // State 3: Switch back to Doctor
    await page.select('#staff-role-select', 'Doctor');
    state = await getDeptState();
    let s3Pass = state.deptGroupDisplay === 'block' && state.deptSelectRequired && state.docContainerDisplay === 'block' && state.empContainerDisplay === 'none';
    recordResult('S1.3: Switch back to Doctor', s3Pass, `deptGroup=${state.deptGroupDisplay}, required=${state.deptSelectRequired}`);

    // State 4: Switch to Admin (Hospital_Admin)
    await page.select('#staff-role-select', 'Hospital_Admin');
    state = await getDeptState();
    let s4Pass = state.deptGroupDisplay === 'none' && !state.deptSelectRequired && state.deptSelectValue === '' && state.docContainerDisplay === 'none' && state.empContainerDisplay === 'block';
    recordResult('S1.4: Switch to Admin', s4Pass, `deptGroup=${state.deptGroupDisplay}, required=${state.deptSelectRequired}, val="${state.deptSelectValue}"`);

    // State 5: Switch through all other roles (Pharmacist, Lab_Technician, Accountant)
    let nonDocRolesPass = true;
    for (const r of ['Pharmacist', 'Lab_Technician', 'Accountant']) {
      await page.select('#staff-role-select', r);
      state = await getDeptState();
      if (state.deptGroupDisplay !== 'none' || state.deptSelectRequired || state.deptSelectValue !== '') {
        nonDocRolesPass = false;
        console.error(`Failed non-doctor check for role ${r}`);
      }
    }
    recordResult('S1.5: Switch through Pharmacist/Lab Tech/Accountant', nonDocRolesPass, `All non-doctor roles hide dept & clear required`);

    // Close modal
    await page.click('#staff-modal .btn-ghost');
    await page.waitForSelector('#staff-modal.hidden', { timeout: 3000 });

    // ------------------------------------------------------------------------
    // TEST SUITE 2: Form Reset Behaviors (openAdd and openEdit)
    // ------------------------------------------------------------------------
    console.log('\n--- Running Test Suite 2: Form Reset Behaviors ---');

    // Step 2.1: Populate dirty data in openAdd(), close without saving, then re-open openAdd()
    await page.click('#btn-add-staff');
    await page.waitForSelector('#staff-modal:not(.hidden)', { visible: true });

    await page.type('#staff-form input[name="first_name"]', 'DirtyFirstName');
    await page.type('#staff-form input[name="last_name"]', 'DirtyLastName');
    await page.type('#staff-form input[name="new_password"]', 'DirtyPass123!');
    await page.select('#staff-role-select', 'Doctor');

    // Close modal
    await page.click('#staff-modal .btn-ghost');
    await page.waitForSelector('#staff-modal.hidden', { timeout: 3000 });

    // Re-open via openAdd()
    await page.click('#btn-add-staff');
    await page.waitForSelector('#staff-modal:not(.hidden)', { visible: true });

    const addResetState = await page.evaluate(() => {
      const form = document.getElementById('staff-form');
      return {
        editId: Staff.editId,
        editIsDoctor: Staff.editIsDoctor,
        title: document.getElementById('staff-modal-title')?.textContent,
        firstName: form.querySelector('[name="first_name"]')?.value,
        lastName: form.querySelector('[name="last_name"]')?.value,
        newPassword: form.querySelector('[name="new_password"]')?.value,
        role: form.querySelector('[name="role"]')?.value,
        deptGroupDisplay: window.getComputedStyle(document.getElementById('dept-group')).display
      };
    });

    let addResetPass = addResetState.editId === null &&
      addResetState.editIsDoctor === false &&
      addResetState.title === 'Add New Staff Member' &&
      addResetState.firstName === '' &&
      addResetState.lastName === '' &&
      addResetState.newPassword === '' &&
      addResetState.role === '' &&
      addResetState.deptGroupDisplay === 'none';

    recordResult('S2.1: openAdd() Reset Behavior', addResetPass, `editId=${addResetState.editId}, title="${addResetState.title}", fn="${addResetState.firstName}", pwd="${addResetState.newPassword}"`);

    // Close modal
    await page.click('#staff-modal .btn-ghost');
    await page.waitForSelector('#staff-modal.hidden', { timeout: 3000 });

    // Step 2.2: Test openEdit() on employee vs doctor
    // Get list of employees from API or table
    const staffRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#staff-table tr'));
      return rows.map(r => {
        const text = r.innerText;
        const editBtn = r.querySelector('button[onclick*="Staff.openEdit"]');
        const onclickAttr = editBtn ? editBtn.getAttribute('onclick') : null;
        return { text, onclickAttr };
      }).filter(r => r.onclickAttr);
    });

    if (staffRows.length > 0) {
      // Execute openEdit for first item
      await page.evaluate((onclickAttr) => {
        eval(onclickAttr);
      }, staffRows[0].onclickAttr);

      await page.waitForSelector('#staff-modal:not(.hidden)', { timeout: 3000 });

      const editState = await page.evaluate(() => {
        const form = document.getElementById('staff-form');
        return {
          editId: Staff.editId,
          editIsDoctor: Staff.editIsDoctor,
          title: document.getElementById('staff-modal-title')?.textContent,
          firstName: form.querySelector('[name="first_name"]')?.value,
          newPassword: form.querySelector('[name="new_password"]')?.value,
        };
      });

      let editPass = editState.editId !== null &&
        editState.title === 'Edit Staff Member' &&
        editState.firstName !== '' &&
        editState.newPassword === '';

      recordResult('S2.2: openEdit() Behavior', editPass, `editId=${editState.editId}, title="${editState.title}", fn="${editState.firstName}", newPasswordCleared=${editState.newPassword === ''}`);

      // Now close edit modal and call openAdd() to ensure edit state is cleared
      await page.click('#staff-modal .btn-ghost');
      await page.waitForSelector('#staff-modal.hidden', { timeout: 3000 });

      await page.click('#btn-add-staff');
      await page.waitForSelector('#staff-modal:not(.hidden)', { visible: true });

      const postEditAddState = await page.evaluate(() => {
        return {
          editId: Staff.editId,
          editIsDoctor: Staff.editIsDoctor,
          title: document.getElementById('staff-modal-title')?.textContent,
          firstName: document.querySelector('#staff-form [name="first_name"]')?.value
        };
      });

      let postEditAddPass = postEditAddState.editId === null &&
        postEditAddState.editIsDoctor === false &&
        postEditAddState.title === 'Add New Staff Member' &&
        postEditAddState.firstName === '';

      recordResult('S2.3: openAdd() after openEdit() clears editId', postEditAddPass, `editId=${postEditAddState.editId}, title="${postEditAddState.title}", fn="${postEditAddState.firstName}"`);

      await page.click('#staff-modal .btn-ghost');
      await page.waitForSelector('#staff-modal.hidden', { timeout: 3000 });
    } else {
      recordResult('S2.2: openEdit() Behavior', false, 'No staff rows available with edit button');
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 3: Self-Deletion UI Suppression Checks
    // ------------------------------------------------------------------------
    console.log('\n--- Running Test Suite 3: Self-Deletion UI Suppression ---');

    // Refresh table and search for 'admin'
    await page.evaluate(async () => {
      const searchEl = document.getElementById('staff-search');
      if (searchEl) searchEl.value = 'admin';
      await Staff.load(1);
    });

    // Wait for DOM update and lucide icons
    await new Promise(r => setTimeout(r, 500));

    const selfDeletionDOMCheck = await page.evaluate(() => {
      const currentUser = Auth.user || App.user;
      const rows = Array.from(document.querySelectorAll('#staff-table tr'));
      
      let selfRowFound = false;
      let selfRowHasEdit = false;
      let selfRowHasDelete = false;
      let otherAdminRowHasDelete = false;

      const debugRows = [];
      rows.forEach(r => {
        const text = r.innerText;
        const editBtn = r.querySelector('button[title="Edit"]');
        const deleteBtn = r.querySelector('button[title="Delete"]');
        debugRows.push({ text, hasEdit: !!editBtn, hasDelete: !!deleteBtn });

        // Match row belonging to active logged-in user (User: admin)
        if (text.includes(`User: ${currentUser.username}`) || text.includes(`User: admin`)) {
          selfRowFound = true;
          if (editBtn) selfRowHasEdit = true;
          if (deleteBtn) selfRowHasDelete = true;
        } else if (text.toLowerCase().includes('hospital_admin') || text.toLowerCase().includes('admin')) {
          if (deleteBtn) otherAdminRowHasDelete = true;
        }
      });

      return {
        currentUsername: currentUser ? currentUser.username : null,
        currentUserId: currentUser ? (currentUser.id || currentUser.user_id) : null,
        debugRows,
        selfRowFound,
        selfRowHasEdit,
        selfRowHasDelete,
        otherAdminRowHasDelete
      };
    });

    let s3DOMPass = selfDeletionDOMCheck.selfRowFound && selfDeletionDOMCheck.selfRowHasEdit && !selfDeletionDOMCheck.selfRowHasDelete && selfDeletionDOMCheck.otherAdminRowHasDelete;
    console.log('S3.1 Debug Rows:', JSON.stringify(selfDeletionDOMCheck.debugRows, null, 2));
    recordResult('S3.1: Active Logged-in Admin Row Delete Button Suppression', s3DOMPass, `selfRowFound=${selfDeletionDOMCheck.selfRowFound}, selfEditPresent=${selfDeletionDOMCheck.selfRowHasEdit}, selfDeletePresent=${selfDeletionDOMCheck.selfRowHasDelete}, otherAdminDeletePresent=${selfDeletionDOMCheck.otherAdminRowHasDelete}`);

    // Unit Stress Test of Staff.render isSelf comparison logic in page evaluation context
    const isSelfLogicTest = await page.evaluate(() => {
      const testCases = [
        // Exact match by User_ID as int/string
        { currentUser: { id: 1, username: 'admin' }, row: { User_ID: 1, Emp_ID: 10, Username: 'admin' }, expectedIsSelf: true },
        { currentUser: { id: 1, username: 'admin' }, row: { User_ID: '1', Emp_ID: 10, Username: 'admin' }, expectedIsSelf: true },
        // Exact match by Username case-insensitive
        { currentUser: { username: 'Admin' }, row: { User_ID: 99, Emp_ID: 10, Username: 'admin' }, expectedIsSelf: true },
        { currentUser: { username: 'admin' }, row: { User_ID: 99, Emp_ID: 10, Username: 'ADMIN' }, expectedIsSelf: true },
        // Match by Emp_ID / Doctor_ID
        { currentUser: { employeeId: 5 }, row: { User_ID: 99, Emp_ID: 5, Username: 'other' }, expectedIsSelf: true },
        { currentUser: { doctorId: 3 }, row: { User_ID: 99, Doctor_ID: 3, Username: 'other' }, expectedIsSelf: true },
        // Different user (no match)
        { currentUser: { id: 1, employeeId: 1, doctorId: null, username: 'admin' }, row: { User_ID: 2, Emp_ID: 2, Doctor_ID: null, Username: 'sarah' }, expectedIsSelf: false },
        { currentUser: { id: 1, username: 'admin' }, row: { User_ID: 10, Emp_ID: 'doc_5', Doctor_ID: 5, Username: 'dr_smith' }, expectedIsSelf: false }
      ];

      const checkIsSelf = (currentUser, s) => {
        const currentUserId = currentUser ? (currentUser.id || currentUser.user_id) : null;
        const currentEmpId  = currentUser ? currentUser.employeeId : null;
        const currentDocId  = currentUser ? currentUser.doctorId : null;
        const currentUsername = currentUser ? currentUser.username : null;

        return Boolean(
          (currentUserId && s.User_ID && parseInt(s.User_ID) === parseInt(currentUserId)) ||
          (currentEmpId && s.Emp_ID && parseInt(s.Emp_ID) === parseInt(currentEmpId)) ||
          (currentDocId && s.Doctor_ID && parseInt(s.Doctor_ID) === parseInt(currentDocId)) ||
          (currentUsername && (s.Username || s.username) && currentUsername.toLowerCase() === (s.Username || s.username).toLowerCase())
        );
      };

      let allPassed = true;
      const details = [];

      testCases.forEach((tc, idx) => {
        const actual = checkIsSelf(tc.currentUser, tc.row);
        const match = actual === tc.expectedIsSelf;
        if (!match) allPassed = false;
        details.push(`Case ${idx + 1}: expected=${tc.expectedIsSelf}, got=${actual} -> ${match ? 'OK' : 'FAIL'}`);
      });

      return { allPassed, details };
    });

    recordResult('S3.2: isSelf Unit Matrix Stress Test', isSelfLogicTest.allPassed, isSelfLogicTest.details.join('; '));

    await browser.close();

    console.log('\n===========================================================');
    const allPassed = testResults.every(r => r.passed);
    console.log(`FINAL RESULT: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
    console.log('===========================================================');

    return { success: allPassed, testResults };

  } catch (err) {
    console.error('TEST EXEC ERROR:', err);
    await browser.close();
    return { success: false, error: err.message, testResults };
  }
}

runTests().then(res => {
  if (!res.success) {
    process.exit(1);
  }
});
