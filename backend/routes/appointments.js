/**
 * routes/appointments.js
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/appointments
router.get('/', authenticate, async (req, res) => {
  const { status, date, doctor_id, patient_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  const params = [];
  if (status)     { where += ' AND a.Appointment_Status=?'; params.push(status); }
  if (date)       { where += ' AND ds.Work_Date=?';         params.push(date); }
  if (doctor_id)  { where += ' AND ds.Doctor_ID=?';         params.push(doctor_id); }
  if (patient_id) { where += ' AND a.Patient_ID=?';         params.push(patient_id); }

  try {
    const [rows] = await db.query(`
      SELECT a.Appointment_ID, a.Reason, a.Appointment_Status, a.Created_At,
             CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name,
             p.Phone AS patient_phone, p.Patient_ID,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
             d.Doctor_ID, dept.Dept_Name,
             ds.Work_Date, sl.Slot_Start, sl.Slot_End, sl.Slot_ID
      FROM Appointment a
      JOIN Patient          p    ON a.Patient_ID=p.Patient_ID
      JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      WHERE ${where}
      ORDER BY ds.Work_Date DESC, sl.Slot_Start DESC
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM Appointment a
      JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds ON sl.Schedule_ID=ds.Schedule_ID
      WHERE ${where}`, params);

    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments/slots/available
router.get('/slots/available', authenticate, async (req, res) => {
  const { doctor_id, date } = req.query;
  if (!doctor_id || !date)
    return res.status(400).json({ success: false, message: 'doctor_id and date required' });
  try {
    const [rows] = await db.query(`
      SELECT sl.Slot_ID, sl.Slot_Start, sl.Slot_End, sl.Status,
             ds.Work_Date,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
             d.Consultation_Fee
      FROM Appointment_Slot sl
      JOIN Doctor_Schedule ds ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor          d  ON ds.Doctor_ID=d.Doctor_ID
      WHERE ds.Doctor_ID=? AND ds.Work_Date=? AND sl.Status='Open'
      ORDER BY sl.Slot_Start`, [doctor_id, date]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, p.First_Name AS p_first, p.Last_Name AS p_last, p.Phone AS p_phone,
             d.First_Name AS d_first, d.Last_Name AS d_last,
             dept.Dept_Name, ds.Work_Date, sl.Slot_Start, sl.Slot_End
      FROM Appointment a
      JOIN Patient          p    ON a.Patient_ID=p.Patient_ID
      JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      WHERE a.Appointment_ID=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments — book using direct INSERT (avoids SP output var issue)
router.post('/', authenticate, async (req, res) => {
  const { patient_id, slot_id, reason } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[slot]] = await conn.query(
      'SELECT Status FROM Appointment_Slot WHERE Slot_ID=? FOR UPDATE', [slot_id]);
    if (!slot)
      return conn.rollback().then(() => { conn.release(); res.status(404).json({ success: false, message: 'Slot not found' }); });
    if (slot.Status !== 'Open')
      return conn.rollback().then(() => { conn.release(); res.status(409).json({ success: false, message: 'Slot is not available' }); });

    const [result] = await conn.query(
      'INSERT INTO Appointment(Patient_ID,Slot_ID,Reason) VALUES(?,?,?)',
      [patient_id, slot_id, reason || '']);
    const appt_id = result.insertId;
    await conn.query('UPDATE Appointment_Slot SET Status=? WHERE Slot_ID=?', ['Booked', slot_id]);
    await conn.commit();
    conn.release();
    res.status(201).json({ success: true, id: appt_id, message: 'Appointment booked successfully' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/cancel
router.put('/:id/cancel', authenticate, async (req, res) => {
  const { reason = '' } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[appt]] = await conn.query(
      'SELECT Appointment_Status,Slot_ID FROM Appointment WHERE Appointment_ID=? FOR UPDATE',
      [req.params.id]);
    if (!appt)   { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Not found' }); }
    if (appt.Appointment_Status !== 'Scheduled') {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success:false, message:`Cannot cancel a ${appt.Appointment_Status} appointment` });
    }
    await conn.query(
      'UPDATE Appointment SET Appointment_Status=?,Cancelled_Reason=? WHERE Appointment_ID=?',
      ['Cancelled', reason, req.params.id]);
    await conn.query('UPDATE Appointment_Slot SET Status=? WHERE Slot_ID=?', ['Open', appt.Slot_ID]);
    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/complete
router.put('/:id/complete', authenticate, async (req, res) => {
  const { diagnosis, treatment, notes } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[appt]] = await conn.query(
      'SELECT Appointment_Status,Slot_ID FROM Appointment WHERE Appointment_ID=? FOR UPDATE',
      [req.params.id]);
    if (!appt || appt.Appointment_Status !== 'Scheduled') {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success:false, message:'Appointment must be Scheduled to complete' });
    }
    // Update appointment status (trigger auto-creates Medical_Record skeleton)
    await conn.query(
      'UPDATE Appointment SET Appointment_Status=? WHERE Appointment_ID=?',
      ['Completed', req.params.id]);
    await conn.query('UPDATE Appointment_Slot SET Status=? WHERE Slot_ID=?', ['Completed', appt.Slot_ID]);

    // Fill in the medical record created by the trigger
    await conn.query(
      `UPDATE Medical_Record SET Diagnosis=?,Treatment=?,Visit_Notes=?
       WHERE Appointment_ID=?`,
      [diagnosis || 'Pending', treatment || '', notes || null, req.params.id]);

    const [[rec]] = await conn.query(
      'SELECT Record_ID FROM Medical_Record WHERE Appointment_ID=?', [req.params.id]);

    await conn.commit();
    conn.release();
    res.json({ success: true, record_id: rec?.Record_ID, message: 'Appointment completed and medical record created' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
