/**
 * routes/patients.js — Role-based access
 * Admin:        full CRUD
 * Receptionist: full CRUD
 * Doctor:       read only (their own patients)
 * Accountant:   read only
 * Lab_Tech:     read only
 * Pharmacist:   no access
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate, adminOr, ROLES } = require('../middleware/auth');

const canRead  = adminOr(ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.ACCOUNTANT, ROLES.LAB_TECH);
const canWrite = adminOr(ROLES.RECEPTIONIST);

// GET /api/patients
router.get('/', authenticate, canRead, async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const like   = `%${search}%`;
  try {
    const [rows] = await db.query(`
      SELECT Patient_ID, First_Name, Last_Name, Gender, Date_Of_Birth, Blood_Group,
             Phone, Email, Address, Emergency_Name, Emergency_Phone,
             Insurance_No, Is_Active, Registered_At,
             TIMESTAMPDIFF(YEAR, Date_Of_Birth, CURDATE()) AS Age
      FROM Patient
      WHERE Is_Active=1
        AND (First_Name LIKE ? OR Last_Name LIKE ? OR CONCAT(First_Name, ' ', Last_Name) LIKE ? OR Phone LIKE ? OR Email LIKE ?)
      ORDER BY Last_Name, First_Name
      LIMIT ? OFFSET ?`, [like,like,like,like,like, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Patient
       WHERE Is_Active=1 AND (First_Name LIKE ? OR Last_Name LIKE ? OR CONCAT(First_Name, ' ', Last_Name) LIKE ? OR Phone LIKE ? OR Email LIKE ?)`,
      [like,like,like,like,like]);

    res.json({ success:true, data:rows, total, page:parseInt(page), limit:parseInt(limit) });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/patients/:id
router.get('/:id', authenticate, canRead, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *, TIMESTAMPDIFF(YEAR, Date_Of_Birth, CURDATE()) AS Age FROM Patient WHERE Patient_ID=?`,
      [req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Patient not found' });
    res.json({ success:true, data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/patients — Admin, Receptionist
router.post('/', authenticate, canWrite, async (req, res) => {
  const { first_name, last_name, gender, date_of_birth, blood_group,
          phone, email, address, emergency_name, emergency_phone, insurance_no } = req.body;
  if (!first_name || !last_name || !phone || !date_of_birth)
    return res.status(400).json({ success:false, message:'first_name, last_name, phone, date_of_birth required' });
  if (date_of_birth && new Date(date_of_birth) > new Date())
    return res.status(400).json({ success:false, message:'Date of Birth cannot be in the future' });
  try {
    const [result] = await db.query(`
      INSERT INTO Patient(First_Name,Last_Name,Gender,Date_Of_Birth,Blood_Group,
        Phone,Email,Address,Emergency_Name,Emergency_Phone,Insurance_No)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      [first_name,last_name,gender||'Male',date_of_birth,blood_group||'Unknown',
       phone,email||null,address||'',emergency_name||'',emergency_phone||'',insurance_no||null]);
    res.status(201).json({ success:true, id:result.insertId, message:'Patient registered' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// PUT /api/patients/:id — Admin, Receptionist
router.put('/:id', authenticate, canWrite, async (req, res) => {
  const { first_name, last_name, gender, date_of_birth, blood_group,
          phone, email, address, emergency_name, emergency_phone, insurance_no } = req.body;
  if (date_of_birth && new Date(date_of_birth) > new Date())
    return res.status(400).json({ success:false, message:'Date of Birth cannot be in the future' });
  try {
    await db.query(`
      UPDATE Patient SET First_Name=?,Last_Name=?,Gender=?,Date_Of_Birth=?,Blood_Group=?,
        Phone=?,Email=?,Address=?,Emergency_Name=?,Emergency_Phone=?,Insurance_No=?
      WHERE Patient_ID=?`,
      [first_name,last_name,gender,date_of_birth,blood_group,
       phone,email||null,address||'',emergency_name||'',emergency_phone||'',insurance_no||null,
       req.params.id]);
    res.json({ success:true, message:'Patient updated' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// DELETE /api/patients/:id — Admin only
router.delete('/:id', authenticate, adminOr(), async (req, res) => {
  try {
    await db.query('UPDATE Patient SET Is_Active=0 WHERE Patient_ID=?', [req.params.id]);
    res.json({ success:true, message:'Patient deactivated' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/patients/:id/history
router.get('/:id/history', authenticate, canRead, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ds.Work_Date, sl.Slot_Start,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
             dept.Dept_Name, a.Reason, a.Appointment_Status,
             mr.Diagnosis, mr.Treatment, mr.Visit_Notes, mr.Follow_Up_Date,
             mr.Record_ID, a.Appointment_ID
      FROM Appointment a
      JOIN Appointment_Slot sl  ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds  ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d   ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      LEFT JOIN Medical_Record mr ON mr.Appointment_ID=a.Appointment_ID
      WHERE a.Patient_ID=?
      ORDER BY ds.Work_Date DESC`, [req.params.id]);
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/patients/:id/appointments
router.get('/:id/appointments', authenticate, canRead, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.Appointment_ID, a.Reason, a.Appointment_Status,
             ds.Work_Date, sl.Slot_Start, sl.Slot_End,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name, dept.Dept_Name
      FROM Appointment a
      JOIN Appointment_Slot sl  ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds  ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d   ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      WHERE a.Patient_ID=? ORDER BY ds.Work_Date DESC`, [req.params.id]);
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
