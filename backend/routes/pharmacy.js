/**
 * routes/pharmacy.js — Medicine & Inventory
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/pharmacy/medicines
router.get('/medicines', authenticate, async (req, res) => {
  const { search = '', category_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const like   = `%${search}%`;
  let where = 'm.Is_Active=1 AND (m.Medicine_Name LIKE ? OR m.Generic_Name LIKE ?)';
  const params = [like, like];
  if (category_id) { where += ' AND m.Category_ID=?'; params.push(category_id); }
  try {
    const [rows] = await db.query(`
      SELECT m.Medicine_ID, m.Medicine_Name, m.Generic_Name, m.Manufacturer,
             m.Dosage_Form, m.Strength, m.Unit_Price, m.Requires_Rx,
             mc.Category_Name,
             COALESCE(SUM(i.Quantity_In_Stock),0) AS Total_Stock,
             MIN(i.Expiry_Date) AS Nearest_Expiry
      FROM Medicine m
      JOIN Medicine_Category mc ON m.Category_ID=mc.Category_ID
      LEFT JOIN Inventory    i  ON i.Medicine_ID=m.Medicine_ID
      WHERE ${where}
      GROUP BY m.Medicine_ID
      ORDER BY m.Medicine_Name
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Medicine m WHERE ${where}`, params);

    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pharmacy/inventory
router.get('/inventory', authenticate, async (req, res) => {
  const { pharmacy_id, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  const params = [];
  if (pharmacy_id) { where += ' AND i.Pharmacy_ID=?'; params.push(pharmacy_id); }
  if (status === 'low')     where += ' AND i.Quantity_In_Stock <= i.Reorder_Level';
  if (status === 'expired') where += ' AND i.Expiry_Date < CURDATE()';
  if (status === 'expiring') where += ' AND i.Expiry_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(),INTERVAL 30 DAY)';

  try {
    const [rows] = await db.query(`
      SELECT i.*, m.Medicine_Name, m.Generic_Name, m.Strength, m.Dosage_Form,
             mc.Category_Name, ph.Pharmacy_Name,
             DATEDIFF(i.Expiry_Date, CURDATE()) AS Days_Until_Expiry,
             CASE
               WHEN i.Expiry_Date < CURDATE() THEN 'Expired'
               WHEN i.Expiry_Date < DATE_ADD(CURDATE(),INTERVAL 30 DAY) THEN 'Expiring_Soon'
               WHEN i.Quantity_In_Stock <= i.Reorder_Level THEN 'Low_Stock'
               ELSE 'OK'
             END AS Stock_Status
      FROM Inventory i
      JOIN Medicine          m  ON i.Medicine_ID=m.Medicine_ID
      JOIN Medicine_Category mc ON m.Category_ID=mc.Category_ID
      JOIN Pharmacy          ph ON i.Pharmacy_ID=ph.Pharmacy_ID
      WHERE ${where}
      ORDER BY i.Expiry_Date
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Inventory i WHERE ${where}`, params);

    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/pharmacy/inventory/:id/stock
router.put('/inventory/:id/stock', authenticate, async (req, res) => {
  const { qty_change } = req.body;
  try {
    const [out] = await db.query(
      'CALL UpdateMedicineStock(?,?,@msg); SELECT @msg AS message;',
      [req.params.id, qty_change]);
    res.json({ success: true, message: out[1][0].message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pharmacy/categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Medicine_Category ORDER BY Category_Name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pharmacy/medicines
router.post('/medicines', authenticate, async (req, res) => {
  const { category_id, medicine_name, generic_name, manufacturer,
          dosage_form, strength, unit_price, requires_rx } = req.body;
  try {
    const [out] = await db.query(
      'CALL AddMedicine(?,?,?,?,?,?,?,?,@mid); SELECT @mid AS medicine_id;',
      [category_id, medicine_name, generic_name||'', manufacturer||'',
       dosage_form||'Tablet', strength, unit_price||0, requires_rx||1]);
    res.status(201).json({ success: true, medicine_id: out[1][0].medicine_id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
