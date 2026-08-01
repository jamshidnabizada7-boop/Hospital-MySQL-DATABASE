/**
 * routes/doctors.js — Doctor CRUD + schedule
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/doctors
router.get('/', authenticate, async (req, res) => {
  const { search = '', dept_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const like   = `%${search}%`;
  try {
    let whereClause = `d.Is_Active=1 AND (d.First_Name LIKE ? OR d.Last_Name LIKE ? OR d.Email LIKE ?)`;
    const params    = [like, like, like];
    if (dept_id) { whereClause += ' AND d.Dept_ID=?'; params.push(dept_id); }

    const [rows] = await db.query(`
      SELECT d.Doctor_ID, d.First_Name, d.Last_Name, d.Gender, d.Date_Of_Birth,
             d.License_Number, d.Qualification, d.Experience_Years,
             d.Consultation_Fee, d.Phone, d.Email, d.Is_Active, d.Joined_Date,
             dept.Dept_Name, s.Spec_Name,
             TIMESTAMPDIFF(YEAR, d.Date_Of_Birth, CURDATE()) AS Age,
             DoctorAvailable(d.Doctor_ID, CURDATE()) AS Available_Today
      FROM Doctor d
      JOIN Department     dept ON d.Dept_ID=dept.Dept_ID
      JOIN Specialization s    ON d.Spec_ID=s.Spec_ID
      WHERE ${whereClause}
      ORDER BY d.Last_Name, d.First_Name
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Doctor d WHERE ${whereClause}`, params);

    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, dept.Dept_Name, s.Spec_Name,
             TIMESTAMPDIFF(YEAR, d.Date_Of_Birth, CURDATE()) AS Age
      FROM Doctor d
      JOIN Department dept ON d.Dept_ID=dept.Dept_ID
      JOIN Specialization s ON d.Spec_ID=s.Spec_ID
      WHERE d.Doctor_ID=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/doctors
router.post('/', authenticate, async (req, res) => {
  const { dept_id, spec_id, first_name, last_name, gender, date_of_birth,
          license_number, qualification, experience_years, consultation_fee,
          phone, email } = req.body;
  try {
    const [result] = await db.query(`
      INSERT INTO Doctor(Dept_ID,Spec_ID,First_Name,Last_Name,Gender,Date_Of_Birth,
        License_Number,Qualification,Experience_Years,Consultation_Fee,Phone,Email)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
      [dept_id,spec_id,first_name,last_name,gender,date_of_birth,
       license_number,qualification||'',experience_years||0,consultation_fee||0,phone,email]);
    res.status(201).json({ success: true, id: result.insertId, message: 'Doctor added' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/doctors/:id
router.put('/:id', authenticate, async (req, res) => {
  const { dept_id, spec_id, first_name, last_name, gender, date_of_birth,
          license_number, qualification, experience_years, consultation_fee,
          phone, email, is_active } = req.body;
  try {
    await db.query(`
      UPDATE Doctor SET Dept_ID=?,Spec_ID=?,First_Name=?,Last_Name=?,Gender=?,
        Date_Of_Birth=?,License_Number=?,Qualification=?,Experience_Years=?,
        Consultation_Fee=?,Phone=?,Email=?,Is_Active=?
      WHERE Doctor_ID=?`,
      [dept_id,spec_id,first_name,last_name,gender,date_of_birth,
       license_number,qualification||'',experience_years||0,consultation_fee||0,
       phone,email,is_active!==undefined?is_active:1,req.params.id]);
    res.json({ success: true, message: 'Doctor updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/doctors/:id/schedule — schedules with slots
router.get('/:id/schedule', authenticate, async (req, res) => {
  const { from, to } = req.query;
  try {
    const [rows] = await db.query(`
      SELECT ds.Schedule_ID, ds.Work_Date, ds.Start_Time, ds.End_Time, ds.Status,
             sl.Slot_ID, sl.Slot_Start, sl.Slot_End, sl.Status AS Slot_Status,
             a.Appointment_ID,
             CONCAT(p.First_Name,' ',p.Last_Name) AS Patient_Name
      FROM Doctor_Schedule ds
      LEFT JOIN Appointment_Slot sl ON sl.Schedule_ID=ds.Schedule_ID
      LEFT JOIN Appointment      a  ON a.Slot_ID=sl.Slot_ID
      LEFT JOIN Patient          p  ON a.Patient_ID=p.Patient_ID
      WHERE ds.Doctor_ID=?
        AND ds.Work_Date BETWEEN ? AND ?
      ORDER BY ds.Work_Date, sl.Slot_Start`,
      [req.params.id, from || '2020-01-01', to || '2030-12-31']);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/doctors/:id/schedule — add a schedule + generate slots
router.post('/:id/schedule', authenticate, async (req, res) => {
  const { work_date, start_time, end_time, slot_duration_min = 30, notes = '' } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT Schedule_ID FROM Doctor_Schedule WHERE Doctor_ID=? AND Work_Date=?',
      [req.params.id, work_date]);
    if (existing.length) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ success: false, message: 'Schedule already exists for this date' });
    }

    const [sched] = await conn.query(
      'INSERT INTO Doctor_Schedule(Doctor_ID,Work_Date,Start_Time,End_Time,Notes) VALUES(?,?,?,?,?)',
      [req.params.id, work_date, start_time, end_time, notes]);
    const schedId = sched.insertId;

    // Auto-generate slots
    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    let cur = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const dur    = parseInt(slot_duration_min);
    const slots  = [];
    while (cur + dur <= endMin) {
      const s = `${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}:00`;
      const e = `${String(Math.floor((cur+dur)/60)).padStart(2,'0')}:${String((cur+dur)%60).padStart(2,'0')}:00`;
      slots.push([schedId, s, e]);
      cur += dur;
    }
    if (slots.length) {
      await conn.query('INSERT INTO Appointment_Slot(Schedule_ID,Slot_Start,Slot_End) VALUES ?', [slots]);
    }

    await conn.commit();
    conn.release();
    res.status(201).json({ success: true, schedule_id: schedId, slots_created: slots.length });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/doctors/departments/list
router.get('/meta/departments', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Dept_ID, Dept_Name FROM Department WHERE Is_Active=1 ORDER BY Dept_Name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/doctors/meta/specializations
router.get('/meta/specializations', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Spec_ID, Spec_Name FROM Specialization ORDER BY Spec_Name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
