/**
 * app.js — Shell: navigation, role-based UI visibility
 */
const ROLE = {
  ADMIN:        'Hospital_Admin',
  DOCTOR:       'Doctor',
  RECEPTIONIST: 'Receptionist',
  LAB_TECH:     'Lab_Technician',
  PHARMACIST:   'Pharmacist',
  ACCOUNTANT:   'Accountant',
};

const App = {
  currentPage: 'dashboard',
  user: null,

  init(user) {
    this.user = user;

    // Populate sidebar user info
    $('user-name').textContent   = user.name || user.username;
    $('user-role').textContent   = this.roleFriendly(user.role);
    $('user-avatar').textContent = Fmt.initials(user.name || '');

    // Apply role-based nav visibility
    this.applyRoleNav(user.role);

    // Nav click handlers
    $$('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.page));
    });

    $('logout-btn').addEventListener('click', () => Auth.logout());

    // Sidebar accordion logic
    $$('.nav-section').forEach(sec => {
      sec.style.cursor = 'pointer';
      sec.title = 'Toggle Section';
      sec.dataset.collapsed = 'false';
      if(!sec.querySelector('.toggle-icon')) {
        const icon = document.createElement('span');
        icon.className = 'toggle-icon';
        icon.style.float = 'right';
        icon.style.transition = 'transform 0.2s';
        icon.textContent = '▼';
        sec.appendChild(icon);
      }
      sec.addEventListener('click', () => {
        const icon = sec.querySelector('.toggle-icon');
        const isCollapsing = sec.dataset.collapsed === 'false';
        sec.dataset.collapsed = isCollapsing ? 'true' : 'false';
        
        if (icon) icon.style.transform = isCollapsing ? 'rotate(-90deg)' : '';
        
        let next = sec.nextElementSibling;
        while (next && next.classList.contains('nav-item')) {
          if (isCollapsing) next.classList.add('hidden');
          else next.classList.remove('hidden');
          next = next.nextElementSibling;
        }
      });
    });

    // Start on URL path or dashboard
    const path = window.location.pathname.replace(/^\//, '') || 'dashboard';
    const validPages = ['dashboard', 'patients', 'doctors', 'appointments', 'billing', 'pharmacy', 'laboratory', 'reports'];
    const startPage = validPages.includes(path) ? path : 'dashboard';
    this.navigate(startPage, true);

    // Handle back/forward navigation
    window.addEventListener('popstate', (e) => {
      const p = e.state?.page || window.location.pathname.replace(/^\//, '') || 'dashboard';
      if (validPages.includes(p)) this.navigate(p, true);
    });
  },

  roleFriendly(role) {
    const map = {
      [ROLE.ADMIN]:        'Administrator',
      [ROLE.DOCTOR]:       'Doctor',
      [ROLE.RECEPTIONIST]: 'Receptionist',
      [ROLE.LAB_TECH]:     'Lab Technician',
      [ROLE.PHARMACIST]:   'Pharmacist',
      [ROLE.ACCOUNTANT]:   'Accountant',
    };
    return map[role] || role;
  },

  // Show/hide nav items and action buttons based on role
  applyRoleNav(role) {
    const isAdmin        = role === ROLE.ADMIN;
    const isDoctor       = role === ROLE.DOCTOR;
    const isReceptionist = role === ROLE.RECEPTIONIST;
    const isLabTech      = role === ROLE.LAB_TECH;
    const isPharmacist   = role === ROLE.PHARMACIST;
    const isAccountant   = role === ROLE.ACCOUNTANT;

    // Pages each role can access
    const pageAccess = {
      dashboard:    true,
      patients:     isAdmin || isReceptionist || isDoctor || isLabTech || isAccountant,
      doctors:      isAdmin || isReceptionist || isDoctor,
      appointments: isAdmin || isReceptionist || isDoctor || isLabTech,
      billing:      isAdmin || isAccountant   || isDoctor || isReceptionist,
      pharmacy:     isAdmin || isPharmacist   || isDoctor,
      laboratory:   isAdmin || isLabTech      || isDoctor || isReceptionist,
      reports:      isAdmin || isAccountant,
    };

    // Show/hide nav items
    $$('.nav-item[data-page]').forEach(item => {
      const page = item.dataset.page;
      if (!pageAccess[page]) item.style.display = 'none';
    });

    // Store permissions globally for JS checks
    window.CAN = {
      // Patients
      addPatient:       isAdmin || isReceptionist,
      editPatient:      isAdmin || isReceptionist,
      deletePatient:    isAdmin,
      // Doctors
      addDoctor:        isAdmin,
      editDoctor:       isAdmin || isDoctor,
      deleteDoctor:     isAdmin,
      addSchedule:      isAdmin || isDoctor,
      // Appointments
      bookAppointment:  isAdmin || isReceptionist,
      cancelAppointment:isAdmin || isReceptionist,
      completeAppt:     isAdmin || isDoctor,
      generateBill:     isAdmin || isAccountant,
      // Billing
      processPayment:   isAdmin || isAccountant,
      // Pharmacy
      addMedicine:      isAdmin || isPharmacist,
      editMedicine:     isAdmin || isPharmacist,
      updateStock:      isAdmin || isPharmacist,
      addInventory:     isAdmin || isPharmacist,
      addPharmacy:      isAdmin || isPharmacist,
      // Lab
      createLabOrder:   isAdmin || isDoctor,
      addLabResult:     isAdmin || isLabTech,
      // Admin only
      isAdmin,
    };

    // Apply UI visibility
    if (typeof applyRoleUI === 'function') setTimeout(applyRoleUI, 100);

    // Init notifications
    if (typeof Notifications !== 'undefined') Notifications.init();
  },

  // Refresh current page data without full reload
  refreshCurrent() {
    const btn = $('btn-refresh');
    if (btn) { btn.style.transform = 'rotate(360deg)'; btn.style.transition = 'transform 0.5s'; setTimeout(() => { btn.style.transform = ''; btn.style.transition = ''; }, 500); }
    const loaders = {
      dashboard:    () => Dashboard.load(),
      patients:     () => Patients.load(Patients.page),
      doctors:      () => Doctors.load(Doctors.page),
      appointments: () => Appointments.load(Appointments.page),
      billing:      () => Billing.load(Billing.page),
      pharmacy:     () => { Pharmacy.loadMedicines(Pharmacy.page); Pharmacy.loadInventory(1); },
      laboratory:   () => Laboratory.load(Laboratory.page),
      reports:      () => Reports.refresh(),
    };
    if (loaders[this.currentPage]) {
      loaders[this.currentPage]();
      Toast.info(`${$('page-title').textContent} refreshed`);
    }
  },

  navigate(page, skipPushState = false) {
    this.currentPage = page;

    if (!skipPushState && window.location.pathname !== '/' + page) {
      window.history.pushState({ page }, '', '/' + page);
    }

    $$('.nav-item').forEach(i => i.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (active) active.classList.add('active');

    $$('.page-section').forEach(s => s.classList.remove('active'));
    const section = $(`page-${page}`);
    if (section) section.classList.add('active');

    const titles = {
      dashboard:'Dashboard', patients:'Patients', doctors:'Doctors',
      appointments:'Appointments', billing:'Billing', pharmacy:'Pharmacy',
      laboratory:'Laboratory', reports:'Reports',
    };
    $('page-title').textContent = titles[page] || page;

    const loaders = {
      dashboard:    () => Dashboard.load(),
      patients:     () => { Patients.load(); if (typeof initPatientsSearch === 'function') initPatientsSearch(); },
      doctors:      () => Doctors.load(),
      appointments: () => Appointments.load(),
      billing:      () => Billing.load(),
      pharmacy:     () => Pharmacy.load(),
      laboratory:   () => Laboratory.load(),
      reports:      () => Reports.load(),
    };
    if (loaders[page]) loaders[page]();
  },
};

// Expose globally so other modules can check
function canDo(action) {
  return window.CAN && window.CAN[action] === true;
}
