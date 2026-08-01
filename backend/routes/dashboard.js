/**
 * routes/dashboard.js — Summary stats for the dashboard
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, async (req, res) => {
  try {
    const [[patients]]     = await db.query('SELECT COUNT(*) AS cnt FROM Patient WHERE Is_Active=1');
    const [[doctors]]      = await db.query('SELECT COUNT(*) AS cnt FROM Doctor  WHERE Is_Active=1');
    const [[todayAppts]]   = await db.query(`
      SELECT COUNT(*) AS cnt FROM Appointment a
      JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds ON sl.Schedule_ID=ds.Schedule_ID
      WHERE ds.Work_Date = CURDATE()`);
    const [[pendingBills]] = await db.query(`SELECT COUNT(*) AS cnt FROM Bill WHERE Bill_Status IN ('Pending','Partial')`);
    const [[revenue]]      = await db.query(`SELECT COALESCE(SUM(Amount),0) AS total FROM Payment WHERE DATE(Payment_Date)=CURDATE()`);
    const [[lowStock]]     = await db.query(`SELECT COUNT(*) AS cnt FROM Inventory WHERE Quantity_In_Stock <= Reorder_Level`);
    const [[labPending]]   = await db.query(`SELECT COUNT(*) AS cnt FROM Lab_Order WHERE Status='Pending'`);
    const [[scheduled]]    = await db.query(`SELECT COUNT(*) AS cnt FROM Appointment WHERE Appointment_Status='Scheduled'`);

    // Recent appointments
    const [recentAppts] = await db.query(`
      SELECT a.Appointment_ID,
             CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name,
             CONCAT(d.First_Name,' ',d.Last_Name) AS doctor_name,
             dept.Dept_Name AS department,
             ds.Work_Date, sl.Slot_Start, a.Appointment_Status
      FROM Appointment a
      JOIN Patient           p    ON a.Patient_ID=p.Patient_ID
      JOIN Appointment_Slot  sl   ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule   ds   ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor            d    ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department        dept ON d.Dept_ID=dept.Dept_ID
      ORDER BY ds.Work_Date DESC, sl.Slot_Start DESC LIMIT 10`);

    // Revenue last 7 days
    const [revenueChart] = await db.query(`
      SELECT DATE(Payment_Date) AS day, SUM(Amount) AS total
      FROM Payment
      WHERE Payment_Date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(Payment_Date) ORDER BY day`);

    // Dept appointment distribution
    const [deptDist] = await db.query(`
      SELECT dept.Dept_Name, COUNT(a.Appointment_ID) AS count
      FROM Appointment a
      JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d  ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      GROUP BY dept.Dept_ID ORDER BY count DESC`);

    res.json({
      success: true,
      stats: {
        total_patients:   patients.cnt,
        active_doctors:   doctors.cnt,
        today_appointments: todayAppts.cnt,
        pending_bills:    pendingBills.cnt,
        today_revenue:    revenue.total,
        low_stock_alerts: lowStock.cnt,
        lab_pending:      labPending.cnt,
        scheduled_appointments: scheduled.cnt,
      },
      recent_appointments: recentAppts,
      revenue_chart:       revenueChart,
      dept_distribution:   deptDist,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
