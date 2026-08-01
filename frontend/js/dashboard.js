/**
 * dashboard.js
 */
const Dashboard = {
  async load() {
    loading('dash-stats');
    loading('dash-recent');
    const res = await Api.get('/dashboard/stats');
    if (!res.success) { Toast.error(res.message); return; }
    const { stats, recent_appointments, revenue_chart, dept_distribution } = res;

    this.renderStats(stats);
    this.renderRecentAppts(recent_appointments);
    this.renderRevenueChart(revenue_chart);
    this.renderDeptChart(dept_distribution);
  },

  renderStats(s) {
    setHTML('dash-stats', `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div class="stat-body"><div class="stat-value">${Fmt.number(s.total_patients)}</div><div class="stat-label">Total Patients</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">🩺</div>
          <div class="stat-body"><div class="stat-value">${Fmt.number(s.active_doctors)}</div><div class="stat-label">Active Doctors</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-body"><div class="stat-value">${Fmt.number(s.today_appointments)}</div><div class="stat-label">Today's Appointments</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">💰</div>
          <div class="stat-body"><div class="stat-value">${Fmt.currency(s.today_revenue)}</div><div class="stat-label">Today's Revenue</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">🧾</div>
          <div class="stat-body"><div class="stat-value">${Fmt.number(s.pending_bills)}</div><div class="stat-label">Pending Bills</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">📋</div>
          <div class="stat-body"><div class="stat-value">${Fmt.number(s.scheduled_appointments)}</div><div class="stat-label">Scheduled</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal">🔬</div>
          <div class="stat-body"><div class="stat-value">${Fmt.number(s.lab_pending)}</div><div class="stat-label">Lab Pending</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">⚠️</div>
          <div class="stat-body"><div class="stat-value">${Fmt.number(s.low_stock_alerts)}</div><div class="stat-label">Low Stock Alerts</div></div>
        </div>
      </div>`);
  },

  renderRecentAppts(appts) {
    if (!appts?.length) {
      setHTML('dash-recent', '<p class="text-gray text-center mt-4">No recent appointments</p>');
      return;
    }
    const rows = appts.map(a => `
      <tr>
        <td><strong>${a.patient_name}</strong></td>
        <td>${a.doctor_name}</td>
        <td>${a.department}</td>
        <td>${Fmt.date(a.Work_Date)}</td>
        <td>${Fmt.time(a.Slot_Start)}</td>
        <td>${Fmt.status(a.Appointment_Status)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('appointments')">View</button>
        </td>
      </tr>`).join('');
    setHTML('dash-recent', `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Patient</th><th>Doctor</th><th>Dept</th><th>Date</th><th>Time</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`);
  },

  renderRevenueChart(data) {
    const el = $('dash-revenue-chart');
    if (!el || !data?.length) { if(el) el.innerHTML='<p class="text-gray text-center mt-4">No revenue data</p>'; return; }
    const max = Math.max(...data.map(d=>d.total), 1);
    const bars = data.map(d => {
      const pct = (d.total/max*100).toFixed(1);
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:0">
          <div style="font-size:10px;color:#64748b;font-weight:600">${Fmt.currency(d.total).replace('AF ','')}</div>
          <div style="width:100%;height:${Math.max(4,pct)}%;background:var(--primary);border-radius:4px 4px 0 0;min-height:4px"></div>
          <div style="font-size:10px;color:#94a3b8;transform:rotate(-30deg);white-space:nowrap">${d.day?.substring(5)||''}</div>
        </div>`;
    }).join('');
    el.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:6px;height:140px;padding-bottom:24px">
        ${bars}
      </div>`;
  },

  renderDeptChart(data) {
    const el = $('dash-dept-chart');
    if (!el || !data?.length) { if(el) el.innerHTML='<p class="text-gray text-center mt-4">No data</p>'; return; }
    const total = data.reduce((s,d)=>s+(d.count||0), 0) || 1;
    const colors = ['#1a73e8','#34a853','#ea4335','#fbbc04','#7c3aed','#0f766e','#be185d','#4338ca','#d97706','#dc2626'];
    const items = data.map((d,i)=>`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:10px;height:10px;border-radius:50%;background:${colors[i%colors.length]};flex-shrink:0"></div>
        <div style="flex:1;font-size:12px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.Dept_Name}</div>
        <div style="font-size:12px;font-weight:700;color:#1e293b">${d.count}</div>
        <div style="font-size:11px;color:#94a3b8">${(d.count/total*100).toFixed(0)}%</div>
      </div>`).join('');
    el.innerHTML = items;
  },
};
