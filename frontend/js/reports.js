/**
 * reports.js
 */
const Reports = {
  tab: 'revenue',

  async load() {
    const today = new Date().toISOString().substring(0,10);
    const from  = new Date(Date.now()-30*864e5).toISOString().substring(0,10);
    $('report-from').value = from;
    $('report-to').value   = today;
    this.loadRevenue(from, today);
  },

  async loadRevenue(from, to) {
    loading('report-content');
    const [rev, appts, inv] = await Promise.all([
      Api.getQ('/reports/revenue', { from, to }),
      Api.getQ('/reports/appointments', { from, to }),
      Api.get('/reports/inventory'),
    ]);

    let html = '';

    // Revenue summary
    if (rev.success) {
      const s = rev.summary || {};
      html += `
        <div class="stats-grid mb-4">
          <div class="stat-card">
            <div class="stat-icon green"><i data-lucide="circle-dollar-sign" width="24" height="24"></i></div>
            <div class="stat-body"><div class="stat-value">${Fmt.currency(s.total_collected||0)}</div><div class="stat-label">Total Collected</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue"><i data-lucide="repeat" width="24" height="24"></i></div>
            <div class="stat-body"><div class="stat-value">${s.total_transactions||0}</div><div class="stat-label">Transactions</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon amber"><i data-lucide="bar-chart-3" width="24" height="24"></i></div>
            <div class="stat-body"><div class="stat-value">${Fmt.currency(s.avg_transaction||0)}</div><div class="stat-label">Avg Transaction</div></div>
          </div>
        </div>`;

      // Revenue by department
      if (rev.by_department?.length) {
        html += `<div class="card mb-4">
          <div class="card-header"><div class="card-title">Revenue by Department</div></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Department</th><th>Bills</th><th>Billed</th><th>Collected</th><th>Outstanding</th></tr></thead>
            <tbody>${rev.by_department.map(d=>`
              <tr>
                <td><strong>${d.Dept_Name}</strong></td>
                <td>${d.bills}</td>
                <td>${Fmt.currency(d.billed)}</td>
                <td class="text-success">${Fmt.currency(d.collected)}</td>
                <td class="${d.outstanding>0?'text-danger':''}">${Fmt.currency(d.outstanding)}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>`;
      }
    }

    // Appointment stats
    if (appts.success && appts.by_status?.length) {
      html += `<div class="card mb-4">
        <div class="card-header"><div class="card-title">Appointments by Status</div></div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          ${appts.by_status.map(s=>`
            <div class="stat-card" style="flex:1;min-width:140px">
              <div class="stat-body">
                <div class="stat-value">${s.count}</div>
                <div class="stat-label">${s.Appointment_Status}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    }

    // Doctor workload
    if (appts.success && appts.by_doctor?.length) {
      html += `<div class="card mb-4">
        <div class="card-header"><div class="card-title">Doctor Workload</div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Doctor</th><th>Department</th><th>Total</th><th>Completed</th><th>Cancelled</th></tr></thead>
          <tbody>${appts.by_doctor.map(d=>`
            <tr>
              <td><strong>${d.doctor}</strong></td>
              <td>${d.Dept_Name}</td>
              <td>${d.total||0}</td>
              <td class="text-success">${d.completed||0}</td>
              <td class="text-danger">${d.cancelled||0}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
    }

    // Inventory alerts
    if (inv.success) {
      if (inv.low_stock?.length) {
        html += `<div class="card mb-4">
          <div class="card-header">
            <div class="card-title"><i data-lucide="alert-triangle" width="18" height="18" style="margin-right:6px;vertical-align:middle;color:#f59e0b"></i> Low Stock Alert (${inv.low_stock.length})</div>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Medicine</th><th>Pharmacy</th><th>In Stock</th><th>Reorder Level</th><th>Deficit</th></tr></thead>
            <tbody>${inv.low_stock.map(i=>`
              <tr>
                <td><strong>${i.Medicine_Name}</strong> ${i.Strength}</td>
                <td>${i.Pharmacy_Name}</td>
                <td class="text-danger">${i.Quantity_In_Stock}</td>
                <td>${i.Reorder_Level}</td>
                <td class="text-danger text-bold">${i.deficit}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>`;
      }
      if (inv.expiring?.length) {
        html += `<div class="card mb-4">
          <div class="card-header">
            <div class="card-title"><i data-lucide="clock" width="18" height="18" style="margin-right:6px;vertical-align:middle;color:#3b82f6"></i> Medicines Expiring in 90 Days (${inv.expiring.length})</div>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Medicine</th><th>Pharmacy</th><th>Batch</th><th>Expiry</th><th>Days Left</th><th>Qty</th></tr></thead>
            <tbody>${inv.expiring.map(i=>`
              <tr>
                <td><strong>${i.Medicine_Name}</strong> ${i.Strength}</td>
                <td>${i.Pharmacy_Name}</td>
                <td>${i.Batch_Number}</td>
                <td>${Fmt.date(i.Expiry_Date)}</td>
                <td class="${i.days_left<30?'text-danger':'text-warning'}">${i.days_left} days</td>
                <td>${i.Quantity_In_Stock}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>`;
      }
    }

    if (!html) html = '<p class="text-gray text-center mt-4">No data available for the selected period</p>';
    setHTML('report-content', html);
  },

  async refresh() {
    const from = $('report-from')?.value;
    const to   = $('report-to')?.value;
    if (!from || !to) { Toast.warning('Select date range'); return; }
    this.loadRevenue(from, to);
  },
};
