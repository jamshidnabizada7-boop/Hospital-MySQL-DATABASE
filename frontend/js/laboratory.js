/**
 * laboratory.js
 */
const Laboratory = {
  page: 1, status: '', priority: '',

  async load(page=1) {
    this.page = page;
    loading('lab-orders-table');
    const res = await Api.getQ('/lab/orders', {
      status: this.status, priority: this.priority, page, limit: 15,
    });
    if (!res.success) { Toast.error(res.message); return; }
    this.render(res);
  },

  render({ data, total, page, limit=15 }) {
    if (!data.length) {
      setHTML('lab-orders-table', '<tr><td colspan="8" class="table-empty">No lab orders</td></tr>');
      renderPagination('lab-pagination', {page,total,limit}, `p=>Laboratory.load(p)`);
      return;
    }
    const rows = data.map(o => `
      <tr>
        <td><strong>#${o.Order_ID}</strong></td>
        <td>${o.patient_name}</td>
        <td>${o.doctor_name}</td>
        <td>${Fmt.datetime(o.Order_Date)}</td>
        <td>${Fmt.status(o.Priority)}</td>
        <td>${Fmt.status(o.Status)}</td>
        <td><span class="badge badge-gray">${o.results_count} result${o.results_count!==1?'s':''}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="Laboratory.viewOrder(${o.Order_ID})">View</button>
            ${o.Status!=='Completed'?`<button class="btn btn-success btn-sm" onclick="Laboratory.openAddResult(${o.Order_ID})">+ Result</button>`:''}
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
    if (!res.success) { setHTML('lab-order-detail',`<p class="text-danger">${res.message}</p>`); return; }
    const o = res.data, results = res.results||[];
    setHTML('lab-order-detail', `
      <table class="info-table mb-4">
        <tr><td>Order ID</td><td>#${o.Order_ID}</td></tr>
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
            <thead><tr><th>Test</th><th>Result</th><th>Normal Range</th><th>Abnormal?</th><th>Date</th><th>Remarks</th></tr></thead>
            <tbody>
              ${results.map(r=>`
                <tr class="${r.Is_Abnormal?'':''}">
                  <td><strong>${r.Test_Name}</strong><br><span class="text-sm text-gray">${r.Test_Code}</span></td>
                  <td class="${r.Is_Abnormal?'text-danger text-bold':''}">${r.Result}</td>
                  <td class="text-gray text-sm">${r.Normal_Range||'—'} ${r.Unit||''}</td>
                  <td>${r.Is_Abnormal?'<span class="badge badge-danger">⚠ Abnormal</span>':'<span class="badge badge-success">Normal</span>'}</td>
                  <td>${Fmt.datetime(r.Result_Date)}</td>
                  <td>${r.Remarks||'—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="text-gray text-sm">No results recorded yet</p>'}
    `);
  },

  async openAddResult(orderId) {
    $('result-order-id').value = orderId;
    // Load test list
    const res = await Api.get('/lab/tests');
    if (res.success) {
      const opts = res.data.map(t=>`<option value="${t.Test_ID}">${t.Test_Name} (${t.Test_Code})</option>`).join('');
      $('result-test-id').innerHTML = `<option value="">Select Test</option>${opts}`;
    }
    Modal.open('add-result-modal');
  },

  async saveResult() {
    const order_id    = $('result-order-id').value;
    const test_id     = $('result-test-id').value;
    const result      = $('result-value').value;
    const is_abnormal = $('result-abnormal').checked ? 1 : 0;
    const remarks     = $('result-remarks').value||'';
    if (!test_id || !result) { Toast.warning('Select test and enter result'); return; }
    const res = await Api.post(`/lab/orders/${order_id}/results`, {
      test_id, result, is_abnormal, remarks,
    });
    if (res.success) {
      Toast.success('Result recorded');
      Modal.close('add-result-modal');
      this.load(this.page);
    } else Toast.error(res.message);
  },
};
