const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appJsPath = path.resolve(__dirname, '../../frontend/js/app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');

console.log("=================================================");
console.log("CHALLENGER M2-3: EMPIRICAL VERIFICATION HARNESS");
console.log("=================================================");

function createSandbox() {
  const toastLogs = [];
  
  const createMockElement = (id = '', data = {}) => ({
    id,
    textContent: '',
    style: {},
    dataset: data,
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    addEventListener: () => {},
    appendChild: () => {},
    querySelector: () => null
  });

  const elements = {
    'user-name': createMockElement('user-name'),
    'user-role': createMockElement('user-role'),
    'user-avatar': createMockElement('user-avatar'),
    'logout-btn': createMockElement('logout-btn'),
    'page-title': createMockElement('page-title'),
    'page-dashboard': createMockElement('page-dashboard'),
    'page-staff': createMockElement('page-staff'),
    'page-patients': createMockElement('page-patients'),
    'page-doctors': createMockElement('page-doctors'),
    'page-appointments': createMockElement('page-appointments'),
    'page-billing': createMockElement('page-billing'),
    'page-pharmacy': createMockElement('page-pharmacy'),
    'page-laboratory': createMockElement('page-laboratory'),
    'page-reports': createMockElement('page-reports'),
  };

  const navItems = [
    createMockElement('', { page: 'dashboard' }),
    createMockElement('', { page: 'patients' }),
    createMockElement('', { page: 'doctors' }),
    createMockElement('', { page: 'staff' }),
    createMockElement('', { page: 'appointments' }),
    createMockElement('', { page: 'billing' }),
    createMockElement('', { page: 'pharmacy' }),
    createMockElement('', { page: 'laboratory' }),
    createMockElement('', { page: 'reports' }),
  ];

  const windowObj = {
    location: { pathname: '/' },
    history: { pushState: () => {} },
    addEventListener: () => {},
    CAN: {}
  };

  const documentObj = {
    getElementById: (id) => elements[id] || createMockElement(id),
    querySelectorAll: (sel) => {
      if (sel.includes('nav-item[data-page]')) return navItems;
      if (sel.includes('nav-section')) return [];
      if (sel.includes('nav-item')) return navItems;
      if (sel.includes('page-section')) return Object.values(elements);
      return [];
    },
    querySelector: (sel) => {
      const match = sel.match(/\[data-page="(.+)"\]/);
      if (match) return navItems.find(i => i.dataset.page === match[1]);
      return null;
    },
    createElement: () => createMockElement()
  };

  const Toast = {
    warning: (msg) => {
      toastLogs.push({ type: 'warning', msg });
    },
    info: (msg) => {
      toastLogs.push({ type: 'info', msg });
    }
  };

  const sandbox = {
    window: windowObj,
    document: documentObj,
    $: (id) => documentObj.getElementById(id),
    $$: (sel) => documentObj.querySelectorAll(sel),
    Fmt: { initials: () => 'US' },
    Auth: { logout: () => {} },
    Toast: Toast,
    Staff: { load: () => {} },
    Dashboard: { load: () => {} },
    Patients: { load: () => {} },
    Doctors: { load: () => {} },
    Appointments: { load: () => {} },
    Billing: { load: () => {} },
    Pharmacy: { load: () => {} },
    Laboratory: { load: () => {} },
    Reports: { load: () => {} },
    setTimeout: (fn) => fn(),
    console: console,
    toastLogs
  };

  vm.createContext(sandbox);
  vm.runInContext(appJsCode + '\nthis.App = App;\nthis.ROLE = ROLE;', sandbox);
  return sandbox;
}

let passed = true;

// Test 1: App.pageAccess population during applyRoleNav
console.log("\n[TEST 1] Verifying App.pageAccess population during applyRoleNav()");
const roles = ['Hospital_Admin', 'Doctor', 'Receptionist', 'Lab_Technician', 'Pharmacist', 'Accountant'];
roles.forEach(role => {
  const sb = createSandbox();
  sb.App.applyRoleNav(role);
  if (!sb.App.pageAccess) {
    console.error(`❌ FAIL: App.pageAccess is undefined for role ${role}`);
    passed = false;
  } else if (typeof sb.App.pageAccess.staff !== 'boolean') {
    console.error(`❌ FAIL: App.pageAccess.staff is not boolean for role ${role}`);
    passed = false;
  } else {
    console.log(`  - Role '${role.padEnd(16)}': pageAccess.staff = ${sb.App.pageAccess.staff}`);
    if (role === 'Hospital_Admin' && sb.App.pageAccess.staff !== true) {
      console.error(`❌ FAIL: Admin should have pageAccess.staff === true`);
      passed = false;
    }
    if (role !== 'Hospital_Admin' && sb.App.pageAccess.staff !== false) {
      console.error(`❌ FAIL: ${role} should have pageAccess.staff === false`);
      passed = false;
    }
  }
});

// Test 2: Direct App.navigate('staff') by non-Admin roles triggers Toast.warning and redirects to 'dashboard'
console.log("\n[TEST 2] Verifying Direct App.navigate('staff') by Non-Admin roles");
const nonAdminRoles = ['Doctor', 'Receptionist', 'Lab_Technician', 'Pharmacist', 'Accountant'];
nonAdminRoles.forEach(role => {
  const sb = createSandbox();
  sb.App.init({ username: role, role: role });
  sb.toastLogs.length = 0; // Clear init toasts if any
  
  // Call navigate directly
  sb.App.navigate('staff');
  
  const warningToast = sb.toastLogs.find(t => t.type === 'warning' && t.msg.includes('Access Denied'));
  const currentPg = sb.App.currentPage;
  
  if (!warningToast) {
    console.error(`❌ FAIL: Role '${role}' did not receive Access Denied warning toast.`);
    passed = false;
  } else if (currentPg !== 'dashboard') {
    console.error(`❌ FAIL: Role '${role}' current page is '${currentPg}', expected 'dashboard'.`);
    passed = false;
  } else {
    console.log(`  - Role '${role.padEnd(16)}': Blocked! Toast: "${warningToast.msg}", Redirected to: '${currentPg}'`);
  }
});

// Test 3: Admin access to App.navigate('staff') is permitted
console.log("\n[TEST 3] Verifying Admin access to App.navigate('staff')");
{
  const sb = createSandbox();
  sb.App.init({ username: 'admin', role: 'Hospital_Admin' });
  sb.toastLogs.length = 0;
  
  sb.App.navigate('staff');
  
  const warningToast = sb.toastLogs.find(t => t.type === 'warning');
  const currentPg = sb.App.currentPage;
  
  if (warningToast) {
    console.error(`❌ FAIL: Admin received unexpected warning toast: ${warningToast.msg}`);
    passed = false;
  } else if (currentPg !== 'staff') {
    console.error(`❌ FAIL: Admin current page is '${currentPg}', expected 'staff'.`);
    passed = false;
  } else {
    console.log(`  - Role 'Hospital_Admin  ': Permitted! Current page: '${currentPg}'`);
  }
}

console.log("\n=================================================");
if (passed) {
  console.log("FINAL VERDICT: ALL EMPIRICAL TESTS PASSED! (APPROVE)");
} else {
  console.log("FINAL VERDICT: EMPIRICAL TESTS FAILED! (REQUEST_CHANGES)");
}
console.log("=================================================");
