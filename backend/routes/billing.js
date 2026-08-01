/**
 * routes/billing.js — Bills and Payments
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
      FROM Payment pay
      LEFT JOIN Employee e ON pay.Received_By=e.Emp_ID
      WHERE pay.Bill_ID=? ORDER BY pay.Payment_Date`, [req.params.id]);

    res.json({ success: true, data: bills[0], payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/billing/generate
router.post('/generate', authenticate, async (req, res) => {
  const { appointment_id, medicine_fee=0, lab_fee=0, other_fee=0, discount=0, tax=0 } = req.body;
  try {
    const [out] = await db.query(
      'CALL GenerateBill(?,?,?,?,?,?,@bid,@msg); SELECT @bid AS bill_id, @msg AS message;',
      [appointment_id, medicine_fee, lab_fee, other_fee, discount, tax]);
    const result = out[1][0];
    if (!result.bill_id) return res.status(400).json({ success: false, message: result.message });
    res.status(201).json({ success: true, bill_id: result.bill_id, message: result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/billing/:id/payment
router.post('/:id/payment', authenticate, async (req, res) => {
  const { amount, method = 'Cash', reference_no = '', emp_id } = req.body;
  try {
    const [out] = await db.query(
      'CALL ProcessPayment(?,?,?,?,?,@pid,@msg); SELECT @pid AS payment_id, @msg AS message;',
      [req.params.id, amount, method, reference_no, emp_id || null]);
    const result = out[1][0];
    if (!result.payment_id)
      return res.status(400).json({ success: false, message: result.message });
    res.json({ success: true, payment_id: result.payment_id, message: result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
