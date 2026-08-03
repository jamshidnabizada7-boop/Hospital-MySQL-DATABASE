/**
 * routes/appointments.js — Role-based access
 * Admin:        full access
 * Doctor:       see only own appointments; complete own appointments
 * Receptionist: book, cancel, view all
 * Others:       read only
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate, adminOr, ROLES } = require('../middleware/auth');

// GET /api/appointments
router.get('/', authenticate, adminOr(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.ACCOUNTANT, ROLES.LAB_TECH), async (req, res) => {
  const { status, date, doctor_id, patient_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  const params = [];

  // Doctors see only their own appointments
  if (req.user.role === ROLES.DOCTOR && req.user.doctorId) {
    where += ' AND ds.Doctor_ID=?'; params.push(req.user.doctorId);
  }

  if (status)     { where += ' AND a.Appointment_Status=?'; params.push(status); }
  if (date)       { where += ' AND ds.Work_Date=?';         params.push(date); }
  if (doctor_id && req.user.role !== ROLES.DOCTOR) { where += ' AND ds.Doctor_ID=?'; params.push(doctor_id); }
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
router.get('/slots/available', authenticate, adminOr(ROLES.RECEPTIONIST, ROLES.DOCTOR), async (req, res) => {
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
router.get('/:id', authenticate, adminOr(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, p.First_Name AS p_first, p.Last_Name AS p_last, p.Phone AS p_phone,
             d.First_Name AS d_first, d.Last_Name AS d_last, d.Doctor_ID,
             dept.Dept_Name, ds.Work_Date, sl.Slot_Start, sl.Slot_End, ds.Doctor_ID AS Doctor_ID
      FROM Appointment a
      JOIN Patient          p    ON a.Patient_ID=p.Patient_ID
      JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      WHERE a.Appointment_ID=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    // Doctor can only view own appointment
    if (req.user.role === ROLES.DOCTOR && rows[0].Doctor_ID !== req.user.doctorId)
      return res.status(403).json({ success: false, message: 'You can only view your own appointments' });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments — Receptionist or Admin can book
router.post('/', authenticate, adminOr(ROLES.RECEPTIONIST), async (req, res) => {
  const { patient_id, slot_id, reason } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[slot]] = await conn.query('SELECT Status FROM Appointment_Slot WHERE Slot_ID=? FOR UPDATE', [slot_id]);
    if (!slot)              { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Slot not found' }); }
    if (slot.Status!=='Open'){ await conn.rollback(); conn.release(); return res.status(409).json({ success:false, message:'Slot is not available' }); }
    const [result] = await conn.query(
      'INSERT INTO Appointment(Patient_ID,Slot_ID,Reason) VALUES(?,?,?)',
      [patient_id, slot_id, reason||'']);
    await conn.query('UPDATE Appointment_Slot SET Status=? WHERE Slot_ID=?', ['Booked', slot_id]);
    await conn.commit(); conn.release();
    res.status(201).json({ success:true, id: result.insertId, message:'Appointment booked successfully' });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/cancel — Receptionist or Admin
router.put('/:id/cancel', authenticate, adminOr(ROLES.RECEPTIONIST), async (req, res) => {
  const { reason = '' } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[appt]] = await conn.query(
      'SELECT Appointment_Status,Slot_ID FROM Appointment WHERE Appointment_ID=? FOR UPDATE', [req.params.id]);
    if (!appt)                                { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Not found' }); }
    if (appt.Appointment_Status!=='Scheduled'){ await conn.rollback(); conn.release(); return res.status(400).json({ success:false, message:`Cannot cancel a ${appt.Appointment_Status} appointment` }); }
    await conn.query('UPDATE Appointment SET Appointment_Status=?,Cancelled_Reason=? WHERE Appointment_ID=?',['Cancelled',reason,req.params.id]);
    await conn.query('UPDATE Appointment_Slot SET Status=? WHERE Slot_ID=?', ['Open', appt.Slot_ID]);
    await conn.commit(); conn.release();
    res.json({ success:true, message:'Appointment cancelled' });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/complete — Doctor completes own, Admin can do any
router.put('/:id/complete', authenticate, adminOr(ROLES.DOCTOR), async (req, res) => {
  const { diagnosis, treatment, notes } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[appt]] = await conn.query(`
      SELECT a.Appointment_Status, a.Slot_ID, ds.Doctor_ID
      FROM Appointment a
      JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds ON sl.Schedule_ID=ds.Schedule_ID
      WHERE a.Appointment_ID=? FOR UPDATE`, [req.params.id]);

    if (!appt) { await conn.rollback(); conn.release(); return res.status(404).json({ success:false, message:'Not found' }); }
    if (appt.Appointment_Status !== 'Scheduled') { await conn.rollback(); conn.release(); return res.status(400).json({ success:false, message:'Appointment must be Scheduled to complete' }); }

    // Doctor can only complete their own appointments
    if (req.user.role === ROLES.DOCTOR && appt.Doctor_ID !== req.user.doctorId) {
      await conn.rollback(); conn.release();
      return res.status(403).json({ success:false, message:'You can only complete your own appointments' });
    }

    await conn.query('UPDATE Appointment SET Appointment_Status=? WHERE Appointment_ID=?', ['Completed', req.params.id]);
    await conn.query('UPDATE Appointment_Slot SET Status=? WHERE Slot_ID=?', ['Completed', appt.Slot_ID]);
    await conn.query(`UPDATE Medical_Record SET Diagnosis=?,Treatment=?,Visit_Notes=? WHERE Appointment_ID=?`,
      [diagnosis||'Pending', treatment||'', notes||null, req.params.id]);
    const [[rec]] = await conn.query('SELECT Record_ID FROM Medical_Record WHERE Appointment_ID=?', [req.params.id]);
    await conn.commit(); conn.release();
    res.json({ success:true, record_id: rec?.Record_ID, message:'Appointment completed and medical record created' });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
