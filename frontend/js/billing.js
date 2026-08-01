/**
 * billing.js
 */
const Billing = {
  page: 1, status: '',

  async load(page=1) {
    this.page = page;
    loading('billing-table');
    const res = await Api.getQ('/billing', { status: this.status, page, limit: 15 });
    if (!res.success) { Toast.error(res.message); return; }
    this.render(res);
  },

  render({ data, total, page, limit=15 }) {
    if (!data.length) {
      setHTML('billing-table', '<tr><td colspan="8" class="table-empty">No bills found</td></tr>');
      renderPagination('billing-pagination', {page,total,limit}, `p=>Billing.load(p)`);
      return;
    }
    const rows = data.map(b => `
      <tr>
        <td><strong>#${b.Bill_ID}</strong></td>
        <td>
          <div class="text-bold">${b.patient_name}</div>
          <div class="text-sm text-gray">${b.patient_phone}</div>
        </td>
        <td>${b.doctor_name}</td>
        <td>${Fmt.date(b.Bill_Date)}</td>
        <td class="text-bold">${Fmt.currency(b.Total_Amount)}</td>
        <td class="text-success">${Fmt.currency(b.Amount_Paid)}</td>
        <td class="${b.Balance_Due>0?'text-danger':'text-success'}">${Fmt.currency(b.Balance_Due)}</td>
        <td>${Fmt.status(b.Bill_Status)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="Billing.openDetail(${b.Bill_ID})">View</button>
            ${b.Bill_Status!=='Paid'&&b.Bill_Status!=='Cancelled' ? `
              <button class="btn btn-success btn-sm" onclick="Billing.openPayment(${b.Bill_ID},${b.Balance_Due})">💰 Pay</button>
            ` : ''}
          </div>
        </td>
      </tr>`).join('');
    setHTML('billing-table', rows);
    renderPagination('billing-pagination', {page,total,limit}, `p=>Billing.load(p)`);
    $('billing-count').textContent = `${total} bill${total!==1?'s':''}`;
  },

  async openDetail(id) {
    setHTML('bill-detail-content', '<div class="spinner"></div>');
    Modal.open('bill-detail-modal');
    const res = await Api.get(`/billing/${id}`);
    if (!res.success) { setHTML('bill-detail-content',`<p class="text-danger">${res.message}</p>`); return; }
    const b = res.data, pays = res.payments||[];
    setHTML('bill-detail-content', `
      <div class="grid-2 mb-4">
        <div>
          <h4 class="text-bold mb-3">Patient</h4>
          <table class="info-table">
            <tr><td>Name</td><td>${b.patient_name}</td></tr>
            <tr><td>Phone</td><td>${b.patient_phone}</td></tr>
            <tr><td>Address</td><td>${b.Address||'—'}</td></tr>
            <tr><td>Insurance</td><td>${b.Insurance_No||'—'}</td></tr>
          </table>
        </div>
        <div>
          <h4 class="text-bold mb-3">Visit</h4>
          <table class="info-table">
            <tr><td>Doctor</td><td>${b.doctor_name}</td></tr>
            <tr><td>Department</td><td>${b.Dept_Name}</td></tr>
            <tr><td>Date</td><td>${Fmt.date(b.Work_Date)}</td></tr>
            <tr><td>Time</td><td>${Fmt.time(b.Slot_Start)}</td></tr>
          </table>
        </div>
      </div>
      <div class="card mb-4" style="background:#f8fafc">
        <h4 class="text-bold mb-3">Bill Summary</h4>
        <table class="info-table">
          <tr><td>Consultation Fee</td><td>${Fmt.currency(b.Consultation_Fee)}</td></tr>
          <tr><td>Medicine Fee</td><td>${Fmt.currency(b.Medicine_Fee)}</td></tr>
          <tr><td>Lab Fee</td><td>${Fmt.currency(b.Lab_Fee)}</td></tr>
          <tr><td>Other Fee</td><td>${Fmt.currency(b.Other_Fee)}</td></tr>
          <tr><td>Discount</td><td>- ${Fmt.currency(b.Discount)}</td></tr>
          <tr><td>Tax</td><td>${Fmt.currency(b.Tax)}</td></tr>
          <tr style="font-size:16px"><td><strong>Total</strong></td><td><strong>${Fmt.currency(b.Total_Amount)}</strong></td></tr>
          <tr><td>Amount Paid</td><td class="text-success">${Fmt.currency(b.Amount_Paid)}</td></tr>
          <tr><td>Balance Due</td><td class="${b.Balance_Due>0?'text-danger':'text-success'}">${Fmt.currency(b.Balance_Due)}</td></tr>
          <tr><td>Status</td><td>${Fmt.status(b.Bill_Status)}</td></tr>
        </table>
      </div>
      ${pays.length ? `
        <h4 class="text-bold mb-3">Payment History</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Received By</th></tr></thead>
            <tbody>
              ${pays.map(p=>`
                <tr>
                  <td>${p.Payment_ID}</td>
                  <td>${Fmt.datetime(p.Payment_Date)}</td>
                  <td class="text-bold">${Fmt.currency(p.Amount)}</td>
                  <td><span class="badge badge-info">${p.Payment_Method}</span></td>
                  <td>${p.Reference_No||'—'}</td>
                  <td>${p.received_by_name||'—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="text-gray text-sm mt-2">No payments recorded</p>'}
    `);
  },

  openPayment(billId, balance) {
    $('pay-bill-id').value = billId;
    $('pay-max-label').textContent = `Balance due: ${Fmt.currency(balance)}`;
    $('pay-amount').value = balance;
    Modal.open('payment-modal');
  },

  async processPayment() {
    const bill_id  = $('pay-bill-id').value;
    const amount   = parseFloat($('pay-amount').value);
    const method   = $('pay-method').value;
    const ref      = $('pay-reference').value||'';
    if (!amount || amount <= 0) { Toast.warning('Enter valid amount'); return; }
    const res = await Api.post(`/billing/${bill_id}/payment`, { amount, method, reference_no: ref });
    if (res.success) {
      Toast.success('Payment processed');
      Modal.close('payment-modal');
      this.load(this.page);
    } else Toast.error(res.message);
  },
};
