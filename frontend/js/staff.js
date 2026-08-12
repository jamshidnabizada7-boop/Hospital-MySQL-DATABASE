/**
 * staff.js — Centralized Staff & Employee Management
 * Handles listing, searching, filtering, and CRUD operations for all hospital staff
 * (Doctors, Receptionists, Pharmacists, Lab Technicians, Accountants).
 */
const Staff = {
  page: 1,
  search: '',
  roleFilter: '',
  editId: null,
  editIsDoctor: false,
  departments: [],
  specializations: [],

  /**
   * Load staff metadata and records from backend endpoints
   */
  async load(page = 1) {
    this.page = page;
    const searchEl = $('staff-search');
    const filterEl = $('staff-role-filter');
    if (searchEl) this.search = searchEl.value.trim();
    if (filterEl) this.roleFilter = filterEl.value;

    const tableEl = $('staff-table');
    if (tableEl) {
      tableEl.innerHTML = '<tr><td colspan="7" class="table-empty"><div class="spinner"></div></td></tr>';
    }

    await this.loadMeta();

    try {
      let allStaff = [];
      let totalCount = 0;

      if (this.roleFilter === 'Doctor') {
        // Fetch doctors and employees with role Doctor
        const [docRes, empRes] = await Promise.all([
          Api.getQ('/doctors', { search: this.search, page: 1, limit: 100 }),
          Api.getQ('/employees', { search: this.search, role: 'Doctor', page: 1, limit: 100 })
        ]);

        const doctors = (docRes.success && docRes.data) ? docRes.data.map(d => ({
          Emp_ID: 'doc_' + d.Doctor_ID,
          Doctor_ID: d.Doctor_ID,
          is_doctor: true,
          First_Name: d.First_Name,
          Last_Name: d.Last_Name,
          Gender: d.Gender,
          Date_Of_Birth: d.Date_Of_Birth,
          Job_Title: 'Doctor',
          Role_Name: 'Doctor',
          Dept_Name: d.Dept_Name,
          Phone: d.Phone,
          Email: d.Email,
          Username: d.Username || ('dr_' + (d.First_Name || '').toLowerCase()),
          Hire_Date: d.Joined_Date || d.Created_At,
          Is_Active: d.Is_Active
        })) : [];

        const empDocs = (empRes.success && empRes.data) ? empRes.data.map(e => ({
          ...e,
          is_doctor: true
        })) : [];

        // Deduplicate doctors by User_ID if present or name/email
        const doctorMap = new Map();
        [...doctors, ...empDocs].forEach(item => {
          const key = item.User_ID ? `u_${item.User_ID}` : `n_${item.First_Name}_${item.Last_Name}`;
          if (!doctorMap.has(key)) doctorMap.set(key, item);
        });

        allStaff = Array.from(doctorMap.values());
        totalCount = allStaff.length;

        const limit = 15;
        const startIndex = (page - 1) * limit;
        const paginatedData = allStaff.slice(startIndex, startIndex + limit);

        this.render({ data: paginatedData, total: totalCount, page, limit: 15 });
        return;
      }

      if (this.roleFilter && this.roleFilter !== 'Doctor') {
        // Specific non-doctor role
        const res = await Api.getQ('/employees', {
          search: this.search,
          role: this.roleFilter,
          page,
          limit: 15
        });

        if (!res.success) {
          Toast.error(res.message || 'Failed to load staff list');
          this.render({ data: [], total: 0, page: 1, limit: 15 });
          return;
        }
        this.render(res);
        return;
      }

      // All Roles selected ("")
      const [empRes, docRes] = await Promise.all([
        Api.getQ('/employees', { search: this.search, page: 1, limit: 100 }),
        Api.getQ('/doctors', { search: this.search, page: 1, limit: 100 })
      ]);

      const employees = (empRes.success && empRes.data) ? empRes.data : [];
      const doctors = (docRes.success && docRes.data) ? docRes.data.map(d => ({
        Emp_ID: 'doc_' + d.Doctor_ID,
        Doctor_ID: d.Doctor_ID,
        is_doctor: true,
        First_Name: d.First_Name,
        Last_Name: d.Last_Name,
        Gender: d.Gender,
        Date_Of_Birth: d.Date_Of_Birth,
        Job_Title: 'Doctor',
        Role_Name: 'Doctor',
        Dept_Name: d.Dept_Name,
        Phone: d.Phone,
        Email: d.Email,
        Username: d.Username || ('dr_' + (d.First_Name || '').toLowerCase()),
        Hire_Date: d.Joined_Date || d.Created_At,
        Is_Active: d.Is_Active,
        User_ID: d.User_ID
      })) : [];

      // Combine employees and doctors, removing duplicates if a user exists in both
      const mergedMap = new Map();
      employees.forEach(e => {
        const key = e.User_ID ? `u_${e.User_ID}` : `e_${e.Emp_ID}`;
        mergedMap.set(key, { ...e, is_doctor: (e.Role_Name === 'Doctor' || e.Job_Title === 'Doctor') });
      });
      doctors.forEach(d => {
        const key = d.User_ID ? `u_${d.User_ID}` : `d_${d.Doctor_ID}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, d);
        }
      });

      allStaff = Array.from(mergedMap.values());

      // Filter by search term if provided
      if (this.search) {
        const term = this.search.toLowerCase();
        allStaff = allStaff.filter(s =>
          (s.First_Name && s.First_Name.toLowerCase().includes(term)) ||
          (s.Last_Name && s.Last_Name.toLowerCase().includes(term)) ||
          (`${s.First_Name} ${s.Last_Name}`.toLowerCase().includes(term)) ||
          (s.Email && s.Email.toLowerCase().includes(term)) ||
          (s.Phone && s.Phone.includes(term)) ||
          (s.Role_Name && s.Role_Name.toLowerCase().includes(term)) ||
          (s.Job_Title && s.Job_Title.toLowerCase().includes(term)) ||
          (s.Username && s.Username.toLowerCase().includes(term)) ||
          (s.Dept_Name && s.Dept_Name.toLowerCase().includes(term))
        );
      }

      totalCount = allStaff.length;
      const limit = 15;
      const startIndex = (page - 1) * limit;
      const paginatedData = allStaff.slice(startIndex, startIndex + limit);

      this.render({ data: paginatedData, total: totalCount, page, limit: 15 });
    } catch (err) {
      Toast.error('Error loading staff members: ' + err.message);
      this.render({ data: [], total: 0, page: 1, limit: 15 });
    }
  },

  /**
   * Fetch metadata for department and specialization select boxes
   */
  async loadMeta() {
    if (this.departments.length && this.specializations.length) return;
    try {
      const [dr, sr] = await Promise.all([
        Api.get('/employees/meta/departments'),
        Api.get('/doctors/meta/specializations')
      ]);
      if (dr.success && dr.data) this.departments = dr.data;
      if (sr.success && sr.data) this.specializations = sr.data;
    } catch (err) {
      console.error('Failed to load staff metadata', err);
    }
  },

  /**
   * Render staff table rows and pagination controls
   */
  render({ data, total, page, limit = 15 }) {
    const tableEl = $('staff-table');
    const countEl = $('staff-count');

    if (!data || !data.length) {
      if (tableEl) tableEl.innerHTML = '<tr><td colspan="7" class="table-empty">No staff members found</td></tr>';
      renderPagination('staff-pagination', { page: 1, total: 0, limit }, 'Staff.load');
      if (countEl) countEl.textContent = '0 staff members';
      return;
    }

    const currentUser = (typeof Auth !== 'undefined' && Auth.user) ? Auth.user : ((typeof App !== 'undefined' && App.user) ? App.user : null);
    const currentUserId = currentUser ? (currentUser.id || currentUser.user_id) : null;
    const currentEmpId  = currentUser ? currentUser.employeeId : null;
    const currentDocId  = currentUser ? currentUser.doctorId : null;
    const currentUsername = currentUser ? currentUser.username : null;

    const rowsHtml = data.map(s => {
      const isDoc = s.is_doctor || s.Role_Name === 'Doctor' || s.Job_Title === 'Doctor' || Boolean(s.Doctor_ID);
      const roleName = s.Role_Name || s.Job_Title || (isDoc ? 'Doctor' : 'Staff');

      // Check if row corresponds to logged-in user to prevent self-deletion UI
      const isSelf = Boolean(
        (currentUserId && s.User_ID && parseInt(s.User_ID) === parseInt(currentUserId)) ||
        (currentEmpId && s.Emp_ID && parseInt(s.Emp_ID) === parseInt(currentEmpId)) ||
        (currentDocId && s.Doctor_ID && parseInt(s.Doctor_ID) === parseInt(currentDocId)) ||
        (currentUsername && (s.Username || s.username) && currentUsername.toLowerCase() === (s.Username || s.username).toLowerCase())
      );

      // Pick badge styling
      let badgeClass = 'badge-success';
      if (roleName === 'Doctor') badgeClass = 'badge-info';
      else if (roleName === 'Hospital_Admin' || roleName === 'Admin') badgeClass = 'badge-purple';
      else if (roleName === 'Lab_Technician' || roleName === 'Lab Tech') badgeClass = 'badge-warning';
      else if (roleName === 'Pharmacist') badgeClass = 'badge-primary';

      const avatarBg = isDoc ? '#7c3aed' : '#2563eb';
      const fullName = `${s.First_Name || ''} ${s.Last_Name || ''}`.trim() || 'Unknown';
      const username = s.Username || s.username || '—';
      const rawId = s.Emp_ID || s.Doctor_ID;
      const numId = typeof rawId === 'string' && rawId.startsWith('doc_') ? rawId.replace('doc_', '') : rawId;

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="user-avatar" style="background:${avatarBg};width:34px;height:34px;font-size:12px;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:600">
                ${Fmt.initials(fullName)}
              </div>
              <div>
                <div class="text-bold">${fullName}</div>
                <div class="text-sm text-gray">User: <code>${username}</code></div>
              </div>
            </div>
          </td>
          <td><span class="badge ${badgeClass}">${roleName}</span></td>
          <td>${s.Dept_Name || '—'}</td>
          <td>
            <div>${s.Phone || '—'}</div>
            <div class="text-sm text-gray">${s.Email || '—'}</div>
          </td>
          <td>${Fmt.date(s.Hire_Date || s.Joined_Date || s.Created_At)}</td>
          <td>${s.Is_Active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}</td>
          <td>
            <div style="display:flex;gap:6px">
              ${canDo('editStaff') ? `<button class="btn btn-ghost btn-sm" onclick="Staff.openEdit(${numId}, ${isDoc})" title="Edit"><i data-lucide="pencil" width="16" height="16"></i></button>` : ''}
              ${canDo('deleteStaff') && !isSelf ? `<button class="btn btn-ghost btn-sm text-danger" onclick="Staff.delete(${numId}, ${isDoc})" title="Delete"><i data-lucide="trash-2" width="16" height="16"></i></button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');

    if (tableEl) tableEl.innerHTML = rowsHtml;
    renderPagination('staff-pagination', { page, total, limit }, 'Staff.load');
    if (countEl) countEl.textContent = `${total} staff member${total !== 1 ? 's' : ''}`;

    setTimeout(() => {
      if (window.lucide) window.lucide.createIcons();
    }, 50);
  },

  /**
   * Populate department and specialization dropdowns in staff form
   */
  populateFormSelects() {
    const form = $('staff-form');
    if (!form) return;
    const dSel = form.querySelector('[name=dept_id]');
    const sSel = form.querySelector('[name=spec_id]');

    if (dSel) {
      dSel.innerHTML = '<option value="">Select Department</option>' +
        this.departments.map(d => `<option value="${d.Dept_ID}">${d.Dept_Name}</option>`).join('');
    }
    if (sSel) {
      sSel.innerHTML = '<option value="">Select Specialization</option>' +
        this.specializations.map(s => `<option value="${s.Spec_ID}">${s.Spec_Name}</option>`).join('');
    }
  },

  /**
   * Triggered when selecting role dropdown in staff form
   */
  onRoleChange() {
    const roleSelect = $('staff-role-select');
    const role = roleSelect ? roleSelect.value : '';
    const isDoc = role === 'Doctor';

    const docContainer = $('doctor-fields-container');
    const empContainer = $('employee-fields-container');
    const deptGroup    = $('dept-group');
    const form         = $('staff-form');
    const deptSelect   = form ? form.querySelector('[name=dept_id]') : null;

    if (docContainer) docContainer.style.display = isDoc ? 'block' : 'none';
    if (empContainer) empContainer.style.display = isDoc ? 'none' : 'block';

    if (deptGroup) {
      deptGroup.style.display = isDoc ? 'block' : 'none';
    }
    if (deptSelect) {
      if (isDoc) {
        deptSelect.setAttribute('required', 'required');
      } else {
        deptSelect.removeAttribute('required');
        deptSelect.value = '';
      }
    }
  },

  /**
   * Open modal to add a new staff member
   */
  openAdd() {
    this.editId = null;
    this.editIsDoctor = false;
    resetForm('staff-form');
    const form = $('staff-form');
    if (form) {
      if (form.querySelector('[name=new_password]')) form.querySelector('[name=new_password]').value = '';
      if (form.querySelector('[name=password]')) form.querySelector('[name=password]').value = '';
    }
    const titleEl = $('staff-modal-title');
    if (titleEl) titleEl.textContent = 'Add New Staff Member';

    this.populateFormSelects();
    this.onRoleChange();
    Modal.open('staff-modal');
  },

  /**
   * Open modal to edit an existing staff member
   */
  async openEdit(id, isDoctor = false) {
    this.editId = id;
    this.editIsDoctor = isDoctor;
    resetForm('staff-form');

    const titleEl = $('staff-modal-title');
    if (titleEl) titleEl.textContent = 'Edit Staff Member';

    this.populateFormSelects();

    const endpoint = isDoctor ? `/doctors/${id}` : `/employees/${id}`;
    const res = await Api.get(endpoint);

    if (!res.success || !res.data) {
      Toast.error(res.message || 'Failed to load staff details');
      return;
    }

    const data = res.data;
    const form = $('staff-form');
    if (!form) return;

    form.querySelector('[name=first_name]').value = data.First_Name || '';
    form.querySelector('[name=last_name]').value  = data.Last_Name || '';
    if (form.querySelector('[name=gender]')) form.querySelector('[name=gender]').value = data.Gender || 'Male';
    if (form.querySelector('[name=phone]')) form.querySelector('[name=phone]').value = data.Phone || '';
    if (form.querySelector('[name=email]')) form.querySelector('[name=email]').value = data.Email || '';
    if (form.querySelector('[name=new_password]')) form.querySelector('[name=new_password]').value = '';
    if (form.querySelector('[name=password]')) form.querySelector('[name=password]').value = '';

    if (data.Date_Of_Birth) {
      const dob = new Date(data.Date_Of_Birth).toISOString().slice(0, 10);
      if (form.querySelector('[name=date_of_birth]')) form.querySelector('[name=date_of_birth]').value = dob;
    }

    const roleSelect = $('staff-role-select');
    if (roleSelect) {
      roleSelect.value = isDoctor ? 'Doctor' : (data.Role_Name || data.Job_Title || 'Receptionist');
    }
    this.onRoleChange();

    if (form.querySelector('[name=dept_id]')) {
      form.querySelector('[name=dept_id]').value = isDoctor ? (data.Dept_ID || '') : '';
    }

    if (isDoctor) {
      if (form.querySelector('[name=spec_id]')) form.querySelector('[name=spec_id]').value = data.Spec_ID || '';
      if (form.querySelector('[name=license_number]')) form.querySelector('[name=license_number]').value = data.License_Number || '';
      if (form.querySelector('[name=experience_years]')) form.querySelector('[name=experience_years]').value = data.Experience_Years || 0;
      if (form.querySelector('[name=consultation_fee]')) form.querySelector('[name=consultation_fee]').value = data.Consultation_Fee || 0;
      if (form.querySelector('[name=qualification]')) form.querySelector('[name=qualification]').value = data.Qualification || '';
    } else {
      if (form.querySelector('[name=salary]')) form.querySelector('[name=salary]').value = data.Salary || 0;
    }

    Modal.open('staff-modal');
  },

  /**
   * Save form data (Create or Update)
   */
  async save() {
    const data = serializeForm('staff-form');
    const isDoc = data.role === 'Doctor';

    if (!data.first_name || !data.last_name || !data.role || (isDoc && !data.dept_id) || !data.phone || !data.email) {
      Toast.warning(`Please fill in all required fields (First Name, Last Name, Role${isDoc ? ', Department' : ''}, Phone, Email)`);
      return;
    }

    if (isDoc && !data.license_number) {
      Toast.warning('License number is required for Doctor staff members');
      return;
    }

    const customPassword = data.new_password || data.password;
    let res;

    if (this.editId) {
      // Update existing record
      const endpoint = this.editIsDoctor ? `/doctors/${this.editId}` : `/employees/${this.editId}`;
      const payload = isDoc ? {
        first_name: data.first_name,
        last_name: data.last_name,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        dept_id: data.dept_id,
        spec_id: data.spec_id,
        license_number: data.license_number,
        qualification: data.qualification,
        experience_years: data.experience_years,
        consultation_fee: data.consultation_fee,
        phone: data.phone,
        email: data.email
      } : {
        first_name: data.first_name,
        last_name: data.last_name,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        job_title: data.role,
        dept_id: null,
        phone: data.phone,
        email: data.email,
        salary: data.salary
      };

      if (customPassword && customPassword.trim()) {
        payload.new_password = customPassword.trim();
        payload.password = customPassword.trim();
      }

      res = await Api.put(endpoint, payload);
    } else {
      // Create new record
      if (isDoc) {
        const docPayload = {
          first_name: data.first_name,
          last_name: data.last_name,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          dept_id: data.dept_id,
          spec_id: data.spec_id,
          license_number: data.license_number,
          qualification: data.qualification,
          experience_years: data.experience_years,
          consultation_fee: data.consultation_fee,
          phone: data.phone,
          email: data.email
        };
        if (customPassword && customPassword.trim()) {
          docPayload.password = customPassword.trim();
          docPayload.new_password = customPassword.trim();
        }
        res = await Api.post('/doctors', docPayload);
      } else {
        const empPayload = {
          first_name: data.first_name,
          last_name: data.last_name,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          job_title: data.role,
          phone: data.phone,
          email: data.email,
          dept_id: null,
          salary: data.salary,
          hire_date: new Date().toISOString().slice(0, 10)
        };
        if (customPassword && customPassword.trim()) {
          empPayload.password = customPassword.trim();
          empPayload.new_password = customPassword.trim();
        }
        res = await Api.post('/employees', empPayload);
      }
    }

    if (res.success) {
      const msg = this.editId
        ? 'Staff member updated successfully'
        : `Staff member added! Auto-provisioned account: ${res.credentials?.username || res.username || 'created'} with password ${customPassword && customPassword.trim() ? customPassword.trim() : 'admin123'}`;
      Toast.success(msg);
      Modal.close('staff-modal');
      this.load(this.page);
    } else {
      Toast.error(res.message || 'Error saving staff member');
    }
  },

  /**
   * Delete staff member
   */
  async delete(id, isDoctor = false) {
    if (!confirm('Are you sure you want to delete this staff member? This will also remove their user account.')) return;

    const endpoint = isDoctor ? `/doctors/${id}` : `/employees/${id}`;
    const res = await Api.delete(endpoint);

    if (res.success) {
      Toast.success('Staff member removed successfully');
      this.load(this.page);
    } else {
      Toast.error(res.message || 'Failed to delete staff member');
    }
  }
};
