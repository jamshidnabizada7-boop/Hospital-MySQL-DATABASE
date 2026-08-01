/**
 * billing.js — Fixed: direct API, print support
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
      setHTML('billing-table', '<tr><td colspan="9" class="table-empty">No bills found</td></tr>');
      renderPagination('billing-pagination', {page,total,limit}, `p=>Billing.load(p)`);
      return;
    }
    const rows = data.map(b => `
      <tr>
        <td><strong>#${b.Bill_ID}</strong></td>
        <td>
          <div class="text-bold">${b.patient_name}</div>
          <div class="text-sm text-gray">${b.patient_phone||''}</div>
        </td>
        <td>${b.doctor_name}</td>
        <td>${Fmt.date(b.Bill_Date)}</td>
        <td class="text-bold">${Fmt.currency(b.Total_Amount)}</td>
        <td class="text-success">${Fmt.currency(b.Amount_Paid)}</td>
        <td class="${parseFloat(b.Balance_Due)>0?'text-danger':'text-success'}">${Fmt.currency(b.Balance_Due)}</td>
        <td>${Fmt.status(b.Bill_Status)}</td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn btn-outline btn-sm" onclick="Billing.openDetail(${b.Bill_ID})">View</button>
            <button class="btn btn-ghost btn-sm"   onclick="Billing.printBill(${b.Bill_ID})" title="Print">🖨</button>
            ${b.Bill_Status!=='Paid'&&b.Bill_Status!=='Cancelled'&&b.Bill_Status!=='Waived' ? `
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
    if (!res.success) { setHTML('bill-detail-content', `<p class="text-danger">${res.message}</p>`); return; }
    this._renderDetail(res.data, res.payments||[]);
  },

  _renderDetail(b, pays) {
    setHTML('bill-detail-content', `
      <div class="grid-2 mb-4">
        <div>
          <h4 class="text-bold mb-3">Patient</h4>
          <table class="info-table">
            <tr><td>Name</td><td><strong>${b.patient_name}</strong></td></tr>
            <tr><td>Phone</td><td>${b.patient_phone||'—'}</td></tr>
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
        <h4 class="text-bold mb-3">Bill Summary — #${b.Bill_ID}</h4>
        <table class="info-table">
          <tr><td>Consultation Fee</td><td>${Fmt.currency(b.Consultation_Fee)}</td></tr>
          <tr><td>Medicine Fee</td><td>${Fmt.currency(b.Medicine_Fee)}</td></tr>
          <tr><td>Lab Fee</td><td>${Fmt.currency(b.Lab_Fee)}</td></tr>
          <tr><td>Other Fee</td><td>${Fmt.currency(b.Other_Fee)}</td></tr>
          <tr><td>Discount</td><td>− ${Fmt.currency(b.Discount)}</td></tr>
          <tr><td>Tax</td><td>${Fmt.currency(b.Tax)}</td></tr>
          <tr style="font-size:15px;font-weight:700"><td>TOTAL</td><td>${Fmt.currency(b.Total_Amount)}</td></tr>
          <tr><td>Amount Paid</td><td class="text-success">${Fmt.currency(b.Amount_Paid)}</td></tr>
          <tr><td>Balance Due</td><td class="${parseFloat(b.Balance_Due)>0?'text-danger':'text-success'}">${Fmt.currency(b.Balance_Due)}</td></tr>
          <tr><td>Status</td><td>${Fmt.status(b.Bill_Status)}</td></tr>
        </table>
      </div>
      ${pays.length ? `
        <h4 class="text-bold mb-3">Payment History</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Received By</th></tr></thead>
            <tbody>${pays.map(p=>`
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
        </div>` : '<p class="text-gray text-sm mt-2">No payments recorded yet</p>'}
    `);
  },

  async printBill(id) {
    const res = await Api.get(`/billing/${id}`);
    if (!res.success) { Toast.error(res.message); return; }
    const b = res.data, pays = res.payments||[];
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Bill #${b.Bill_ID}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
        h1{color:#1a73e8;margin-bottom:4px} .sub{color:#64748b;margin-bottom:20px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:12px}
        td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
        .total-row td{font-weight:700;font-size:15px;border-top:2px solid #1a73e8}
        .badge{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
        .paid{background:#dcfce7;color:#15803d} .pending{background:#fef9c3;color:#92400e}
        @media print{button{display:none}}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><h1>🏥 Hospital Management System</h1><div class="sub">Official Bill / Receipt</div></div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700">BILL #${b.Bill_ID}</div>
          <div style="color:#64748b">${Fmt.date(b.Bill_Date)}</div>
          <span class="badge ${b.Bill_Status==='Paid'?'paid':'pending'}">${b.Bill_Status}</span>
        </div>
      </div>
      <hr style="margin:16px 0">
      <div class="grid">
        <div><strong>Patient</strong><br>${b.patient_name}<br>${b.patient_phone||''}<br>${b.Address||''}</div>
        <div><strong>Doctor</strong><br>${b.doctor_name}<br>${b.Dept_Name}<br>Visit: ${Fmt.date(b.Work_Date)}</div>
      </div>
      <table>
        <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
        <tr><td>Consultation Fee</td><td style="text-align:right">${Fmt.currency(b.Consultation_Fee)}</td></tr>
        <tr><td>Medicine Fee</td><td style="text-align:right">${Fmt.currency(b.Medicine_Fee)}</td></tr>
        <tr><td>Lab Fee</td><td style="text-align:right">${Fmt.currency(b.Lab_Fee)}</td></tr>
        <tr><td>Other Fee</td><td style="text-align:right">${Fmt.currency(b.Other_Fee)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right">− ${Fmt.currency(b.Discount)}</td></tr>
        <tr><td>Tax</td><td style="text-align:right">${Fmt.currency(b.Tax)}</td></tr>
        <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${Fmt.currency(b.Total_Amount)}</td></tr>
        <tr><td style="color:#15803d">Amount Paid</td><td style="text-align:right;color:#15803d">${Fmt.currency(b.Amount_Paid)}</td></tr>
        <tr><td style="color:#dc2626">Balance Due</td><td style="text-align:right;color:#dc2626">${Fmt.currency(b.Balance_Due)}</td></tr>
      </table>
      ${pays.length?`<strong>Payments</strong><table>
        <tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr>
        ${pays.map(p=>`<tr><td>${Fmt.datetime(p.Payment_Date)}</td><td>${Fmt.currency(p.Amount)}</td><td>${p.Payment_Method}</td><td>${p.Reference_No||'—'}</td></tr>`).join('')}
      </table>`:''}
      <div style="margin-top:40px;text-align:center;color:#94a3b8;font-size:12px">
        Thank you for choosing our hospital. Please keep this receipt for your records.
      </div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  },

  openPayment(billId, balance) {
    $('pay-bill-id').value  = billId;
    $('pay-max-label').textContent = `Balance due: ${Fmt.currency(balance)}`;
    $('pay-amount').value   = parseFloat(balance).toFixed(2);
    $('pay-method').value   = 'Cash';
    $('pay-reference').value= '';
    Modal.open('payment-modal');
  },

  async processPayment() {
    const bill_id = $('pay-bill-id').value;
    const amount  = parseFloat($('pay-amount').value);
    const method  = $('pay-method').value;
    const ref     = $('pay-reference').value||'';
    if (!amount || amount <= 0) { Toast.warning('Enter valid amount'); return; }
    const btn = $('btn-process-pay');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
    const res = await Api.post(`/billing/${bill_id}/payment`, { amount, method, reference_no: ref });
    if (btn) { btn.disabled = false; btn.textContent = '💰 Process Payment'; }
    if (res.success) {
      Toast.success('Payment processed successfully');
      Modal.close('payment-modal');
      this.load(this.page);
    } else {
      Toast.error(res.message);
    }
  },
};
