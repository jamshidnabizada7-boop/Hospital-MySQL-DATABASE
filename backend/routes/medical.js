/**
 * routes/medical.js — Role-based access
 * Admin:   full
 * Doctor:  read/write own records only
 * Others:  read only (Receptionist, Accountant)
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate, adminOr, ROLES } = require('../middleware/auth');

// Helper: verify doctor owns this record via appointment
async function doctorOwnsAppointment(doctorId, appointmentId) {
  const [rows] = await db.query(`
    SELECT ds.Doctor_ID FROM Appointment a
    JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
    JOIN Doctor_Schedule  ds ON sl.Schedule_ID=ds.Schedule_ID
    WHERE a.Appointment_ID=?`, [appointmentId]);
  return rows.length > 0 && rows[0].Doctor_ID === doctorId;
}

// GET /api/medical/records/:appointment_id
router.get('/records/:appointment_id', authenticate,
  adminOr(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.ACCOUNTANT, ROLES.LAB_TECH),
  async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM Medical_Record WHERE Appointment_ID=?', [req.params.appointment_id]);
      if (!rows.length) return res.status(404).json({ success:false, message:'No record found' });
      res.json({ success:true, data:rows[0] });
    } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// PUT /api/medical/records/:id — Doctor (own only) or Admin
router.put('/records/:id', authenticate, adminOr(ROLES.DOCTOR), async (req, res) => {
  const { diagnosis, treatment, visit_notes, follow_up_date } = req.body;
  try {
    // Verify doctor owns this record
    if (req.user.role === ROLES.DOCTOR) {
      const [rec] = await db.query('SELECT Appointment_ID FROM Medical_Record WHERE Record_ID=?', [req.params.id]);
      if (!rec.length) return res.status(404).json({ success:false, message:'Record not found' });
      const owns = await doctorOwnsAppointment(req.user.doctorId, rec[0].Appointment_ID);
      if (!owns) return res.status(403).json({ success:false, message:'You can only update your own medical records' });
    }
    await db.query(
      `UPDATE Medical_Record SET Diagnosis=?,Treatment=?,Visit_Notes=?,Follow_Up_Date=? WHERE Record_ID=?`,
      [diagnosis, treatment||'', visit_notes||null, follow_up_date||null, req.params.id]);
    res.json({ success:true, message:'Record updated' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/medical/prescriptions/:record_id
router.get('/prescriptions/:record_id', authenticate,
  adminOr(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.ACCOUNTANT),
  async (req, res) => {
    try {
      const [prescriptions] = await db.query(
        'SELECT * FROM Prescription WHERE Record_ID=? ORDER BY Prescription_Date DESC',
        [req.params.record_id]);
      for (const pr of prescriptions) {
        const [items] = await db.query(`
          SELECT pi.*, m.Medicine_Name, m.Generic_Name, m.Strength, m.Dosage_Form
          FROM Prescription_Item pi JOIN Medicine m ON pi.Medicine_ID=m.Medicine_ID
          WHERE pi.Prescription_ID=?`, [pr.Prescription_ID]);
        pr.items = items;
      }
      res.json({ success:true, data:prescriptions });
    } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/medical/prescriptions — Doctor (own) or Admin
router.post('/prescriptions', authenticate, adminOr(ROLES.DOCTOR), async (req, res) => {
  const { record_id, notes, items } = req.body;
  const conn = await db.getConnection();
  try {
    // Verify doctor owns this record
    if (req.user.role === ROLES.DOCTOR) {
      const [rec] = await db.query('SELECT Appointment_ID FROM Medical_Record WHERE Record_ID=?', [record_id]);
      if (!rec.length) return res.status(404).json({ success:false, message:'Record not found' });
      const owns = await doctorOwnsAppointment(req.user.doctorId, rec[0].Appointment_ID);
      if (!owns) return res.status(403).json({ success:false, message:'You can only prescribe for your own patients' });
    }
    await conn.beginTransaction();
    const [pr] = await conn.query('INSERT INTO Prescription(Record_ID,Notes) VALUES(?,?)', [record_id, notes||null]);
    const prescId = pr.insertId;
    if (Array.isArray(items) && items.length) {
      for (const item of items) {
        await conn.query(`
          INSERT INTO Prescription_Item(Prescription_ID,Medicine_ID,Dosage,Frequency,Duration_Days,Instructions)
          VALUES(?,?,?,?,?,?)`,
          [prescId, item.medicine_id, item.dosage, item.frequency, item.duration_days||1, item.instructions||'']);
      }
    }
    await conn.commit(); conn.release();
    res.status(201).json({ success:true, prescription_id:prescId });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/medical/history/:patient_id
router.get('/history/:patient_id', authenticate,
  adminOr(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.ACCOUNTANT),
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT ds.Work_Date, sl.Slot_Start,
               CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
               dept.Dept_Name, a.Reason, a.Appointment_Status,
               mr.Record_ID, mr.Diagnosis, mr.Treatment, mr.Visit_Notes, mr.Follow_Up_Date,
               a.Appointment_ID
        FROM Appointment a
        JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
        JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
        JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
        JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
        LEFT JOIN Medical_Record mr ON mr.Appointment_ID=a.Appointment_ID
        WHERE a.Patient_ID=? ORDER BY ds.Work_Date DESC`, [req.params.patient_id]);
      res.json({ success:true, data:rows });
    } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
