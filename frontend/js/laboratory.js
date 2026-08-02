/**
 * laboratory.js — Full CRUD + print support
 */
const Laboratory = {
  page: 1, status: '', priority: '',
  tests: [],

  async load(page=1) {
    this.page = page;
    loading('lab-orders-table');
    // Pre-load tests list
    if (!this.tests.length) {
      const tr = await Api.get('/lab/tests');
      if (tr.success) this.tests = tr.data;
    }
    const res = await Api.getQ('/lab/orders', {
      status: this.status, priority: this.priority, page, limit: 15,
    });
    if (!res.success) { Toast.error(res.message); return; }
    this.render(res);
  },

  render({ data, total, page, limit=15 }) {
    if (!data.length) {
      setHTML('lab-orders-table', '<tr><td colspan="8" class="table-empty">No lab orders found</td></tr>');
      renderPagination('lab-pagination', {page,total,limit}, `p=>Laboratory.load(p)`);
      return;
    }
    const rows = data.map(o => `
      <tr>
        <td><strong>#${o.Order_ID}</strong></td>
        <td>
          <div class="text-bold">${o.patient_name}</div>
        </td>
        <td>${o.doctor_name}</td>
        <td>${Fmt.datetime(o.Order_Date)}</td>
        <td>${Fmt.status(o.Priority)}</td>
        <td>${Fmt.status(o.Status)}</td>
        <td><span class="badge badge-gray">${o.results_count} result${o.results_count!==1?'s':''}</span></td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="Laboratory.viewOrder(${o.Order_ID})">View</button>
            <button class="btn btn-ghost btn-sm"   onclick="Laboratory.printOrder(${o.Order_ID})" title="Print">🖨</button>
            ${o.Status!=='Completed'&&o.Status!=='Cancelled'&&canDo('addLabResult')?`<button class="btn btn-success btn-sm" onclick="Laboratory.openAddResult(${o.Order_ID})">+ Result</button>`:''}
            ${o.Status==='Pending'&&canDo('createLabOrder')?`<button class="btn btn-ghost btn-sm text-danger" onclick="Laboratory.cancelOrder(${o.Order_ID})">✘</button>`:''}
          </div>
        </td>
      </tr>`).join('');
    setHTML('lab-orders-table', rows);
    renderPagination('lab-pagination', {page,total,limit}, `p=>Laboratory.load(p)`);
  },

  async viewOrder(id) {
    setHTML('lab-order-detail', '<div class="spinner"></div>');
    Modal.open('lab-order-modal');
    const res = await Api.get(`/lab/orders/${id}`);
    if (!res.success) { setHTML('lab-order-detail', `<p class="text-danger">${res.message}</p>`); return; }
    this._renderOrderDetail(res.data, res.results||[]);
  },

  _renderOrderDetail(o, results) {
    setHTML('lab-order-detail', `
      <table class="info-table mb-4">
        <tr><td>Order ID</td><td><strong>#${o.Order_ID}</strong></td></tr>
        <tr><td>Patient</td><td><strong>${o.patient_name}</strong></td></tr>
        <tr><td>Blood Group</td><td>${o.Blood_Group||'—'}</td></tr>
        <tr><td>Doctor</td><td>${o.doctor_name}</td></tr>
        <tr><td>Date</td><td>${Fmt.datetime(o.Order_Date)}</td></tr>
        <tr><td>Priority</td><td>${Fmt.status(o.Priority)}</td></tr>
        <tr><td>Status</td><td>${Fmt.status(o.Status)}</td></tr>
        ${o.Notes?`<tr><td>Notes</td><td>${o.Notes}</td></tr>`:''}
      </table>
      <h4 class="text-bold mb-3">Results (${results.length})</h4>
      ${results.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Test</th><th>Result</th><th>Normal Range</th><th>Status</th><th>Date</th><th>Remarks</th><th></th></tr></thead>
            <tbody>
              ${results.map(r=>`
                <tr>
                  <td><strong>${r.Test_Name}</strong><br><span class="text-sm text-gray">${r.Test_Code}</span></td>
                  <td class="${r.Is_Abnormal?'text-danger text-bold':''}">${r.Result}</td>
                  <td class="text-gray text-sm">${r.Normal_Range||'—'} ${r.Unit||''}</td>
                  <td>${r.Is_Abnormal?'<span class="badge badge-danger">Abnormal</span>':'<span class="badge badge-success">Normal</span>'}</td>
                  <td>${Fmt.datetime(r.Result_Date)}</td>
                  <td>${r.Remarks||'—'}</td>
                  <td><button class="btn btn-ghost btn-sm text-danger" onclick="Laboratory.deleteResult(${r.Result_ID},${o.Order_ID})">🗑️</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="text-gray text-sm">No results recorded yet</p>'}
    `);
  },

  async printOrder(id) {
    const res = await Api.get(`/lab/orders/${id}`);
    if (!res.success) { Toast.error(res.message); return; }
    const o = res.data, results = res.results||[];
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Lab Report #${o.Order_ID}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
        h1{color:#1a73e8} table{width:100%;border-collapse:collapse;margin:16px 0}
        th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase}
        td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
        .abnormal{color:#dc2626;font-weight:700} .normal{color:#15803d}
        @media print{button{display:none}}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><h1>🏥 Hospital Management System</h1><div style="color:#64748b">Laboratory Report</div></div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700">ORDER #${o.Order_ID}</div>
          <div style="color:#64748b">${Fmt.datetime(o.Order_Date)}</div>
        </div>
      </div>
      <hr>
      <table><tr><th colspan="2">Patient & Order Details</th></tr>
        <tr><td>Patient</td><td><strong>${o.patient_name}</strong></td></tr>
        <tr><td>Blood Group</td><td>${o.Blood_Group||'—'}</td></tr>
        <tr><td>Ordering Doctor</td><td>${o.doctor_name}</td></tr>
        <tr><td>Priority</td><td>${o.Priority}</td></tr>
        <tr><td>Status</td><td>${o.Status}</td></tr>
      </table>
      <h3>Test Results</h3>
      <table>
        <tr><th>Test</th><th>Result</th><th>Normal Range</th><th>Status</th><th>Remarks</th></tr>
        ${results.map(r=>`
          <tr>
            <td><strong>${r.Test_Name}</strong> (${r.Test_Code})</td>
            <td class="${r.Is_Abnormal?'abnormal':'normal'}">${r.Result} ${r.Unit||''}</td>
            <td>${r.Normal_Range||'—'}</td>
            <td class="${r.Is_Abnormal?'abnormal':'normal'}">${r.Is_Abnormal?'⚠ ABNORMAL':'✓ Normal'}</td>
            <td>${r.Remarks||'—'}</td>
          </tr>`).join('')}
        ${!results.length?'<tr><td colspan="5" style="text-align:center;color:#94a3b8">No results yet</td></tr>':''}
      </table>
      <div style="margin-top:40px;text-align:center;color:#94a3b8;font-size:12px">
        This is an official laboratory report from Hospital Management System.
      </div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  },

  openNewOrder() {
    resetForm('new-order-form');
    Modal.open('new-order-modal');
  },

  async saveNewOrder() {
    const data = serializeForm('new-order-form');
    if (!data.appointment_id || !data.doctor_id) {
      Toast.warning('Appointment ID and Doctor ID are required'); return;
    }
    const res = await Api.post('/lab/orders', {
      appointment_id: data.appointment_id,
      doctor_id:      data.doctor_id,
      priority:       data.priority || 'Routine',
      notes:          data.notes    || '',
    });
    if (res.success) {
      Toast.success(`Lab order #${res.order_id} created`);
      Modal.close('new-order-modal');
      this.load(this.page);
    } else Toast.error(res.message);
  },

  async cancelOrder(id) {
    if (!confirm('Cancel this lab order?')) return;
    const res = await Api.put(`/lab/orders/${id}/status`, { status: 'Cancelled' });
    if (res.success) { Toast.success('Order cancelled'); this.load(this.page); }
    else Toast.error(res.message);
  },

  openAddResult(orderId) {
    $('result-order-id').value  = orderId;
    $('result-value').value     = '';
    $('result-remarks').value   = '';
    $('result-abnormal').checked= false;
    // Populate test dropdown
    const sel = $('result-test-id');
    if (sel) {
      sel.innerHTML = `<option value="">Select Test</option>` +
        this.tests.map(t=>`<option value="${t.Test_ID}">${t.Test_Name} (${t.Test_Code})</option>`).join('');
    }
    Modal.open('add-result-modal');
  },

  async saveResult() {
    const order_id    = $('result-order-id').value;
    const test_id     = $('result-test-id').value;
    const result      = $('result-value').value?.trim();
    const is_abnormal = $('result-abnormal').checked ? 1 : 0;
    const remarks     = $('result-remarks').value?.trim()||'';
    if (!test_id)  { Toast.warning('Select a test');       return; }
    if (!result)   { Toast.warning('Enter result value');  return; }
    const btn = $('btn-save-result');
    if (btn) btn.disabled = true;
    const res = await Api.post(`/lab/orders/${order_id}/results`, {
      test_id, result, is_abnormal, remarks,
    });
    if (btn) btn.disabled = false;
    if (res.success) {
      Toast.success('Result recorded');
      Modal.close('add-result-modal');
      this.load(this.page);
    } else Toast.error(res.message);
  },

  async deleteResult(resultId, orderId) {
    if (!confirm('Delete this result?')) return;
    const res = await Api.delete(`/lab/results/${resultId}`);
    if (res.success) { Toast.success('Result deleted'); this.viewOrder(orderId); this.load(this.page); }
    else Toast.error(res.message);
  },
};
