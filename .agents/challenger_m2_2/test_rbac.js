const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appJsPath = path.resolve(__dirname, '../../frontend/js/app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');

console.log("=== EMPIRICAL VERIFICATION OF APP.JS RBAC & ROUTING ===");

class MockElement {
  constructor(id = '', data = {}) {
    this.id = id;
    this.textContent = '';
    this.style = {};
    this.dataset = data;
    this.classList = {
      add: (cls) => this.classes.add(cls),
      remove: (cls) => this.classes.delete(cls),
      contains: (cls) => this.classes.has(cls)
    };
    this.classes = new Set();
  }
  addEventListener() {}
  appendChild() {}
  querySelector() { return null; }
}

function createSandbox() {
  const elements = {
    'user-name': new MockElement('user-name'),
    'user-role': new MockElement('user-role'),
    'user-avatar': new MockElement('user-avatar'),
    'logout-btn': new MockElement('logout-btn'),
    'page-title': new MockElement('page-title'),
    'page-dashboard': new MockElement('page-dashboard'),
    'page-staff': new MockElement('page-staff'),
    'page-patients': new MockElement('page-patients'),
    'page-doctors': new MockElement('page-doctors'),
    'page-appointments': new MockElement('page-appointments'),
    'page-billing': new MockElement('page-billing'),
    'page-pharmacy': new MockElement('page-pharmacy'),
    'page-laboratory': new MockElement('page-laboratory'),
    'page-reports': new MockElement('page-reports'),
  };

  const navItems = [
    new MockElement('', { page: 'dashboard' }),
    new MockElement('', { page: 'patients' }),
    new MockElement('', { page: 'doctors' }),
    new MockElement('', { page: 'staff' }),
    new MockElement('', { page: 'appointments' }),
    new MockElement('', { page: 'billing' }),
    new MockElement('', { page: 'pharmacy' }),
    new MockElement('', { page: 'laboratory' }),
    new MockElement('', { page: 'reports' }),
  ];

  const windowObj = {
    location: { pathname: '/staff' },
    history: { pushState: () => {} },
    addEventListener: () => {},
    CAN: {}
  };

  const documentObj = {
    getElementById: (id) => elements[id] || new MockElement(id),
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
    createElement: () => new MockElement()
  };

  const sandbox = {
    window: windowObj,
    document: documentObj,
    $: (id) => documentObj.getElementById(id),
    $$: (sel) => documentObj.querySelectorAll(sel),
    Fmt: { initials: () => 'AD' },
    Auth: { logout: () => {} },
    Staff: { load: () => console.log("   [LOADER CALL] Staff.load() executed!") },
    Dashboard: { load: () => console.log("   [LOADER CALL] Dashboard.load() executed!") },
    setTimeout: (fn) => fn(),
    console: console,
    navItems,
    elements
  };

  vm.createContext(sandbox);
  // Execute app.js and expose App on sandbox
  vm.runInContext(appJsCode + '\nthis.App = App;\nthis.ROLE = ROLE;', sandbox);
  return sandbox;
}

const roles = [
  'Hospital_Admin',
  'Doctor',
  'Receptionist',
  'Lab_Technician',
  'Pharmacist',
  'Accountant'
];

console.log("\n--- TASK 2: Testing Role Nav & CAN Permissions ---");

const sandbox2 = createSandbox();
roles.forEach(role => {
  sandbox2.App.applyRoleNav(role);
  
  const canAddStaff = sandbox2.window.CAN.addStaff;
  const canEditStaff = sandbox2.window.CAN.editStaff;
  const canDeleteStaff = sandbox2.window.CAN.deleteStaff;
  
  const staffNavItem = sandbox2.navItems.find(i => i.dataset.page === 'staff');
  const staffNavDisplay = staffNavItem.style.display;
  
  console.log(`Role: ${role.padEnd(16)} | nav-item display: '${staffNavDisplay || 'block'}' | CAN.addStaff: ${canAddStaff} | CAN.editStaff: ${canEditStaff} | CAN.deleteStaff: ${canDeleteStaff}`);
});

console.log("\n--- TASK 3: Testing SPA Router Blocking/Redirecting on /staff ---");

roles.forEach(role => {
  const sb = createSandbox();
  sb.window.location.pathname = '/staff';
  console.log(`\nTesting Role: ${role}`);
  sb.App.init({ username: 'testuser', role: role });
  console.log(`Result: App.currentPage = '${sb.App.currentPage}'`);
  
  if (role !== 'Hospital_Admin' && sb.App.currentPage === 'staff') {
    console.log(`❌ FAIL: Non-admin role '${role}' navigated to 'staff' page without block or redirect!`);
  } else if (role !== 'Hospital_Admin' && sb.App.currentPage !== 'staff') {
    console.log(`✅ PASS: Non-admin role '${role}' blocked/redirected to '${sb.App.currentPage}'`);
  } else if (role === 'Hospital_Admin' && sb.App.currentPage === 'staff') {
    console.log(`✅ PASS: Admin role allowed on 'staff' page`);
  }
});
