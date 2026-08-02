/**
 * routes/billing.js — Role-based access
 * Admin:      full access
 * Accountant: full access
 * Receptionist: read only
 * Doctor:     read own bills only
 * Others:     no access
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate, adminOr, ROLES } = require('../middleware/auth');

const canRead  = adminOr(ROLES.ACCOUNTANT, ROLES.RECEPTIONIST, ROLES.DOCTOR);
const canWrite = adminOr(ROLES.ACCOUNTANT);

// GET /api/billing
router.get('/', authenticate, canRead, async (req, res) => {
  const { status, page=1, limit=20 } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where = '1=1';
  const params = [];
  if (status) { where += ' AND b.Bill_Status=?'; params.push(status); }

  // Doctor sees only their own patients' bills
  if (req.user.role === ROLES.DOCTOR && req.user.doctorId) {
    where += ' AND ds.Doctor_ID=?'; params.push(req.user.doctorId);
  }

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
      WHERE ${where}
      ORDER BY b.Bill_Date DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Bill b
       JOIN Appointment a ON b.Appointment_ID=a.Appointment_ID
       JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
       JOIN Doctor_Schedule ds ON sl.Schedule_ID=ds.Schedule_ID
       WHERE ${where}`, params);

    res.json({ success:true, data:rows, total, page:parseInt(page) });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/billing/:id
router.get('/:id', authenticate, canRead, async (req, res) => {
  try {
    const [bills] = await db.query(`
      SELECT b.*,
             CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name, p.Phone AS patient_phone,
             p.Address, p.Insurance_No,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
             dept.Dept_Name, ds.Work_Date, sl.Slot_Start, ds.Doctor_ID
      FROM Bill b
      JOIN Appointment      a    ON b.Appointment_ID=a.Appointment_ID
      JOIN Patient          p    ON a.Patient_ID=p.Patient_ID
      JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      WHERE b.Bill_ID=?`, [req.params.id]);
    if (!bills.length) return res.status(404).json({ success:false, message:'Bill not found' });

    if (req.user.role === ROLES.DOCTOR && bills[0].Doctor_ID !== req.user.doctorId)
      return res.status(403).json({ success:false, message:'Access denied' });

    const [payments] = await db.query(`
      SELECT pay.*, CONCAT(e.First_Name,' ',e.Last_Name) AS received_by_name
      FROM Payment pay LEFT JOIN Employee e ON pay.Received_By=e.Emp_ID
      WHERE pay.Bill_ID=? ORDER BY pay.Payment_Date`, [req.params.id]);

    res.json({ success:true, data:bills[0], payments });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/billing/generate — Accountant or Admin
router.post('/generate', authenticate, canWrite, async (req, res) => {
  const { appointment_id, medicine_fee=0, lab_fee=0, other_fee=0, discount=0, tax=0 } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[appt]] = await conn.query(`
      SELECT a.Appointment_Status, d.Consultation_Fee
      FROM Appointment a
      JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d  ON ds.Doctor_ID=d.Doctor_ID
      WHERE a.Appointment_ID=?`, [appointment_id]);
    if (!appt)                                     { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Appointment not found' }); }
    if (appt.Appointment_Status !== 'Completed')   { await conn.rollback(); conn.release(); return res.status(400).json({ success:false, message:'Bill can only be generated for completed appointments' }); }
    const [[existing]] = await conn.query('SELECT Bill_ID FROM Bill WHERE Appointment_ID=?', [appointment_id]);
    if (existing)                                  { await conn.rollback(); conn.release(); return res.status(409).json({ success:false, message:'Bill already exists for this appointment' }); }

    const cf=parseFloat(appt.Consultation_Fee)||0, mf=parseFloat(medicine_fee)||0;
    const lf=parseFloat(lab_fee)||0, of=parseFloat(other_fee)||0;
    const disc=parseFloat(discount)||0, tx=parseFloat(tax)||0;
    const total = cf+mf+lf+of+tx-disc;

    const [result] = await conn.query(`
      INSERT INTO Bill(Appointment_ID,Consultation_Fee,Medicine_Fee,Lab_Fee,Other_Fee,Discount,Tax,Total_Amount,Balance_Due)
      VALUES(?,?,?,?,?,?,?,?,?)`,
      [appointment_id,cf,mf,lf,of,disc,tx,total,total]);
    await conn.commit(); conn.release();
    res.status(201).json({ success:true, bill_id:result.insertId, message:'Bill generated successfully' });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ success:false, message:err.message });
  }
});

// POST /api/billing/:id/payment — Accountant or Admin
router.post('/:id/payment', authenticate, canWrite, async (req, res) => {
  const { amount, method='Cash', reference_no='', emp_id } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[bill]] = await conn.query('SELECT Balance_Due,Bill_Status,Total_Amount FROM Bill WHERE Bill_ID=? FOR UPDATE', [req.params.id]);
    if (!bill)                                          { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Bill not found' }); }
    if (parseFloat(amount)<=0)                          { await conn.rollback(); conn.release(); return res.status(400).json({ success:false, message:'Amount must be positive' }); }
    if (['Paid','Cancelled','Waived'].includes(bill.Bill_Status)) { await conn.rollback(); conn.release(); return res.status(400).json({ success:false, message:`Bill is already ${bill.Bill_Status}` }); }

    const receivedBy = emp_id || req.user.employeeId || null;
    const [result] = await conn.query(
      'INSERT INTO Payment(Bill_ID,Amount,Payment_Method,Reference_No,Received_By) VALUES(?,?,?,?,?)',
      [req.params.id, amount, method, reference_no||null, receivedBy]);

    const [[sumRow]] = await conn.query('SELECT SUM(Amount) AS total_paid FROM Payment WHERE Bill_ID=?', [req.params.id]);
    const totalPaid = parseFloat(sumRow.total_paid)||0;
    const balance   = Math.max(0, parseFloat(bill.Total_Amount)-totalPaid);
    const newStatus = balance<=0 ? 'Paid' : totalPaid>0 ? 'Partial' : 'Pending';

    await conn.query('UPDATE Bill SET Amount_Paid=?,Balance_Due=?,Bill_Status=? WHERE Bill_ID=?',
      [totalPaid, balance, newStatus, req.params.id]);

    await conn.commit(); conn.release();
    res.json({ success:true, payment_id:result.insertId, message:'Payment processed successfully' });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
