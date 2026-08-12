/**
 * routes/pharmacy.js — Role-based access
 * Admin:      full
 * Pharmacist: full CRUD on medicines, inventory, locations
 * Doctor:     read medicines/inventory
 * Others:     read only
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate, adminOr, ROLES } = require('../middleware/auth');

const canReadMeds  = adminOr(ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECH, ROLES.ACCOUNTANT);
const canWriteMeds = adminOr(ROLES.PHARMACIST);

// ── MEDICINES ──────────────────────────────────────────────────

router.get('/medicines', authenticate, canReadMeds, async (req, res) => {
  const { search='', category_id, page=1, limit=20 } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  const like = `%${search}%`;
  let where = 'm.Is_Active=1 AND (m.Medicine_Name LIKE ? OR m.Generic_Name LIKE ?)';
  const params = [like, like];
  if (category_id) { where += ' AND m.Category_ID=?'; params.push(category_id); }
  try {
    const [rows] = await db.query(`
      SELECT m.Medicine_ID, m.Medicine_Name, m.Generic_Name, m.Manufacturer,
             m.Dosage_Form, m.Strength, m.Unit_Price, m.Requires_Rx, mc.Category_Name,
             COALESCE(SUM(i.Quantity_In_Stock),0) AS Total_Stock,
             MIN(i.Expiry_Date) AS Nearest_Expiry
      FROM Medicine m
      JOIN Medicine_Category mc ON m.Category_ID=mc.Category_ID
      LEFT JOIN Inventory    i  ON i.Medicine_ID=m.Medicine_ID
      WHERE ${where} GROUP BY m.Medicine_ID ORDER BY m.Medicine_Name
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Medicine m WHERE ${where}`, params);
    res.json({ success:true, data:rows, total, page:parseInt(page) });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.get('/medicines/:id', authenticate, canReadMeds, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, mc.Category_Name FROM Medicine m
       JOIN Medicine_Category mc ON m.Category_ID=mc.Category_ID WHERE m.Medicine_ID=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.post('/medicines', authenticate, canWriteMeds, async (req, res) => {
  const { category_id, medicine_name, generic_name, manufacturer, dosage_form, strength, unit_price, requires_rx } = req.body;
  if (!medicine_name || !strength || !category_id)
    return res.status(400).json({ success:false, message:'medicine_name, strength, category_id required' });
  try {
    const [result] = await db.query(`
      INSERT INTO Medicine(Category_ID,Medicine_Name,Generic_Name,Manufacturer,Dosage_Form,Strength,Unit_Price,Requires_Rx)
      VALUES(?,?,?,?,?,?,?,?)`,
      [category_id,medicine_name,generic_name||'',manufacturer||'',dosage_form||'Tablet',strength,unit_price||0,requires_rx||1]);
    res.status(201).json({ success:true, medicine_id:result.insertId, message:'Medicine added' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.put('/medicines/:id', authenticate, canWriteMeds, async (req, res) => {
  const { category_id, medicine_name, generic_name, manufacturer, dosage_form, strength, unit_price, requires_rx, is_active } = req.body;
  try {
    await db.query(`
      UPDATE Medicine SET Category_ID=?,Medicine_Name=?,Generic_Name=?,Manufacturer=?,
        Dosage_Form=?,Strength=?,Unit_Price=?,Requires_Rx=?,Is_Active=? WHERE Medicine_ID=?`,
      [category_id,medicine_name,generic_name||'',manufacturer||'',dosage_form||'Tablet',
       strength,unit_price||0,requires_rx||1,is_active!==undefined?is_active:1,req.params.id]);
    res.json({ success:true, message:'Medicine updated' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.delete('/medicines/:id', authenticate, canWriteMeds, async (req, res) => {
  try {
    await db.query('UPDATE Medicine SET Is_Active=0 WHERE Medicine_ID=?', [req.params.id]);
    res.json({ success:true, message:'Medicine deactivated' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── PHARMACY LOCATIONS ─────────────────────────────────────────

router.get('/locations', authenticate, canReadMeds, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Pharmacy WHERE Is_Active=1 ORDER BY Pharmacy_Name');
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.post('/locations', authenticate, canWriteMeds, async (req, res) => {
  const { pharmacy_name, location, phone } = req.body;
  if (!pharmacy_name) return res.status(400).json({ success:false, message:'pharmacy_name required' });
  try {
    const [result] = await db.query(
      'INSERT INTO Pharmacy(Pharmacy_Name,Location,Phone) VALUES(?,?,?)',
      [pharmacy_name, location||'', phone||null]);
    res.status(201).json({ success:true, pharmacy_id:result.insertId });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.put('/locations/:id', authenticate, canWriteMeds, async (req, res) => {
  const { pharmacy_name, location, phone, is_active } = req.body;
  try {
    await db.query('UPDATE Pharmacy SET Pharmacy_Name=?,Location=?,Phone=?,Is_Active=? WHERE Pharmacy_ID=?',
      [pharmacy_name, location||'', phone||null, is_active!==undefined?is_active:1, req.params.id]);
    res.json({ success:true, message:'Pharmacy updated' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── INVENTORY ──────────────────────────────────────────────────

router.get('/inventory', authenticate, canReadMeds, async (req, res) => {
  const { pharmacy_id, status, page=1, limit=20 } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where = '1=1';
  const params = [];
  if (pharmacy_id)       { where += ' AND i.Pharmacy_ID=?'; params.push(pharmacy_id); }
  if (status==='low')      where += ' AND i.Quantity_In_Stock<=i.Reorder_Level';
  if (status==='expired')  where += ' AND i.Expiry_Date<CURDATE()';
  if (status==='expiring') where += ' AND i.Expiry_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(),INTERVAL 30 DAY)';
  try {
    const [rows] = await db.query(`
      SELECT i.*, m.Medicine_Name, m.Generic_Name, m.Strength, m.Dosage_Form,
             mc.Category_Name, ph.Pharmacy_Name,
             DATEDIFF(i.Expiry_Date,CURDATE()) AS Days_Until_Expiry,
             CASE WHEN i.Expiry_Date<CURDATE() THEN 'Expired'
                  WHEN i.Expiry_Date<DATE_ADD(CURDATE(),INTERVAL 30 DAY) THEN 'Expiring_Soon'
                  WHEN i.Quantity_In_Stock<=i.Reorder_Level THEN 'Low_Stock'
                  ELSE 'OK' END AS Stock_Status
      FROM Inventory i
      JOIN Medicine          m  ON i.Medicine_ID=m.Medicine_ID
      JOIN Medicine_Category mc ON m.Category_ID=mc.Category_ID
      JOIN Pharmacy          ph ON i.Pharmacy_ID=ph.Pharmacy_ID
      WHERE ${where} ORDER BY i.Expiry_Date LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM Inventory i WHERE ${where}`, params);
    res.json({ success:true, data:rows, total, page:parseInt(page) });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.post('/inventory', authenticate, canWriteMeds, async (req, res) => {
  const { pharmacy_id, medicine_id, quantity, reorder_level, batch_number, expiry_date, unit_cost } = req.body;
  if (!pharmacy_id||!medicine_id||!expiry_date)
    return res.status(400).json({ success:false, message:'pharmacy_id, medicine_id, expiry_date required' });
  try {
    const [result] = await db.query(`
      INSERT INTO Inventory(Pharmacy_ID,Medicine_ID,Quantity_In_Stock,Reorder_Level,Batch_Number,Expiry_Date,Unit_Cost)
      VALUES(?,?,?,?,?,?,?)`,
      [pharmacy_id,medicine_id,quantity||0,reorder_level||10,batch_number||'',expiry_date,unit_cost||0]);
    res.status(201).json({ success:true, inventory_id:result.insertId });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.put('/inventory/:id/stock', authenticate, canWriteMeds, async (req, res) => {
  const { qty_change } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[inv]] = await conn.query('SELECT Quantity_In_Stock FROM Inventory WHERE Inventory_ID=? FOR UPDATE', [req.params.id]);
    if (!inv) { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Not found' }); }
    const newQty = parseInt(inv.Quantity_In_Stock)+parseInt(qty_change);
    if (newQty<0) { await conn.rollback(); conn.release(); return res.status(400).json({ success:false, message:'Insufficient stock' }); }
    await conn.query('UPDATE Inventory SET Quantity_In_Stock=? WHERE Inventory_ID=?', [newQty, req.params.id]);
    await conn.commit(); conn.release();
    res.json({ success:true, message:'Stock updated', new_quantity:newQty });
  } catch (err) { await conn.rollback(); conn.release(); res.status(500).json({ success:false, message:err.message }); }
});

router.delete('/inventory/:id', authenticate, canWriteMeds, async (req, res) => {
  try {
    await db.query('DELETE FROM Inventory WHERE Inventory_ID=?', [req.params.id]);
    res.json({ success:true, message:'Deleted' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── CATEGORIES ─────────────────────────────────────────────────

router.get('/categories', authenticate, canReadMeds, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Medicine_Category ORDER BY Category_Name');
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.post('/categories', authenticate, canWriteMeds, async (req, res) => {
  const { category_name, description } = req.body;
  if (!category_name) return res.status(400).json({ success:false, message:'category_name required' });
  try {
    const [result] = await db.query(
      'INSERT INTO Medicine_Category(Category_Name,Description) VALUES(?,?)',
      [category_name, description||'']);
    res.status(201).json({ success:true, category_id:result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ success:false, message:'Category with this name already exists' });
    res.status(500).json({ success:false, message:err.message });
  }
});

router.delete('/categories/:id', authenticate, canWriteMeds, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM Medicine_Category WHERE Category_ID=?', [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success:false, message:'Category not found' });
    res.json({ success:true, message:'Category deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2')
      return res.status(409).json({ success:false, message:'Cannot delete category in use by medicines' });
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
