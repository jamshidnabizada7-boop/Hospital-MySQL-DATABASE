/**
 * appointments.js — Searchable patient/doctor dropdowns, friendly errors
 */
const Appointments = {
  page: 1, status: '', date: '', doctorId: '',

  async load(page=1) {
    this.page = page;
    loading('appointments-table');
    const res = await Api.getQ('/appointments', {
      status: this.status, date: this.date, doctor_id: this.doctorId, page, limit: 15,
    });
    if (!res.success) { Toast.error(res.message); return; }
    this.render(res);
  },

  render({ data, total, page, limit=15 }) {
    if (!data.length) {
      setHTML('appointments-table', '<tr><td colspan="9" class="table-empty">No appointments found</td></tr>');
      renderPagination('appts-pagination', {page,total,limit}, `p=>Appointments.load(p)`);
      return;
    }
    const rows = data.map(a => `
      <tr>
        <td><strong>#${a.Appointment_ID}</strong></td>
        <td>
          <div class="text-bold">${a.patient_name}</div>
          <div class="text-sm text-gray">${a.patient_phone||''}</div>
        </td>
        <td>
          <div class="text-bold">${a.doctor_name}</div>
          <div class="text-sm text-gray">${a.Dept_Name||''}</div>
        </td>
        <td>${Fmt.date(a.Work_Date)}</td>
        <td>${Fmt.time(a.Slot_Start)} – ${Fmt.time(a.Slot_End)}</td>
        <td class="truncate" style="max-width:130px">${a.Reason||'—'}</td>
        <td>${Fmt.status(a.Appointment_Status)}</td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${a.Appointment_Status==='Scheduled' && canDo('completeAppt') ? `
              <button class="btn btn-success btn-sm" onclick="Appointments.openComplete(${a.Appointment_ID})">✔ Complete</button>` : ''}
            ${a.Appointment_Status==='Scheduled' && canDo('cancelAppointment') ? `
              <button class="btn btn-danger btn-sm" onclick="Appointments.openCancel(${a.Appointment_ID})">✘ Cancel</button>` : ''}
            ${a.Appointment_Status==='Completed' && canDo('generateBill') ? `
              <button class="btn btn-outline btn-sm" onclick="Appointments.openBillGen(${a.Appointment_ID})">💰 Bill</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
    setHTML('appointments-table', rows);
    renderPagination('appts-pagination', {page,total,limit}, `p=>Appointments.load(p)`);
    $('appts-count').textContent = `${total} appointment${total!==1?'s':''}`;
  },

  // ── Book Appointment ──────────────────────────────────────

  async openBook() {
    setHTML('book-patient-list', '');
    setHTML('book-doctor-list', '');
    setHTML('available-slots', '');
    setHTML('available-dates-hint', '');
    $('appt-patient-search').value = '';
    $('appt-patient-id').value     = '';
    $('appt-doctor-search').value  = '';
    $('appt-doctor-id').value      = '';
    $('appt-date').value           = '';
    $('appt-reason').value         = '';
    setHTML('selected-patient-display', '');
    setHTML('selected-doctor-display', '');
    Modal.open('book-appt-modal');
  },

  searchPatients: debounce(async () => {
    const q = $('appt-patient-search').value.trim();
    if (q.length < 2) { setHTML('book-patient-list', ''); return; }
    const res = await Api.getQ('/patients', { search: q, limit: 8 });
    if (!res.success || !res.data.length) {
      setHTML('book-patient-list', `<div class="search-empty">No patients found for "${q}"</div>`); return;
    }
    const items = res.data.map(p => `
      <div class="search-item" onclick="Appointments.selectPatient(${p.Patient_ID},'${p.First_Name} ${p.Last_Name}','${p.Phone}')">
        <div class="text-bold">${p.First_Name} ${p.Last_Name}</div>
        <div class="text-sm text-gray">${p.Phone} · Age ${p.Age} · ${p.Blood_Group}</div>
      </div>`).join('');
    setHTML('book-patient-list', items);
  }, 350),

  selectPatient(id, name, phone) {
    $('appt-patient-id').value = id;
    $('appt-patient-search').value = name;
    setHTML('book-patient-list', '');
    setHTML('selected-patient-display', `
      <div class="alert alert-success" style="padding:8px 12px;margin-top:6px">
        ✅ <strong>${name}</strong> — ${phone}
        <span class="text-sm text-gray"> (ID: ${id})</span>
      </div>`);
  },

  searchDoctors: debounce(async () => {
    const q = $('appt-doctor-search').value.trim();
    if (q.length < 2) { setHTML('book-doctor-list', ''); return; }
    const res = await Api.getQ('/doctors', { search: q, limit: 8 });
    if (!res.success || !res.data.length) {
      setHTML('book-doctor-list', `<div class="search-empty">No doctors found for "${q}"</div>`); return;
    }
    const items = res.data.map(d => `
      <div class="search-item" onclick="Appointments.selectDoctor(${d.Doctor_ID},'Dr. ${d.First_Name} ${d.Last_Name}','${d.Dept_Name}',${d.Consultation_Fee})">
        <div class="text-bold">Dr. ${d.First_Name} ${d.Last_Name}</div>
        <div class="text-sm text-gray">${d.Dept_Name} · ${d.Spec_Name} · Fee: ${Fmt.currency(d.Consultation_Fee)}</div>
      </div>`).join('');
    setHTML('book-doctor-list', items);
  }, 350),

  selectDoctor(id, name, dept, fee) {
    $('appt-doctor-id').value = id;
    $('appt-doctor-search').value = name;
    setHTML('book-doctor-list', '');
    setHTML('selected-doctor-display', `
      <div class="alert alert-info" style="padding:8px 12px;margin-top:6px">
        🩺 <strong>${name}</strong> — ${dept}
        <span class="text-sm"> · Fee: ${Fmt.currency(fee)}</span>
        <span class="text-sm text-gray"> (ID: ${id})</span>
      </div>`);
    // Load available dates for this doctor
    this.loadAvailableDates(id);
    // Auto-load slots if date already selected
    if ($('appt-date').value) this.loadSlots();
  },

  async loadAvailableDates(doctorId) {
    const res = await Api.get(`/doctors/${doctorId}/available-dates`);
    if (!res.success || !res.data.length) {
      setHTML('available-dates-hint', `
        <div class="alert alert-warning" style="padding:8px 12px;margin-top:6px;font-size:12px">
          ⚠️ No upcoming schedules found for this doctor.
          Ask admin to add a schedule first.
        </div>`);
      return;
    }
    const dateList = res.data.map(d =>
      `<span class="date-chip" onclick="Appointments.pickDate('${d.Work_Date.substring(0,10)}')"
             title="${d.open_slots} open slots">
         ${Fmt.date(d.Work_Date)} <span class="chip-badge">${d.open_slots}</span>
       </span>`
    ).join('');
    setHTML('available-dates-hint', `
      <div style="margin-top:8px">
        <div class="form-label" style="margin-bottom:6px">Available dates (click to select):</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${dateList}</div>
      </div>`);
  },

  pickDate(dateStr) {
    $('appt-date').value = dateStr;
    this.loadSlots();
  },

  async loadSlots() {
    const docId = $('appt-doctor-id')?.value;
    const date  = $('appt-date')?.value;
    if (!docId || !date) { setHTML('available-slots', ''); return; }
    setHTML('available-slots', '<p class="text-sm text-gray mt-2">⏳ Loading available slots…</p>');
    const res = await Api.getQ('/appointments/slots/available', { doctor_id: docId, date });
    if (!res.success || !res.data.length) {
      setHTML('available-slots', `
        <div class="alert alert-warning mt-2" style="padding:8px 12px">
          No open slots for <strong>${Fmt.date(date)}</strong>.
          Try a different date or check the doctor's schedule.
        </div>`);
      return;
    }
    const opts = res.data.map(s =>
      `<option value="${s.Slot_ID}">${Fmt.time(s.Slot_Start)} – ${Fmt.time(s.Slot_End)}</option>`
    ).join('');
    setHTML('available-slots', `
      <div class="form-group mt-3">
        <label class="form-label">Available Slot *</label>
        <select class="form-control" id="selected-slot-id" required>
          <option value="">Select a time slot</option>${opts}
        </select>
      </div>
      <div class="text-sm text-gray mt-1">${res.data.length} slot${res.data.length!==1?'s':''} available</div>`);
  },

  async book() {
    const patientId = $('appt-patient-id')?.value;
    const doctorId  = $('appt-doctor-id')?.value;
    const slotId    = $('selected-slot-id')?.value;
    const reason    = $('appt-reason')?.value?.trim();

    if (!patientId) { Toast.warning('Search and select a patient first'); return; }
    if (!doctorId)  { Toast.warning('Search and select a doctor first');  return; }
    if (!$('appt-date')?.value) { Toast.warning('Select a date');         return; }
    if (!slotId)    { Toast.warning('Select an available time slot');      return; }

    const btn = $('btn-book-appt');
    if (btn) { btn.disabled = true; btn.textContent = 'Booking…'; }
    const res = await Api.post('/appointments', { patient_id: patientId, slot_id: slotId, reason: reason||'' });
    if (btn) { btn.disabled = false; btn.textContent = 'Book Appointment'; }

    if (res.success) {
      Toast.success(`Appointment booked — #${res.id}`);
      Modal.close('book-appt-modal');
      this.load(this.page);
    } else {
      Toast.error(res.message);
    }
  },

  // ── Cancel ───────────────────────────────────────────────

  openCancel(id) {
    $('cancel-appt-id').value = id;
    $('cancel-reason').value  = '';
    Modal.open('cancel-modal');
  },

  async confirmCancel() {
    const id     = $('cancel-appt-id').value;
    const reason = $('cancel-reason').value || '';
    const res    = await Api.put(`/appointments/${id}/cancel`, { reason });
    if (res.success) {
      Toast.success('Appointment cancelled');
      Modal.close('cancel-modal');
      this.load(this.page);
    } else {
      Toast.error(res.message);
    }
  },

  // ── Complete ─────────────────────────────────────────────

  openComplete(id) {
    $('complete-appt-id').value   = id;
    $('complete-diagnosis').value = '';
    $('complete-treatment').value = '';
    $('complete-notes').value     = '';
    Modal.open('complete-modal');
  },

  async complete() {
    const id        = $('complete-appt-id').value;
    const diagnosis = $('complete-diagnosis').value?.trim();
    const treatment = $('complete-treatment').value?.trim();
    const notes     = $('complete-notes').value?.trim();
    if (!diagnosis) { Toast.warning('Diagnosis is required'); return; }
    const btn = $('btn-complete-appt');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const res = await Api.put(`/appointments/${id}/complete`, { diagnosis, treatment, notes });
    if (btn) { btn.disabled = false; btn.textContent = '✔ Complete & Save Record'; }
    if (res.success) {
      Toast.success('Appointment completed — medical record created');
      Modal.close('complete-modal');
      this.load(this.page);
    } else {
      Toast.error(res.message);
    }
  },

  // ── Generate Bill ────────────────────────────────────────

  openBillGen(apptId) {
    $('bill-appt-id').value   = apptId;
    $('bill-med-fee').value   = '0';
    $('bill-lab-fee').value   = '0';
    $('bill-other-fee').value = '0';
    $('bill-discount').value  = '0';
    $('bill-tax').value       = '0';
    Modal.open('bill-gen-modal');
  },

  async generateBill() {
    const appt_id      = $('bill-appt-id').value;
    const medicine_fee = parseFloat($('bill-med-fee').value)   || 0;
    const lab_fee      = parseFloat($('bill-lab-fee').value)   || 0;
    const other_fee    = parseFloat($('bill-other-fee').value) || 0;
    const discount     = parseFloat($('bill-discount').value)  || 0;
    const tax          = parseFloat($('bill-tax').value)       || 0;
    const btn = $('btn-gen-bill');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
    const res = await Api.post('/billing/generate', {
      appointment_id: appt_id, medicine_fee, lab_fee, other_fee, discount, tax,
    });
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Bill'; }
    if (res.success) {
      Toast.success(`Bill #${res.bill_id} generated successfully`);
      Modal.close('bill-gen-modal');
      App.navigate('billing');
    } else {
      Toast.error(res.message);
    }
  },
};
