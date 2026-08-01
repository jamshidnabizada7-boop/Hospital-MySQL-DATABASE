/**
 * app.js — Shell: nav routing, sidebar, topbar
 */
const App = {
  currentPage: 'dashboard',

  init(user) {
    // Populate user info in sidebar
    $('user-name').textContent  = user.Full_Name || user.name || user.username;
    $('user-role').textContent  = user.Role_Name || user.role;
    $('user-avatar').textContent= Fmt.initials(user.Full_Name || user.name || '');

    // Nav click handlers
    $$('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.page));
    });

    // Logout
    $('logout-btn').addEventListener('click', () => Auth.logout());

    // Load dashboard
    this.navigate('dashboard');
    Dashboard.load();
  },

  navigate(page) {
    if (this.currentPage === page && page !== 'dashboard') return;
    this.currentPage = page;

    // Update nav
    $$('.nav-item').forEach(i => i.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (active) active.classList.add('active');

    // Show page section
    $$('.page-section').forEach(s => s.classList.remove('active'));
    const section = $(`page-${page}`);
    if (section) section.classList.add('active');

    // Update title
    const titles = {
      dashboard:'Dashboard', patients:'Patients', doctors:'Doctors',
      appointments:'Appointments', billing:'Billing', pharmacy:'Pharmacy',
      laboratory:'Laboratory', reports:'Reports',
    };
    $('page-title').textContent = titles[page] || page;

    // Lazy-load page data
    const loaders = {
      dashboard:    () => Dashboard.load(),
      patients:     () => Patients.load(),
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
