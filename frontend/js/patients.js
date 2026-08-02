/**
 * patients.js
 */
const Patients = {
  page: 1, search: '', editId: null,

  async load(page=1) {
    this.page = page;
    loading('patients-table');
    const res = await Api.getQ('/patients', { search: this.search, page, limit: 15 });
    if (!res.success) { Toast.error(res.message); return; }
    this.render(res);
  },

  render({ data, total, page, limit=15 }) {
    if (!data.length) {
      setHTML('patients-table', '<tr><td colspan="8" class="table-empty">No patients found</td></tr>');
      renderPagination('patients-pagination', {page,total,limit}, `p=>Patients.load(p)`);
      return;
    }
    const rows = data.map(p => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="user-avatar" style="width:34px;height:34px;font-size:12px">${Fmt.initials(p.First_Name+' '+p.Last_Name)}</div>
            <div>
              <div class="text-bold">${p.First_Name} ${p.Last_Name}</div>
              <div class="text-sm text-gray">#${p.Patient_ID}</div>
            </div>
          </div>
        </td>
        <td>${p.Gender}</td>
        <td>${Fmt.age(p.Date_Of_Birth)}</td>
        <td><span class="badge badge-info">${p.Blood_Group}</span></td>
        <td>${p.Phone}</td>
        <td class="truncate" style="max-width:160px">${p.Address||'—'}</td>
        <td>${Fmt.date(p.Registered_At)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="Patients.viewHistory(${p.Patient_ID},'${p.First_Name} ${p.Last_Name}')">History</button>
            ${canDo('editPatient')   ? `<button class="btn btn-ghost btn-sm" onclick="Patients.openEdit(${p.Patient_ID})">✏️</button>` : ''}
            ${canDo('deletePatient') ? `<button class="btn btn-ghost btn-sm text-danger" onclick="Patients.delete(${p.Patient_ID})">🗑️</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
    setHTML('patients-table', rows);
    renderPagination('patients-pagination', {page,total,limit}, `p=>Patients.load(p)`);
    $('patients-count').textContent = `${total} patient${total!==1?'s':''}`;
  },

  openAdd() {
    this.editId = null;
    resetForm('patient-form');
    $('patient-modal-title').textContent = 'Register New Patient';
    Modal.open('patient-modal');
  },

  async openEdit(id) {
    this.editId = id;
    const res = await Api.get(`/patients/${id}`);
    if (!res.success) { Toast.error(res.message); return; }
    const p = res.data;
    const f = $('patient-form');
    f.querySelector('[name=first_name]').value    = p.First_Name||'';
    f.querySelector('[name=last_name]').value     = p.Last_Name||'';
    f.querySelector('[name=gender]').value        = p.Gender||'';
    f.querySelector('[name=date_of_birth]').value = p.Date_Of_Birth?.substring(0,10)||'';
    f.querySelector('[name=blood_group]').value   = p.Blood_Group||'Unknown';
    f.querySelector('[name=phone]').value         = p.Phone||'';
    f.querySelector('[name=email]').value         = p.Email||'';
    f.querySelector('[name=address]').value       = p.Address||'';
    f.querySelector('[name=emergency_name]').value  = p.Emergency_Name||'';
    f.querySelector('[name=emergency_phone]').value = p.Emergency_Phone||'';
    f.querySelector('[name=insurance_no]').value  = p.Insurance_No||'';
    $('patient-modal-title').textContent = 'Edit Patient';
    Modal.open('patient-modal');
  },

  async save() {
    const data = serializeForm('patient-form');
    if (!data.first_name || !data.last_name || !data.phone || !data.date_of_birth) {
      Toast.warning('Please fill required fields'); return;
    }
    const res = this.editId
      ? await Api.put(`/patients/${this.editId}`, data)
      : await Api.post('/patients', data);
    if (res.success) {
      Toast.success(this.editId ? 'Patient updated' : 'Patient registered');
      Modal.close('patient-modal');
      this.load(this.page);
    } else {
      Toast.error(res.message);
    }
  },

  async delete(id) {
    if (!confirm('Deactivate this patient?')) return;
    const res = await Api.delete(`/patients/${id}`);
    if (res.success) { Toast.success('Patient deactivated'); this.load(this.page); }
    else Toast.error(res.message);
  },

  async viewHistory(id, name) {
    $('history-modal-title').textContent = `Medical History — ${name}`;
    setHTML('history-content', '<div class="spinner"></div>');
    Modal.open('history-modal');
    const res = await Api.get(`/patients/${id}/history`);
    if (!res.success) { setHTML('history-content', `<p class="text-danger">${res.message}</p>`); return; }
    if (!res.data.length) {
      setHTML('history-content', '<p class="text-gray text-center mt-4">No medical history found</p>'); return;
    }
    const items = res.data.map(h => `
      <div class="tl-item">
        <div class="tl-dot"></div>
        <div class="tl-date">${Fmt.date(h.Work_Date)} at ${Fmt.time(h.Slot_Start)} — ${h.doctor_name} (${h.department})</div>
        <div class="tl-title">${h.Reason||'Visit'} ${Fmt.status(h.Appointment_Status)}</div>
        ${h.Diagnosis ? `
          <div class="tl-body">
            <strong>Diagnosis:</strong> ${h.Diagnosis}<br>
            ${h.Treatment ? `<strong>Treatment:</strong> ${h.Treatment}<br>` : ''}
            ${h.Visit_Notes ? `<em>${h.Visit_Notes}</em><br>` : ''}
            ${h.Follow_Up_Date ? `<strong>Follow-up:</strong> ${Fmt.date(h.Follow_Up_Date)}` : ''}
          </div>` : ''}
      </div>`).join('');
    setHTML('history-content', `<div class="timeline">${items}</div>`);
  },
};

// Search with debounce
function initPatientsSearch() {
  const inp = $('patients-search');
  if (!inp) return;
  inp.addEventListener('input', debounce(e => {
    Patients.search = e.target.value;
    Patients.load(1);
  }, 350));
}
