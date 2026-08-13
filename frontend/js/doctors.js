/**
 * doctors.js
 */
const Doctors = {
  page: 1, search: '', editId: null,
  departments: [], specializations: [],

  async load(page=1) {
    this.page = page;
    loading('doctors-table');
    await this.loadMeta();
    const deptId = $('doctors-dept-filter') ? $('doctors-dept-filter').value : '';
    const specId = $('doctors-spec-filter') ? $('doctors-spec-filter').value : '';
    const res = await Api.getQ('/doctors', { search: this.search, dept_id: deptId, spec_id: specId, page, limit: 15 });
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
      this.populateDeptFilter();
    }
  },

  populateDeptFilter() {
    const selDept = $('doctors-dept-filter');
    const selSpec = $('doctors-spec-filter');
    if (selDept) {
      selDept.innerHTML = `<option value="">All Departments</option>` +
        this.departments.map(d=>`<option value="${d.Dept_ID}">${d.Dept_Name}</option>`).join('');
    }
    if (selSpec) {
      selSpec.innerHTML = `<option value="">All Specializations</option>` +
        this.specializations.map(s=>`<option value="${s.Spec_ID}">${s.Spec_Name}</option>`).join('');
    }
  },

  render({ data, total, page, limit=15 }) {
    if (!data.length) {
      setHTML('doctors-table', '<tr><td colspan="8" class="table-empty">No doctors found</td></tr>');
      renderPagination('doctors-pagination', {page,total,limit}, `p=>Doctors.load(p)`);
      return;
    }
    const rows = data.map(d => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="user-avatar" style="background:#7c3aed;width:34px;height:34px;font-size:12px">${Fmt.initials(d.First_Name+' '+d.Last_Name)}</div>
            <div>
              <div class="text-bold">Dr. ${d.First_Name} ${d.Last_Name}</div>
              <div class="text-sm text-gray">${d.License_Number}</div>
            </div>
          </div>
        </td>
        <td>${d.Dept_Name}</td>
        <td>${d.Spec_Name}</td>
        <td>${d.Qualification||'—'}</td>
        <td>${d.Experience_Years} yrs</td>
        <td>${Fmt.currency(d.Consultation_Fee)}</td>
        <td>${d.Available_Today ? '<span class="badge badge-success">Available</span>' : '<span class="badge badge-gray">Not Today</span>'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="Doctors.viewSchedule(${d.Doctor_ID},'Dr. ${d.First_Name} ${d.Last_Name}')">Schedule</button>
            ${canDo('editDoctor') ? `<button class="btn btn-ghost btn-sm" onclick="Doctors.openEdit(${d.Doctor_ID})" title="Edit"><i data-lucide="pencil" width="16" height="16"></i></button>` : ''}
            ${canDo('deleteDoctor') ? `<button class="btn btn-ghost btn-sm text-danger" onclick="Doctors.delete(${d.Doctor_ID})" title="Delete"><i data-lucide="trash-2" width="16" height="16"></i></button>` : ''}
          </div>
        </td>
      </tr>`).join('');
    setHTML('doctors-table', rows);
    renderPagination('doctors-pagination', {page,total,limit}, `p=>Doctors.load(p)`);
    $('doctors-count').textContent = `${total} doctor${total!==1?'s':''}`;
  },

  async delete(id) {
    if (!confirm('Are you sure you want to delete this doctor?')) return;
    const res = await Api.delete(`/doctors/${id}`);
    if (res.success) {
      Toast.success('Doctor deleted');
      this.load(this.page);
    } else {
      Toast.error(res.message);
    }
  },

  openAdd() {
    this.editId = null;
    resetForm('doctor-form');
    $('doctor-modal-title').textContent = 'Add New Doctor';
    this.populateFormSelects();
    Modal.open('doctor-modal');
  },

  async openEdit(id) {
    this.editId = id;
    const res = await Api.get(`/doctors/${id}`);
    if (!res.success) { Toast.error(res.message); return; }
    const d = res.data;
    this.populateFormSelects();
    const f = $('doctor-form');
    f.querySelector('[name=first_name]').value     = d.First_Name||'';
    f.querySelector('[name=last_name]').value      = d.Last_Name||'';
    f.querySelector('[name=gender]').value         = d.Gender||'';
    f.querySelector('[name=date_of_birth]').value  = d.Date_Of_Birth?.substring(0,10)||'';
    f.querySelector('[name=dept_id]').value        = d.Dept_ID||'';
    f.querySelector('[name=spec_id]').value        = d.Spec_ID||'';
    f.querySelector('[name=license_number]').value = d.License_Number||'';
    f.querySelector('[name=qualification]').value  = d.Qualification||'';
    f.querySelector('[name=experience_years]').value = d.Experience_Years||0;
    f.querySelector('[name=consultation_fee]').value = d.Consultation_Fee||0;
    f.querySelector('[name=phone]').value          = d.Phone||'';
    f.querySelector('[name=email]').value          = d.Email||'';
    $('doctor-modal-title').textContent = 'Edit Doctor';
    Modal.open('doctor-modal');
  },

  populateFormSelects() {
    const dSel = $('doctor-form')?.querySelector('[name=dept_id]');
    const sSel = $('doctor-form')?.querySelector('[name=spec_id]');
    if (dSel) dSel.innerHTML = `<option value="">Select Department</option>` +
      this.departments.map(d=>`<option value="${d.Dept_ID}">${d.Dept_Name}</option>`).join('');
    if (sSel) sSel.innerHTML = `<option value="">Select Specialization</option>` +
      this.specializations.map(s=>`<option value="${s.Spec_ID}">${s.Spec_Name}</option>`).join('');
  },

  async save() {
    const data = serializeForm('doctor-form');
    if (!data.first_name || !data.dept_id || !data.license_number) {
      Toast.warning('Fill required fields'); return;
    }
    const res = this.editId
      ? await Api.put(`/doctors/${this.editId}`, data)
      : await Api.post('/doctors', data);
    if (res.success) {
      Toast.success(this.editId ? 'Doctor updated' : 'Doctor added');
      Modal.close('doctor-modal');
      this.load(this.page);
    } else Toast.error(res.message);
  },

  async viewSchedule(id, name) {
    $('sched-modal-title').textContent = `Schedule — ${name}`;
    setHTML('sched-content', '<div class="spinner"></div>');
    Modal.open('sched-modal');

    const today = new Date().toISOString().substring(0,10);
    const end   = new Date(Date.now()+30*864e5).toISOString().substring(0,10);
    const res   = await Api.getQ(`/doctors/${id}/schedule`, { from: today, to: end });
    if (!res.success) { setHTML('sched-content',`<p class="text-danger">${res.message}</p>`); return; }
    if (!res.data.length) {
      setHTML('sched-content','<p class="text-gray text-center mt-4">No schedule in next 30 days</p>');
      return;
    }

    // Group by date
    const byDate = {};
    for (const r of res.data) {
      const d = r.Work_Date?.substring(0,10);
      if (!byDate[d]) byDate[d] = { status: r.Status, slots:[] };
      if (r.Slot_ID) byDate[d].slots.push(r);
    }
    const html = Object.entries(byDate).map(([date, {status, slots}]) => `
      <div class="card mb-3">
        <div class="card-header">
          <div class="card-title">${Fmt.date(date)}</div>
          ${Fmt.status(status)}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Slot</th><th>Status</th><th>Patient</th></tr></thead>
            <tbody>
              ${slots.length
                ? slots.map(s=>`
                  <tr>
                    <td>${Fmt.time(s.Slot_Start)} – ${Fmt.time(s.Slot_End)}</td>
                    <td>${Fmt.status(s.Slot_Status)}</td>
                    <td>${s.Patient_Name||'—'}</td>
                  </tr>`).join('')
                : '<tr><td colspan="3" class="table-empty">No slots</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>`).join('');
    setHTML('sched-content', html);
  },

  openAddSchedule() {
    // Reset
    $('schedule-doctor-id').value     = '';
    $('schedule-doctor-search').value = '';
    setHTML('schedule-doctor-list', '');
    setHTML('schedule-doctor-display', '');
    resetForm('schedule-form');
    Modal.open('add-schedule-modal');
  },

  searchDoctorForSchedule: debounce(async () => {
    const q = $('schedule-doctor-search').value.trim();
    if (q.length < 2) { setHTML('schedule-doctor-list', ''); return; }
    const res = await Api.getQ('/doctors', { search: q, limit: 8 });
    if (!res.success || !res.data.length) {
      setHTML('schedule-doctor-list', `<div class="search-empty">No doctors found for "${q}"</div>`); return;
    }
    const items = res.data.map(d => `
      <div class="search-item" onclick="Doctors.selectDoctorForSchedule(${d.Doctor_ID},'Dr. ${d.First_Name} ${d.Last_Name}','${d.Dept_Name}')">
        <div class="text-bold">Dr. ${d.First_Name} ${d.Last_Name}</div>
        <div class="text-sm text-gray">${d.Dept_Name} · ${d.Spec_Name}</div>
      </div>`).join('');
    setHTML('schedule-doctor-list', items);
  }, 350),

  selectDoctorForSchedule(id, name, dept) {
    $('schedule-doctor-id').value     = id;
    $('schedule-doctor-search').value = name;
    setHTML('schedule-doctor-list', '');
    setHTML('schedule-doctor-display', `
      <div class="alert alert-info" style="padding:8px 12px;margin-top:6px">
        <i data-lucide="stethoscope" width="16" height="16" style="margin-right:6px;vertical-align:middle"></i> <strong>${name}</strong> — ${dept}
        <span class="text-sm text-gray"> (ID: ${id})</span>
      </div>`);
  },

  async saveSchedule() {
    const doctorId = $('schedule-doctor-id').value;
    if (!doctorId) { Toast.warning('Search and select a doctor first'); return; }
    const data = serializeForm('schedule-form');
    if (!data.work_date) { Toast.warning('Select a work date'); return; }
    const res = await Api.post(`/doctors/${doctorId}/schedule`, {
      work_date:         data.work_date,
      start_time:        data.start_time || '08:00',
      end_time:          data.end_time   || '16:00',
      slot_duration_min: data.slot_duration_min || 30,
    });
    if (res.success) {
      Toast.success(`Schedule created — ${res.slots_created} slots generated`);
      Modal.close('add-schedule-modal');
      this.load(this.page);
    } else Toast.error(res.message);
  },
};
