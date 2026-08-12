/**
 * utils.js — Shared helpers
 */

// ── Toast notifications ───────────────────────────────────────
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    const icons = { success:'<i data-lucide="check-circle" width="16" height="16" style="color:#22c55e"></i>', error:'<i data-lucide="alert-circle" width="16" height="16" style="color:#ef4444"></i>', warning:'<i data-lucide="alert-triangle" width="16" height="16" style="color:#f59e0b"></i>', info:'<i data-lucide="info" width="16" height="16" style="color:#3b82f6"></i>' };
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${icons[type]||''}</span><span>${msg}</span>`;
    c.appendChild(t);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(120%)';
                       t.style.transition='.3s ease';
                       setTimeout(()=>t.remove(),320); }, duration);
  },
  success(m,d) { this.show(m,'success',d); },
  error  (m,d) { this.show(m,'error',  d); },
  warning(m,d) { this.show(m,'warning',d); },
  info   (m,d) { this.show(m,'info',   d); },
};

// ── Format helpers ────────────────────────────────────────────
const Fmt = {
  date(d)    { return d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'; },
  time(t)    { return t ? t.substring(0,5) : '—'; },
  datetime(d){ return d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'; },
  currency(n){ return 'AF ' + (parseFloat(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); },
  number(n)  { return (parseInt(n)||0).toLocaleString(); },
  age(dob)   { if (!dob) return '—'; const d=new Date(dob), t=new Date(); let a=t.getFullYear()-d.getFullYear(); const m=t.getMonth()-d.getMonth(); if(m<0||(m===0&&t.getDate()<d.getDate()))a--; return a+' yrs'; },
  initials(n){ return (n||'').split(' ').map(w=>w[0]).join('').toUpperCase().substring(0,2); },
  status(s)  {
    const map = {
      'Completed':'badge-success','Paid':'badge-success','OK':'badge-success',
      'Scheduled':'badge-info','Pending':'badge-warning','In_Progress':'badge-warning','Partial':'badge-warning',
      'Cancelled':'badge-danger','No_Show':'badge-danger','Expired':'badge-danger','Low_Stock':'badge-warning',
      'Leave':'badge-gray','Available':'badge-success','Expiring_Soon':'badge-warning',
      'STAT':'badge-danger','Urgent':'badge-warning','Routine':'badge-gray',
    };
    return `<span class="badge ${map[s]||'badge-gray'}">${s||'—'}</span>`;
  },
};

// ── DOM helpers ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function show(id) { const e=$(id); if(e) e.classList.remove('hidden'); }
function hide(id) { const e=$(id); if(e) e.classList.add('hidden'); }

function setHTML(id, html) { const e=$(id); if(e) { e.innerHTML = html; if (window.lucide) window.lucide.createIcons(); } }

function loading(id) {
  setHTML(id, '<div class="loading-block"><div class="spinner"></div></div>');
}

// ── Modal helpers ─────────────────────────────────────────────
const Modal = {
  open(id) {
    const m = $(id);
    if (m) { m.classList.remove('hidden'); document.body.style.overflow='hidden'; }
  },
  close(id) {
    const m = $(id);
    if (m) { m.classList.add('hidden'); document.body.style.overflow=''; }
  },
  closeAll() {
    $$('.modal-overlay').forEach(m => { m.classList.add('hidden'); });
    document.body.style.overflow = '';
  },
};

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});
// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') Modal.closeAll();
});

// ── Form serializer ───────────────────────────────────────────
function serializeForm(formId) {
  const form = $(formId);
  if (!form) return {};
  const obj = {};
  new FormData(form).forEach((v, k) => {
    obj[k] = v.trim() === '' ? null : v.trim();
  });
  return obj;
}

function resetForm(formId) {
  const f = $(formId);
  if (f) f.reset();
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination(containerId, { page, total, limit }, onPage) {
  const pages = Math.ceil(total / limit) || 1;
  const c = $(containerId);
  if (!c) return;
  if (pages <= 1) { c.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="(${onPage})(${page-1})" ${page===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i===1||i===pages||Math.abs(i-page)<=2) {
      html += `<button class="page-btn${i===page?' active':''}" onclick="(${onPage})(${i})">${i}</button>`;
    } else if (Math.abs(i-page)===3) {
      html += `<span style="padding:0 4px;color:#94a3b8">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="(${onPage})(${page+1})" ${page===pages?'disabled':''}>›</button>`;
  c.innerHTML = html;
}

// ── Tabs ──────────────────────────────────────────────────────
function initTabs(groupSel) {
  $$(groupSel + ' .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('[data-tabs]') || btn.closest('.tabs-container');
      group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      group.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = $(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms=300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}
