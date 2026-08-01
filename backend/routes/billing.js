/**
 * routes/billing.js — Bills and Payments (direct SQL, no stored proc output vars)
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/billing
router.get('/', authenticate, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = status ? 'AND b.Bill_Status=?' : '';
  const params = status ? [status] : [];
  try {
    const [rows] = await db.query(`
      SELECT b.Bill_ID, b.Bill_Date, b.Total_Amount, b.Amount_Paid, b.Balance_Due, b.Bill_Status,
             CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name, p.Phone AS patient_phone,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
             a.Appointment_ID, ds.Work_Date
      FROM Bill b
      JOIN Appointment      a    ON b.Appointment_ID=a.Appointment_ID
      JOIN Patient          p    ON a.Patient_ID=p.Patient_ID
      JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
      WHERE 1=1 ${where}
      ORDER BY b.Bill_Date DESC
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Bill b WHERE 1=1 ${where}`, params);

    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/billing/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [bills] = await db.query(`
      SELECT b.*,
             CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name, p.Phone AS patient_phone,
             p.Address, p.Insurance_No,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
             dept.Dept_Name, ds.Work_Date, sl.Slot_Start
      FROM Bill b
      JOIN Appointment      a    ON b.Appointment_ID=a.Appointment_ID
      JOIN Patient          p    ON a.Patient_ID=p.Patient_ID
      JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      WHERE b.Bill_ID=?`, [req.params.id]);
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found' });

    const [payments] = await db.query(`
      SELECT pay.*, CONCAT(e.First_Name,' ',e.Last_Name) AS received_by_name
      FROM Payment pay LEFT JOIN Employee e ON pay.Received_By=e.Emp_ID
      WHERE pay.Bill_ID=? ORDER BY pay.Payment_Date`, [req.params.id]);

    res.json({ success: true, data: bills[0], payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/billing/generate — direct INSERT (no stored proc)
router.post('/generate', authenticate, async (req, res) => {
  const { appointment_id, medicine_fee=0, lab_fee=0, other_fee=0, discount=0, tax=0 } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check appointment is completed and no bill exists yet
    const [[appt]] = await conn.query(`
      SELECT a.Appointment_Status, d.Consultation_Fee
      FROM Appointment a
      JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d  ON ds.Doctor_ID=d.Doctor_ID
      WHERE a.Appointment_ID=?`, [appointment_id]);

    if (!appt) { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Appointment not found' }); }
    if (appt.Appointment_Status !== 'Completed') { await conn.rollback(); conn.release(); return res.status(400).json({ success:false, message:'Bill can only be generated for completed appointments' }); }

    const [[existing]] = await conn.query('SELECT Bill_ID FROM Bill WHERE Appointment_ID=?', [appointment_id]);
    if (existing) { await conn.rollback(); conn.release(); return res.status(409).json({ success:false, message:'Bill already exists for this appointment' }); }

    const cf    = parseFloat(appt.Consultation_Fee) || 0;
    const mf    = parseFloat(medicine_fee) || 0;
    const lf    = parseFloat(lab_fee)      || 0;
    const of    = parseFloat(other_fee)    || 0;
    const disc  = parseFloat(discount)     || 0;
    const tx    = parseFloat(tax)          || 0;
    const total = cf + mf + lf + of + tx - disc;

    const [result] = await conn.query(`
      INSERT INTO Bill(Appointment_ID,Consultation_Fee,Medicine_Fee,Lab_Fee,
                       Other_Fee,Discount,Tax,Total_Amount,Balance_Due)
      VALUES(?,?,?,?,?,?,?,?,?)`,
      [appointment_id, cf, mf, lf, of, disc, tx, total, total]);

    await conn.commit();
    conn.release();
    res.status(201).json({ success: true, bill_id: result.insertId, message: 'Bill generated successfully' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/billing/:id/payment — direct INSERT (trigger handles Bill reconciliation)
router.post('/:id/payment', authenticate, async (req, res) => {
  const { amount, method = 'Cash', reference_no = '', emp_id } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[bill]] = await conn.query(
      'SELECT Balance_Due, Bill_Status FROM Bill WHERE Bill_ID=? FOR UPDATE', [req.params.id]);
    if (!bill) { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Bill not found' }); }
    if (parseFloat(amount) <= 0) { await conn.rollback(); conn.release(); return res.status(400).json({ success:false, message:'Amount must be positive' }); }
    if (['Paid','Cancelled','Waived'].includes(bill.Bill_Status)) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success:false, message:`Bill is already ${bill.Bill_Status}` });
    }

    const [result] = await conn.query(
      'INSERT INTO Payment(Bill_ID,Amount,Payment_Method,Reference_No,Received_By) VALUES(?,?,?,?,?)',
      [req.params.id, amount, method, reference_no || null, emp_id || null]);

    // Reconcile Bill (trigger also does this, but let's be explicit)
    const [[sumRow]] = await conn.query('SELECT SUM(Amount) AS total_paid FROM Payment WHERE Bill_ID=?', [req.params.id]);
    const totalPaid = parseFloat(sumRow.total_paid) || 0;
    const [[billRow]] = await conn.query('SELECT Total_Amount FROM Bill WHERE Bill_ID=?', [req.params.id]);
    const totalAmt  = parseFloat(billRow.Total_Amount);
    const balance   = Math.max(0, totalAmt - totalPaid);
    const newStatus = balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending';

    await conn.query(
      'UPDATE Bill SET Amount_Paid=?,Balance_Due=?,Bill_Status=? WHERE Bill_ID=?',
      [totalPaid, balance, newStatus, req.params.id]);

    await conn.commit();
    conn.release();
    res.json({ success: true, payment_id: result.insertId, message: 'Payment processed successfully' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/billing/:id — update bill notes/discount
router.put('/:id', authenticate, async (req, res) => {
  const { discount, tax, notes } = req.body;
  try {
    await db.query(
      'UPDATE Bill SET Discount=COALESCE(?,Discount),Tax=COALESCE(?,Tax),Notes=COALESCE(?,Notes) WHERE Bill_ID=?',
      [discount, tax, notes, req.params.id]);
    res.json({ success: true, message: 'Bill updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
