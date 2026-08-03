/**
 * notifications.js — Real-time notification panel
 * Shows: pending bills, abnormal lab results, low stock, upcoming follow-ups
 */
const Notifications = {
  _open: false,
  _interval: null,

  init() {
    this.loadCount();
    // Auto-refresh count every 60 seconds
    this._interval = setInterval(() => this.loadCount(), 60000);
    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (this._open && !$('notif-panel').contains(e.target) && e.target !== $('btn-notifications')) {
        this.close();
      }
    });
  },

  async loadCount() {
    try {
      const res = await Api.get('/notifications/count');
      if (!res.success) return;
      const total = (res.pending_bills || 0) + (res.abnormal_labs || 0) +
                    (res.low_stock || 0) + (res.follow_ups || 0);
      const badge = $('notif-badge');
      if (badge) {
        if (total > 0) {
          badge.style.display = '';
          badge.textContent = total > 99 ? '99+' : total;
        } else {
          badge.style.display = 'none';
        }
      }
    } catch { /* silent */ }
  },

  toggle() {
    if (this._open) { this.close(); } else { this.open(); }
  },

  open() {
    this._open = true;
    $('notif-panel').classList.remove('hidden');
    this.load();
  },

  close() {
    this._open = false;
    $('notif-panel').classList.add('hidden');
  },

  async load() {
    setHTML('notif-body', '<div class="spinner" style="margin:20px auto;width:24px;height:24px"></div>');
    try {
      const res = await Api.get('/notifications/count');
      if (!res.success) { setHTML('notif-body', '<p class="text-gray text-sm" style="padding:16px">Could not load notifications</p>'); return; }

      const sections = [];

      // Pending bills
      if (res.pending_bills > 0) {
        sections.push(`
          <div class="notif-section">
            <div class="notif-section-title">💰 Outstanding Bills</div>
            ${(res.bills_detail||[]).slice(0,5).map(b => `
              <div class="notif-item" onclick="App.navigate('billing');Notifications.close()">
                <div class="notif-item-title">${b.patient_name}</div>
                <div class="notif-item-sub">Balance: AF ${parseFloat(b.Balance_Due).toLocaleString()}</div>
              </div>`).join('')}
            ${res.pending_bills > 5 ? `<div class="notif-more" onclick="App.navigate('billing');Notifications.close()">+${res.pending_bills-5} more →</div>` : ''}
          </div>`);
      }

      // Abnormal lab results
      if (res.abnormal_labs > 0) {
        sections.push(`
          <div class="notif-section">
            <div class="notif-section-title">🔬 Abnormal Lab Results</div>
            ${(res.labs_detail||[]).slice(0,5).map(l => `
              <div class="notif-item notif-warning" onclick="App.navigate('laboratory');Notifications.close()">
                <div class="notif-item-title">${l.patient_name} — ${l.Test_Name}</div>
                <div class="notif-item-sub">${l.Result}</div>
              </div>`).join('')}
            ${res.abnormal_labs > 5 ? `<div class="notif-more" onclick="App.navigate('laboratory');Notifications.close()">+${res.abnormal_labs-5} more →</div>` : ''}
          </div>`);
      }

      // Low stock
      if (res.low_stock > 0) {
        sections.push(`
          <div class="notif-section">
            <div class="notif-section-title">⚠️ Low Stock Alert</div>
            ${(res.stock_detail||[]).slice(0,4).map(s => `
              <div class="notif-item notif-danger" onclick="App.navigate('pharmacy');Notifications.close()">
                <div class="notif-item-title">${s.Medicine_Name} ${s.Strength}</div>
                <div class="notif-item-sub">Only ${s.Quantity_In_Stock} left (reorder: ${s.Reorder_Level})</div>
              </div>`).join('')}
            ${res.low_stock > 4 ? `<div class="notif-more" onclick="App.navigate('pharmacy');Notifications.close()">+${res.low_stock-4} more →</div>` : ''}
          </div>`);
      }

      // Follow-ups due this week
      if (res.follow_ups > 0) {
        sections.push(`
          <div class="notif-section">
            <div class="notif-section-title">📅 Follow-ups This Week</div>
            ${(res.followup_detail||[]).slice(0,4).map(f => `
              <div class="notif-item" onclick="App.navigate('patients');Notifications.close()">
                <div class="notif-item-title">${f.Patient_Name}</div>
                <div class="notif-item-sub">${f.Doctor_Name} · ${Fmt.date(f.Follow_Up_Date)}</div>
              </div>`).join('')}
          </div>`);
      }

      if (!sections.length) {
        setHTML('notif-body', `
          <div style="padding:32px 16px;text-align:center;color:#94a3b8">
            <div style="font-size:32px;margin-bottom:8px">✅</div>
            <div style="font-weight:600">All clear!</div>
            <div style="font-size:12px;margin-top:4px">No pending notifications</div>
          </div>`);
      } else {
        setHTML('notif-body', sections.join(''));
      }

      // Update badge
      const total = (res.pending_bills||0)+(res.abnormal_labs||0)+(res.low_stock||0)+(res.follow_ups||0);
      const badge = $('notif-badge');
      if (badge) {
        badge.style.display = total > 0 ? '' : 'none';
        badge.textContent   = total > 99 ? '99+' : total;
      }

    } catch (err) {
      setHTML('notif-body', `<p class="text-danger text-sm" style="padding:16px">${err.message}</p>`);
    }
  },
};
