/**
 * pharmacy.js
 */
const Pharmacy = {
  page: 1, search: '', tab: 'medicines',

  async load() {
    this.loadMedicines();
    this.loadInventory();
  },

  async loadMedicines(page=1) {
    this.page = page;
    loading('medicines-table');
    const res = await Api.getQ('/pharmacy/medicines', { search: this.search, page, limit: 15 });
    if (!res.success) { Toast.error(res.message); return; }
    if (!res.data.length) {
      setHTML('medicines-table','<tr><td colspan="8" class="table-empty">No medicines found</td></tr>'); return;
    }
    const rows = res.data.map(m => `
      <tr>
        <td><strong>${m.Medicine_Name}</strong><br><span class="text-sm text-gray">${m.Generic_Name||''}</span></td>
        <td>${m.Category_Name}</td>
        <td><span class="badge badge-gray">${m.Dosage_Form}</span></td>
        <td>${m.Strength}</td>
        <td>${m.Manufacturer||'—'}</td>
        <td>${Fmt.currency(m.Unit_Price)}</td>
        <td>${m.Total_Stock}</td>
        <td>${m.Requires_Rx ? '<span class="badge badge-warning">Rx</span>' : '<span class="badge badge-success">OTC</span>'}</td>
      </tr>`).join('');
    setHTML('medicines-table', rows);
    renderPagination('medicines-pagination', {page,total:res.total,limit:15}, `p=>Pharmacy.loadMedicines(p)`);
  },

  async loadInventory(page=1) {
    loading('inventory-table');
    const status = $('inv-status-filter')?.value||'';
    const res = await Api.getQ('/pharmacy/inventory', { status, page, limit: 15 });
    if (!res.success) { Toast.error(res.message); return; }
    if (!res.data.length) {
      setHTML('inventory-table','<tr><td colspan="9" class="table-empty">No inventory records</td></tr>'); return;
    }
    const rows = res.data.map(i => `
      <tr>
        <td><strong>${i.Medicine_Name}</strong><br><span class="text-sm text-gray">${i.Strength}</span></td>
        <td>${i.Pharmacy_Name}</td>
        <td>${i.Batch_Number}</td>
        <td>${Fmt.date(i.Expiry_Date)}</td>
        <td class="${i.Quantity_In_Stock<=i.Reorder_Level?'text-danger':''}">${i.Quantity_In_Stock}</td>
        <td>${i.Reorder_Level}</td>
        <td>${Fmt.status(i.Stock_Status)}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="Pharmacy.openStockUpdate(${i.Inventory_ID},'${i.Medicine_Name}',${i.Quantity_In_Stock})">Update Stock</button>
        </td>
      </tr>`).join('');
    setHTML('inventory-table', rows);
    renderPagination('inv-pagination', {page,total:res.total,limit:15}, `p=>Pharmacy.loadInventory(p)`);
  },

  openStockUpdate(id, name, current) {
    $('stock-inv-id').value   = id;
    $('stock-med-name').textContent = name;
    $('stock-current').textContent  = `Current: ${current}`;
    $('stock-qty').value = '';
    Modal.open('stock-modal');
  },

  async saveStock() {
    const id  = $('stock-inv-id').value;
    const qty = parseInt($('stock-qty').value);
    if (isNaN(qty) || qty===0) { Toast.warning('Enter a non-zero quantity change (negative to deduct)'); return; }
    const res = await Api.put(`/pharmacy/inventory/${id}/stock`, { qty_change: qty });
    if (res.success) {
      Toast.success(res.message);
      Modal.close('stock-modal');
      this.loadInventory();
    } else Toast.error(res.message);
  },
};
