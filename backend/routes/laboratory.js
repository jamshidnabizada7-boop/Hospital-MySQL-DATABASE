/**
 * routes/laboratory.js — Full CRUD: Lab Orders, Results, Tests
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/lab/orders
router.get('/orders', authenticate, async (req, res) => {
  const { status, priority, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  const params = [];
  if (status)   { where += ' AND lo.Status=?';   params.push(status); }
  if (priority) { where += ' AND lo.Priority=?'; params.push(priority); }
  try {
    const [rows] = await db.query(`
      SELECT lo.Order_ID, lo.Order_Date, lo.Priority, lo.Status, lo.Notes,
             CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name,
             p.Patient_ID,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
             a.Appointment_ID,
             COUNT(lr.Result_ID) AS results_count
      FROM Lab_Order lo
      JOIN Appointment a ON lo.Appointment_ID=a.Appointment_ID
      JOIN Patient     p ON a.Patient_ID=p.Patient_ID
      JOIN Doctor      d ON lo.Doctor_ID=d.Doctor_ID
      LEFT JOIN Lab_Result lr ON lr.Order_ID=lo.Order_ID
      WHERE ${where}
      GROUP BY lo.Order_ID
      ORDER BY lo.Order_Date DESC
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Lab_Order lo WHERE ${where}`, params);

    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/lab/orders/:id
router.get('/orders/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT lo.*,
             CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name,
             p.Date_Of_Birth, p.Blood_Group,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name
      FROM Lab_Order lo
      JOIN Appointment a ON lo.Appointment_ID=a.Appointment_ID
      JOIN Patient     p ON a.Patient_ID=p.Patient_ID
      JOIN Doctor      d ON lo.Doctor_ID=d.Doctor_ID
      WHERE lo.Order_ID=?`, [req.params.id]);
    if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found' });

    const [results] = await db.query(`
      SELECT lr.*, lt.Test_Name, lt.Test_Code, lt.Normal_Range, lt.Unit,
             CONCAT(e.First_Name,' ',e.Last_Name) AS performed_by_name
      FROM Lab_Result lr
      JOIN Lab_Test lt ON lr.Test_ID=lt.Test_ID
      LEFT JOIN Employee e ON lr.Performed_By=e.Emp_ID
      WHERE lr.Order_ID=?`, [req.params.id]);

    res.json({ success: true, data: orders[0], results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lab/orders
router.post('/orders', authenticate, async (req, res) => {
  const { appointment_id, doctor_id, priority = 'Routine', notes = '' } = req.body;
  if (!appointment_id || !doctor_id)
    return res.status(400).json({ success: false, message: 'appointment_id and doctor_id required' });
  try {
    const [result] = await db.query(
      'INSERT INTO Lab_Order(Appointment_ID,Doctor_ID,Priority,Notes) VALUES(?,?,?,?)',
      [appointment_id, doctor_id, priority, notes]);
    res.status(201).json({ success: true, order_id: result.insertId, message: 'Lab order created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/lab/orders/:id/status
router.put('/orders/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query('UPDATE Lab_Order SET Status=? WHERE Order_ID=?', [status, req.params.id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/lab/orders/:id
router.delete('/orders/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM Lab_Order WHERE Order_ID=? AND Status=?', [req.params.id, 'Pending']);
    res.json({ success: true, message: 'Order cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lab/orders/:id/results — direct INSERT
router.post('/orders/:id/results', authenticate, async (req, res) => {
  const { test_id, result, is_abnormal = 0, remarks = '', performed_by } = req.body;
  if (!test_id || !result)
    return res.status(400).json({ success: false, message: 'test_id and result required' });
  try {
    const [ins] = await db.query(
      'INSERT INTO Lab_Result(Order_ID,Test_ID,Result,Is_Abnormal,Remarks,Performed_By) VALUES(?,?,?,?,?,?)',
      [req.params.id, test_id, result, is_abnormal ? 1 : 0, remarks||null, performed_by||null]);

    // Auto-complete order if all tests have results
    await db.query(
      'UPDATE Lab_Order SET Status=? WHERE Order_ID=? AND Status!=?',
      ['In_Progress', req.params.id, 'Completed']);

    res.status(201).json({ success: true, result_id: ins.insertId, message: 'Result recorded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/lab/results/:id — update a result
router.put('/results/:id', authenticate, async (req, res) => {
  const { result, is_abnormal, remarks } = req.body;
  try {
    await db.query(
      'UPDATE Lab_Result SET Result=?,Is_Abnormal=?,Remarks=? WHERE Result_ID=?',
      [result, is_abnormal?1:0, remarks||null, req.params.id]);
    res.json({ success: true, message: 'Result updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/lab/results/:id
router.delete('/results/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM Lab_Result WHERE Result_ID=?', [req.params.id]);
    res.json({ success: true, message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/lab/tests
router.get('/tests', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM Lab_Test WHERE Is_Active=1 ORDER BY Test_Name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lab/tests
router.post('/tests', authenticate, async (req, res) => {
  const { test_name, test_code, category, normal_range, unit, price, turnaround_hrs } = req.body;
  if (!test_name || !test_code)
    return res.status(400).json({ success: false, message: 'test_name and test_code required' });
  try {
    const [result] = await db.query(`
      INSERT INTO Lab_Test(Test_Name,Test_Code,Category,Normal_Range,Unit,Price,Turnaround_Hrs)
      VALUES(?,?,?,?,?,?,?)`,
      [test_name, test_code, category||'', normal_range||'', unit||'', price||0, turnaround_hrs||24]);
    res.status(201).json({ success: true, test_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
