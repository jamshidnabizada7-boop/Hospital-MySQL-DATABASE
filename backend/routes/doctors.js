/**
 * routes/doctors.js — Role-based access
 * Admin:        full CRUD
 * Doctor:       read all; update only own profile
 * Receptionist: read only
 * Others:       read only (for booking)
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { authenticate, adminOr, ROLES } = require('../middleware/auth');

// GET /api/doctors
router.get('/', authenticate, async (req, res) => {
  const { search = '', dept_id, spec_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const like   = `%${search}%`;
  let where = `d.Is_Active=1 AND (d.First_Name LIKE ? OR d.Last_Name LIKE ? OR d.Email LIKE ?)`;
  const params = [like,like,like];
  if (dept_id) { where += ' AND d.Dept_ID=?'; params.push(dept_id); }
  if (spec_id) { where += ' AND d.Spec_ID=?'; params.push(spec_id); }
  try {
    const [rows] = await db.query(`
      SELECT d.Doctor_ID, d.First_Name, d.Last_Name, d.Gender, d.Date_Of_Birth,
             d.License_Number, d.Qualification, d.Experience_Years,
             d.Consultation_Fee, d.Phone, d.Email, d.Is_Active, d.Joined_Date, d.User_ID,
             dept.Dept_Name, s.Spec_Name,
             TIMESTAMPDIFF(YEAR, d.Date_Of_Birth, CURDATE()) AS Age,
             DoctorAvailable(d.Doctor_ID, CURDATE()) AS Available_Today
      FROM Doctor d
      JOIN Department     dept ON d.Dept_ID=dept.Dept_ID
      JOIN Specialization s    ON d.Spec_ID=s.Spec_ID
      WHERE ${where}
      ORDER BY d.Last_Name, d.First_Name
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Doctor d WHERE ${where}`, params);

    res.json({ success:true, data:rows, total, page:parseInt(page) });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/doctors/meta/departments
router.get('/meta/departments', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Dept_ID, Dept_Name FROM Department WHERE Is_Active=1 ORDER BY Dept_Name');
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/doctors/meta/specializations
router.get('/meta/specializations', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Spec_ID, Spec_Name FROM Specialization ORDER BY Spec_Name');
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
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
    if (!rows.length) return res.status(404).json({ success:false, message:'Doctor not found' });
    res.json({ success:true, data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/doctors — Admin only
router.post('/', authenticate, adminOr(), async (req, res) => {
  const { dept_id, spec_id, first_name, last_name, gender, date_of_birth,
          license_number, qualification, experience_years, consultation_fee, phone, email,
          new_password, password } = req.body;
  if (!first_name || !last_name || !dept_id || !spec_id || !license_number || !phone || !email)
    return res.status(400).json({ success:false, message:'Required: first_name, last_name, dept_id, spec_id, license_number, phone, email' });
  if (date_of_birth && new Date(date_of_birth) > new Date())
    return res.status(400).json({ success:false, message:'Date of Birth cannot be in the future' });
  
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get Role_ID for Doctor
    const [roleRows] = await conn.query('SELECT Role_ID FROM Role WHERE Role_Name = ?', [ROLES.DOCTOR]);
    if (!roleRows.length) throw new Error('Doctor role not found in database');
    const roleId = roleRows[0].Role_ID;

    // 2. Generate username and hash custom password
    let baseUsername = `${first_name.toLowerCase()}.${last_name.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    let username = baseUsername;
    let userSuffix = 1;
    
    // Ensure username uniqueness
    while (true) {
      const [existingUser] = await conn.query('SELECT User_ID FROM App_User WHERE Username = ?', [username]);
      if (!existingUser.length) break;
      username = `${baseUsername}${userSuffix}`;
      userSuffix++;
    }

    const customPassword = new_password || password;
    const finalPassword = (customPassword && customPassword.trim()) ? customPassword.trim() : 'admin123';
    const passwordHash = bcrypt.hashSync(finalPassword, 10);
    const fullName = `${first_name} ${last_name}`;

    // 3. Insert into App_User
    const [userResult] = await conn.query(`
      INSERT INTO App_User(Role_ID, Username, Password_Hash, Full_Name, Email, Phone)
      VALUES(?, ?, ?, ?, ?, ?)`,
      [roleId, username, passwordHash, fullName, email, phone]
    );
    const userId = userResult.insertId;

    // 4. Insert into Doctor with the User_ID
    const [doctorResult] = await conn.query(`
      INSERT INTO Doctor(User_ID, Dept_ID, Spec_ID, First_Name, Last_Name, Gender, Date_Of_Birth,
        License_Number, Qualification, Experience_Years, Consultation_Fee, Phone, Email)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [userId, dept_id, spec_id, first_name, last_name, gender||'Male', date_of_birth||'1980-01-01',
       license_number, qualification||'', experience_years||0, consultation_fee||0, phone, email]
    );

    await conn.commit();
    res.status(201).json({ 
      success: true, 
      id: doctorResult.insertId, 
      message: 'Doctor added',
      credentials: { username, password: 'admin123' }
    });
  } catch (err) { 
    await conn.rollback();
    res.status(500).json({ success:false, message:err.message }); 
  } finally {
    conn.release();
  }
});

// PUT /api/doctors/:id — Admin can update any; Doctor can only update own profile
router.put('/:id', authenticate, adminOr(ROLES.DOCTOR), async (req, res) => {
  // Doctor can only update their own record
  if (req.user.role === ROLES.DOCTOR && parseInt(req.params.id) !== req.user.doctorId)
    return res.status(403).json({ success:false, message:'You can only update your own profile' });

  const { dept_id, spec_id, first_name, last_name, gender, date_of_birth,
          license_number, qualification, experience_years, consultation_fee,
          phone, email, is_active } = req.body;
  if (date_of_birth && new Date(date_of_birth) > new Date())
    return res.status(400).json({ success:false, message:'Date of Birth cannot be in the future' });

  // Doctor cannot change dept/spec/license/active status
  const isDoctor = req.user.role === ROLES.DOCTOR;
  try {
    await db.query(`
      UPDATE Doctor SET
        First_Name=?, Last_Name=?, Gender=?, Date_Of_Birth=?,
        ${!isDoctor ? 'Dept_ID=?, Spec_ID=?, License_Number=?,' : ''}
        Qualification=?, Experience_Years=?, Consultation_Fee=?,
        Phone=?, Email=?
        ${!isDoctor ? ', Is_Active=?' : ''}
      WHERE Doctor_ID=?`,
      isDoctor
        ? [first_name, last_name, gender, date_of_birth||'1980-01-01',
           qualification||'', experience_years||0, consultation_fee||0,
           phone, email, req.params.id]
        : [first_name, last_name, gender, date_of_birth||'1980-01-01',
           dept_id, spec_id, license_number,
           qualification||'', experience_years||0, consultation_fee||0,
           phone, email, is_active!==undefined?is_active:1, req.params.id]);
    res.json({ success:true, message:'Doctor updated' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// DELETE /api/doctors/:id — Admin only
router.delete('/:id', authenticate, adminOr(), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM Doctor WHERE Doctor_ID=?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({ success: true, message: 'Doctor deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(409).json({ success: false, message: 'Cannot delete doctor because they have active lab orders or other dependencies.' });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

// GET /api/doctors/:id/available-dates — list future dates that have open slots
router.get('/:id/available-dates', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ds.Work_Date, COUNT(sl.Slot_ID) AS open_slots,
             ds.Start_Time, ds.End_Time
      FROM Doctor_Schedule ds
      JOIN Appointment_Slot sl ON sl.Schedule_ID=ds.Schedule_ID
      WHERE ds.Doctor_ID=?
        AND ds.Work_Date >= CURDATE()
        AND ds.Status='Available'
        AND sl.Status='Open'
      GROUP BY ds.Schedule_ID
      ORDER BY ds.Work_Date`, [req.params.id]);
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});
router.get('/:id/schedule', authenticate, async (req, res) => {
  // Doctor can only view own schedule
  if (req.user.role === ROLES.DOCTOR && parseInt(req.params.id) !== req.user.doctorId)
    return res.status(403).json({ success:false, message:'You can only view your own schedule' });

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
      WHERE ds.Doctor_ID=? AND ds.Work_Date BETWEEN ? AND ?
      ORDER BY ds.Work_Date, sl.Slot_Start`,
      [req.params.id, from||'2020-01-01', to||'2030-12-31']);
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/doctors/:id/schedule — Admin or the Doctor themselves
router.post('/:id/schedule', authenticate, adminOr(ROLES.DOCTOR), async (req, res) => {
  if (req.user.role === ROLES.DOCTOR && parseInt(req.params.id) !== req.user.doctorId)
    return res.status(403).json({ success:false, message:'You can only manage your own schedule' });

  const { work_date, start_time, end_time, slot_duration_min=30, notes='' } = req.body;
  if (new Date(work_date) < new Date(new Date().toDateString())) {
    return res.status(400).json({ success:false, message:'Cannot create a schedule in the past' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query(
      'SELECT Schedule_ID FROM Doctor_Schedule WHERE Doctor_ID=? AND Work_Date=?',
      [req.params.id, work_date]);
    if (existing.length) {
      await conn.rollback(); conn.release();
      return res.status(409).json({ success:false, message:'Schedule already exists for this date' });
    }
    const [sched] = await conn.query(
      'INSERT INTO Doctor_Schedule(Doctor_ID,Work_Date,Start_Time,End_Time,Notes) VALUES(?,?,?,?,?)',
      [req.params.id, work_date, start_time, end_time, notes]);
    const schedId = sched.insertId;

    // Auto-generate slots
    const [sh,sm] = start_time.split(':').map(Number);
    const [eh,em] = end_time.split(':').map(Number);
    let cur = sh*60+sm;
    const endMin = eh*60+em;
    const dur    = parseInt(slot_duration_min);
    const slots  = [];
    while (cur+dur <= endMin) {
      const s = `${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}:00`;
      const e = `${String(Math.floor((cur+dur)/60)).padStart(2,'0')}:${String((cur+dur)%60).padStart(2,'0')}:00`;
      slots.push([schedId, s, e]);
      cur += dur;
    }
    if (slots.length)
      await conn.query('INSERT INTO Appointment_Slot(Schedule_ID,Slot_Start,Slot_End) VALUES ?', [slots]);

    await conn.commit(); conn.release();
    res.status(201).json({ success:true, schedule_id:schedId, slots_created:slots.length });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
