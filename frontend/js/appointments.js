/**
 * appointments.js
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
          <div class="text-sm text-gray">${a.patient_phone}</div>
        </td>
        <td>
          <div class="text-bold">${a.doctor_name}</div>
          <div class="text-sm text-gray">${a.Dept_Name}</div>
        </td>
        <td>${Fmt.date(a.Work_Date)}</td>
        <td>${Fmt.time(a.Slot_Start)} – ${Fmt.time(a.Slot_End)}</td>
        <td class="truncate" style="max-width:140px">${a.Reason||'—'}</td>
        <td>${Fmt.status(a.Appointment_Status)}</td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${a.Appointment_Status==='Scheduled' ? `
              <button class="btn btn-success btn-sm" onclick="Appointments.openComplete(${a.Appointment_ID})">✔ Complete</button>
              <button class="btn btn-danger btn-sm" onclick="Appointments.cancel(${a.Appointment_ID})">✘ Cancel</button>
            ` : ''}
            ${a.Appointment_Status==='Completed' ? `
              <button class="btn btn-outline btn-sm" onclick="Appointments.openBillGen(${a.Appointment_ID})">💰 Bill</button>
            ` : ''}
          </div>
        </td>
      </tr>`).join('');
    setHTML('appointments-table', rows);
    renderPagination('appts-pagination', {page,total,limit}, `p=>Appointments.load(p)`);
    $('appts-count').textContent = `${total} appointment${total!==1?'s':''}`;
  },

  openBook() {
    resetForm('book-appt-form');
    setHTML('available-slots','');
    Modal.open('book-appt-modal');
  },

  async loadSlots() {
    const docId = $('appt-doctor-id')?.value;
    const date  = $('appt-date')?.value;
    if (!docId || !date) return;
    const res = await Api.getQ('/appointments/slots/available', { doctor_id: docId, date });
    if (!res.success || !res.data.length) {
      setHTML('available-slots','<p class="text-gray text-sm mt-2">No open slots for this date</p>'); return;
    }
    const opts = res.data.map(s =>
      `<option value="${s.Slot_ID}">${Fmt.time(s.Slot_Start)} – ${Fmt.time(s.Slot_End)}</option>`
    ).join('');
    setHTML('available-slots', `
      <div class="form-group mt-3">
        <label class="form-label">Available Slot *</label>
        <select class="form-control" id="selected-slot-id" required>
          <option value="">Select a slot</option>${opts}
        </select>
      </div>`);
  },

  async book() {
    const patientId = $('appt-patient-id')?.value;
    const slotId    = $('selected-slot-id')?.value;
    const reason    = $('appt-reason')?.value;
    if (!patientId || !slotId) { Toast.warning('Fill patient, doctor, date, and select a slot'); return; }
    const res = await Api.post('/appointments', {
      patient_id: patientId, slot_id: slotId, reason: reason||'',
    });
    if (res.success) {
      Toast.success(`Appointment booked (ID #${res.id})`);
      Modal.close('book-appt-modal');
      this.load(this.page);
    } else Toast.error(res.message);
  },

  async cancel(id) {
    const reason = prompt('Cancellation reason (optional):') ?? '';
    if (reason === null) return;
    const res = await Api.put(`/appointments/${id}/cancel`, { reason });
    if (res.success) { Toast.success('Appointment cancelled'); this.load(this.page); }
    else Toast.error(res.message);
  },

  openComplete(id) {
    $('complete-appt-id').value = id;
    resetForm('complete-form');
    Modal.open('complete-modal');
  },

  async complete() {
    const id        = $('complete-appt-id').value;
    const diagnosis = $('complete-diagnosis').value;
    const treatment = $('complete-treatment').value;
    const notes     = $('complete-notes').value;
    if (!diagnosis) { Toast.warning('Diagnosis is required'); return; }
    const res = await Api.put(`/appointments/${id}/complete`, { diagnosis, treatment, notes });
    if (res.success) {
      Toast.success('Appointment completed — medical record created');
      Modal.close('complete-modal');
      this.load(this.page);
    } else Toast.error(res.message);
  },

  openBillGen(apptId) {
    $('bill-appt-id').value = apptId;
    Modal.open('bill-gen-modal');
  },

  async generateBill() {
    const appt_id     = $('bill-appt-id').value;
    const medicine_fee= parseFloat($('bill-med-fee').value)||0;
    const lab_fee     = parseFloat($('bill-lab-fee').value)||0;
    const other_fee   = parseFloat($('bill-other-fee').value)||0;
    const discount    = parseFloat($('bill-discount').value)||0;
    const tax         = parseFloat($('bill-tax').value)||0;
    const res = await Api.post('/billing/generate', {
      appointment_id: appt_id, medicine_fee, lab_fee, other_fee, discount, tax,
    });
    if (res.success) {
      Toast.success(`Bill #${res.bill_id} generated`);
      Modal.close('bill-gen-modal');
      App.navigate('billing');
    } else Toast.error(res.message);
  },
};
