/**
 * pharmacy.js — Full CRUD: medicines, inventory, pharmacy locations
 */
const Pharmacy = {
  page: 1, search: '',
  categories: [], locations: [],

  async load() {
    await this.loadMeta();
    this.loadMedicines(1);
    this.loadInventory(1);
    this.renderLocations();
  },

  renderLocations() {
    const el = $('locations-list');
    if (!el) return;
    if (!this.locations.length) {
      el.innerHTML = '<p class="text-gray text-sm">No pharmacy locations found.</p>'; return;
    }
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${this.locations.map(p => `
          <div class="card" style="border-left:4px solid var(--primary)">
            <div class="text-bold" style="font-size:15px;margin-bottom:6px">🏪 ${p.Pharmacy_Name}</div>
            <div class="text-sm text-gray">${p.Location||'—'}</div>
            <div class="text-sm text-gray">${p.Phone||''}</div>
          </div>`).join('')}
      </div>`;
  },

  async loadMeta() {
    const [cr, lr] = await Promise.all([
      Api.get('/pharmacy/categories'),
      Api.get('/pharmacy/locations'),
    ]);
    if (cr.success) this.categories = cr.data;
    if (lr.success) this.locations  = lr.data;
  },

  // ── MEDICINES ──────────────────────────────────────────────

  async loadMedicines(page=1) {
    this.page = page;
    loading('medicines-table');
    const res = await Api.getQ('/pharmacy/medicines', { search: this.search, page, limit: 15 });
    if (!res.success) { Toast.error(res.message); return; }
    if (!res.data.length) {
      setHTML('medicines-table', '<tr><td colspan="8" class="table-empty">No medicines found</td></tr>');
      renderPagination('medicines-pagination', {page,total:res.total,limit:15}, `p=>Pharmacy.loadMedicines(p)`);
      return;
    }
    const rows = res.data.map(m => `
      <tr>
        <td><strong>${m.Medicine_Name}</strong><br><span class="text-sm text-gray">${m.Generic_Name||''}</span></td>
        <td>${m.Category_Name}</td>
        <td><span class="badge badge-gray">${m.Dosage_Form}</span></td>
        <td>${m.Strength}</td>
        <td>${m.Manufacturer||'—'}</td>
        <td>${Fmt.currency(m.Unit_Price)}</td>
        <td class="${m.Total_Stock===0?'text-danger':''}">${m.Total_Stock}</td>
        <td>${m.Requires_Rx ? '<span class="badge badge-warning">Rx</span>' : '<span class="badge badge-success">OTC</span>'}</td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn btn-ghost btn-sm" onclick="Pharmacy.openEditMedicine(${m.Medicine_ID})">✏️</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="Pharmacy.deleteMedicine(${m.Medicine_ID})">🗑️</button>
          </div>
        </td>
      </tr>`).join('');
    setHTML('medicines-table', rows);
    renderPagination('medicines-pagination', {page,total:res.total,limit:15}, `p=>Pharmacy.loadMedicines(p)`);
  },

  openAddMedicine() {
    $('medicine-modal-title').textContent = 'Add New Medicine';
    $('med-id').value = '';
    resetForm('medicine-form');
    this._populateMedCategorySelect();
    Modal.open('medicine-modal');
  },

  async openEditMedicine(id) {
    const res = await Api.get(`/pharmacy/medicines/${id}`);
    if (!res.success) { Toast.error(res.message); return; }
    const m = res.data;
    $('medicine-modal-title').textContent = 'Edit Medicine';
    $('med-id').value = id;
    this._populateMedCategorySelect();
    const f = $('medicine-form');
    f.querySelector('[name=category_id]').value   = m.Category_ID;
    f.querySelector('[name=medicine_name]').value = m.Medicine_Name;
    f.querySelector('[name=generic_name]').value  = m.Generic_Name||'';
    f.querySelector('[name=manufacturer]').value  = m.Manufacturer||'';
    f.querySelector('[name=dosage_form]').value   = m.Dosage_Form||'Tablet';
    f.querySelector('[name=strength]').value      = m.Strength||'';
    f.querySelector('[name=unit_price]').value    = m.Unit_Price||0;
    f.querySelector('[name=requires_rx]').value   = m.Requires_Rx||1;
    Modal.open('medicine-modal');
  },

  _populateMedCategorySelect() {
    const sel = $('medicine-form')?.querySelector('[name=category_id]');
    if (!sel) return;
    sel.innerHTML = `<option value="">Select Category</option>` +
      this.categories.map(c=>`<option value="${c.Category_ID}">${c.Category_Name}</option>`).join('');
  },

  async saveMedicine() {
    const id   = $('med-id').value;
    const data = serializeForm('medicine-form');
    if (!data.medicine_name || !data.strength || !data.category_id) {
      Toast.warning('Name, Strength and Category are required'); return;
    }
    const btn = $('btn-save-medicine');
    if (btn) btn.disabled = true;
    const res = id
      ? await Api.put(`/pharmacy/medicines/${id}`, data)
      : await Api.post('/pharmacy/medicines', data);
    if (btn) btn.disabled = false;
    if (res.success) {
      Toast.success(id ? 'Medicine updated' : 'Medicine added');
      Modal.close('medicine-modal');
      this.loadMedicines(this.page);
    } else Toast.error(res.message);
  },

  async deleteMedicine(id) {
    if (!confirm('Deactivate this medicine?')) return;
    const res = await Api.delete(`/pharmacy/medicines/${id}`);
    if (res.success) { Toast.success('Medicine deactivated'); this.loadMedicines(this.page); }
    else Toast.error(res.message);
  },

  // ── INVENTORY ──────────────────────────────────────────────

  async loadInventory(page=1) {
    loading('inventory-table');
    const status = $('inv-status-filter')?.value||'';
    const res = await Api.getQ('/pharmacy/inventory', { status, page, limit: 15 });
    if (!res.success) { Toast.error(res.message); return; }
    if (!res.data.length) {
      setHTML('inventory-table', '<tr><td colspan="9" class="table-empty">No inventory records</td></tr>');
      renderPagination('inv-pagination', {page,total:res.total,limit:15}, `p=>Pharmacy.loadInventory(p)`);
      return;
    }
    const rows = res.data.map(i => `
      <tr>
        <td><strong>${i.Medicine_Name}</strong><br><span class="text-sm text-gray">${i.Strength}</span></td>
        <td>${i.Pharmacy_Name}</td>
        <td>${i.Batch_Number||'—'}</td>
        <td>${Fmt.date(i.Expiry_Date)}</td>
        <td class="${i.Quantity_In_Stock<=i.Reorder_Level?'text-danger text-bold':''}">${i.Quantity_In_Stock}</td>
        <td>${i.Reorder_Level}</td>
        <td>${Fmt.status(i.Stock_Status)}</td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn btn-outline btn-sm" onclick="Pharmacy.openStockUpdate(${i.Inventory_ID},'${i.Medicine_Name}',${i.Quantity_In_Stock})">Update Stock</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="Pharmacy.deleteInventory(${i.Inventory_ID})">🗑️</button>
          </div>
        </td>
      </tr>`).join('');
    setHTML('inventory-table', rows);
    renderPagination('inv-pagination', {page,total:res.total,limit:15}, `p=>Pharmacy.loadInventory(p)`);
  },

  openAddInventory() {
    resetForm('inventory-form');
    $('inv-id').value = '';
    $('inv-modal-title').textContent = 'Add Inventory Record';
    this._populateInventorySelects();
    Modal.open('inventory-modal');
  },

  _populateInventorySelects() {
    const mSel = $('inventory-form')?.querySelector('[name=medicine_id]');
    const pSel = $('inventory-form')?.querySelector('[name=pharmacy_id]');
    if (mSel) {
      Api.getQ('/pharmacy/medicines', { limit: 100 }).then(r => {
        if (r.success) mSel.innerHTML = `<option value="">Select Medicine</option>` +
          r.data.map(m=>`<option value="${m.Medicine_ID}">${m.Medicine_Name} (${m.Strength})</option>`).join('');
      });
    }
    if (pSel) {
      pSel.innerHTML = `<option value="">Select Pharmacy</option>` +
        this.locations.map(p=>`<option value="${p.Pharmacy_ID}">${p.Pharmacy_Name}</option>`).join('');
    }
  },

  async saveInventory() {
    const data = serializeForm('inventory-form');
    if (!data.medicine_id || !data.pharmacy_id || !data.expiry_date) {
      Toast.warning('Medicine, Pharmacy and Expiry Date are required'); return;
    }
    const res = await Api.post('/pharmacy/inventory', {
      pharmacy_id:   data.pharmacy_id,
      medicine_id:   data.medicine_id,
      quantity:      data.quantity      || 0,
      reorder_level: data.reorder_level || 10,
      batch_number:  data.batch_number  || '',
      expiry_date:   data.expiry_date,
      unit_cost:     data.unit_cost     || 0,
    });
    if (res.success) {
      Toast.success('Inventory record added');
      Modal.close('inventory-modal');
      this.loadInventory(1);
    } else Toast.error(res.message);
  },

  openStockUpdate(id, name, current) {
    $('stock-inv-id').value         = id;
    $('stock-med-name').textContent = name;
    $('stock-current').textContent  = `Current stock: ${current}`;
    $('stock-qty').value            = '';
    Modal.open('stock-modal');
  },

  async saveStock() {
    const id  = $('stock-inv-id').value;
    const qty = parseInt($('stock-qty').value);
    if (isNaN(qty) || qty === 0) { Toast.warning('Enter a non-zero quantity (negative to deduct)'); return; }
    const res = await Api.put(`/pharmacy/inventory/${id}/stock`, { qty_change: qty });
    if (res.success) {
      Toast.success(`${res.message} — New qty: ${res.new_quantity}`);
      Modal.close('stock-modal');
      this.loadInventory(1);
    } else Toast.error(res.message);
  },

  async deleteInventory(id) {
    if (!confirm('Delete this inventory record?')) return;
    const res = await Api.delete(`/pharmacy/inventory/${id}`);
    if (res.success) { Toast.success('Deleted'); this.loadInventory(1); }
    else Toast.error(res.message);
  },

  // ── PHARMACY LOCATIONS ─────────────────────────────────────

  openAddPharmacy() {
    resetForm('pharmacy-loc-form');
    Modal.open('pharmacy-loc-modal');
  },

  async savePharmacy() {
    const data = serializeForm('pharmacy-loc-form');
    if (!data.pharmacy_name) { Toast.warning('Pharmacy name is required'); return; }
    const res = await Api.post('/pharmacy/locations', data);
    if (res.success) {
      Toast.success('Pharmacy location added');
      Modal.close('pharmacy-loc-modal');
      await this.loadMeta();
    } else Toast.error(res.message);
  },
};
