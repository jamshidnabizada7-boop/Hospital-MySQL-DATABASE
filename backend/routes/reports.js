/**
 * routes/reports.js — Analytics & report queries
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/reports/revenue?from=&to=
router.get('/revenue', authenticate, async (req, res) => {
  const { from = '2020-01-01', to = '2030-12-31' } = req.query;
  try {
    const [daily] = await db.query(`
      SELECT DATE(Payment_Date) AS day,
             COUNT(*) AS transactions,
             SUM(Amount) AS total,
             SUM(CASE WHEN Payment_Method='Cash'         THEN Amount ELSE 0 END) AS cash,
             SUM(CASE WHEN Payment_Method='Card'         THEN Amount ELSE 0 END) AS card,
             SUM(CASE WHEN Payment_Method='Insurance'    THEN Amount ELSE 0 END) AS insurance,
             SUM(CASE WHEN Payment_Method='Mobile_Money' THEN Amount ELSE 0 END) AS mobile
      FROM Payment
      WHERE DATE(Payment_Date) BETWEEN ? AND ?
      GROUP BY DATE(Payment_Date) ORDER BY day`, [from, to]);

    const [byDept] = await db.query(`
      SELECT dept.Dept_Name,
             COUNT(b.Bill_ID) AS bills,
             SUM(b.Total_Amount) AS billed,
             SUM(b.Amount_Paid)  AS collected,
             SUM(b.Balance_Due)  AS outstanding
      FROM Bill b
      JOIN Appointment      a    ON b.Appointment_ID=a.Appointment_ID
      JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
      JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
      JOIN Department       dept ON d.Dept_ID=dept.Dept_ID
      WHERE DATE(b.Bill_Date) BETWEEN ? AND ?
      GROUP BY dept.Dept_ID ORDER BY collected DESC`, [from, to]);

    const [[summary]] = await db.query(`
      SELECT SUM(Amount) AS total_collected,
             COUNT(*) AS total_transactions,
             AVG(Amount) AS avg_transaction
      FROM Payment WHERE DATE(Payment_Date) BETWEEN ? AND ?`, [from, to]);

    res.json({ success: true, daily, by_department: byDept, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/appointments?from=&to=
router.get('/appointments', authenticate, async (req, res) => {
  const { from = '2020-01-01', to = '2030-12-31' } = req.query;
  try {
    const [byStatus] = await db.query(`
      SELECT Appointment_Status, COUNT(*) AS count
      FROM Appointment GROUP BY Appointment_Status`);

    const [byDoctor] = await db.query(`
      SELECT CONCAT(d.First_Name,' ',d.Last_Name) AS doctor,
             dept.Dept_Name,
             COUNT(a.Appointment_ID) AS total,
             SUM(CASE WHEN a.Appointment_Status='Completed' THEN 1 ELSE 0 END) AS completed,
             SUM(CASE WHEN a.Appointment_Status='Cancelled' THEN 1 ELSE 0 END) AS cancelled
      FROM Doctor d
      LEFT JOIN Doctor_Schedule  ds ON ds.Doctor_ID=d.Doctor_ID
      LEFT JOIN Appointment_Slot sl ON sl.Schedule_ID=ds.Schedule_ID
      LEFT JOIN Appointment      a  ON a.Slot_ID=sl.Slot_ID
        AND ds.Work_Date BETWEEN ? AND ?
      JOIN Department dept ON d.Dept_ID=dept.Dept_ID
      GROUP BY d.Doctor_ID ORDER BY total DESC`, [from, to]);

    const [monthly] = await db.query(`
      SELECT DATE_FORMAT(ds.Work_Date,'%Y-%m') AS month,
             COUNT(a.Appointment_ID) AS total,
             SUM(CASE WHEN a.Appointment_Status='Completed' THEN 1 ELSE 0 END) AS completed
      FROM Appointment      a
      JOIN Appointment_Slot sl ON a.Slot_ID=sl.Slot_ID
      JOIN Doctor_Schedule  ds ON sl.Schedule_ID=ds.Schedule_ID
      WHERE ds.Work_Date BETWEEN ? AND ?
      GROUP BY month ORDER BY month`, [from, to]);

    res.json({ success: true, by_status: byStatus, by_doctor: byDoctor, monthly });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/inventory
router.get('/inventory', authenticate, async (req, res) => {
  try {
    const [lowStock] = await db.query(`
      SELECT m.Medicine_Name, m.Strength, ph.Pharmacy_Name,
             i.Quantity_In_Stock, i.Reorder_Level,
             (i.Reorder_Level - i.Quantity_In_Stock) AS deficit
      FROM Inventory i
      JOIN Medicine  m  ON i.Medicine_ID=m.Medicine_ID
      JOIN Pharmacy  ph ON i.Pharmacy_ID=ph.Pharmacy_ID
      WHERE i.Quantity_In_Stock <= i.Reorder_Level
      ORDER BY deficit DESC`);

    const [expiring] = await db.query(`
      SELECT m.Medicine_Name, m.Strength, ph.Pharmacy_Name,
             i.Batch_Number, i.Expiry_Date, i.Quantity_In_Stock,
             DATEDIFF(i.Expiry_Date, CURDATE()) AS days_left
      FROM Inventory i
      JOIN Medicine  m  ON i.Medicine_ID=m.Medicine_ID
      JOIN Pharmacy  ph ON i.Pharmacy_ID=ph.Pharmacy_ID
      WHERE i.Expiry_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
      ORDER BY i.Expiry_Date`);

    const [valuation] = await db.query(`
      SELECT ph.Pharmacy_Name,
             COUNT(i.Inventory_ID) AS lines,
             SUM(i.Quantity_In_Stock * i.Unit_Cost) AS stock_value
      FROM Inventory i JOIN Pharmacy ph ON i.Pharmacy_ID=ph.Pharmacy_ID
      GROUP BY ph.Pharmacy_ID`);

    res.json({ success: true, low_stock: lowStock, expiring, valuation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/lab
router.get('/lab', authenticate, async (req, res) => {
  try {
    const [abnormal] = await db.query(`
      SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS patient,
             lt.Test_Name, lr.Result, lt.Normal_Range, lr.Result_Date, lr.Remarks
      FROM Lab_Result lr
      JOIN Lab_Order  lo ON lr.Order_ID=lo.Order_ID
      JOIN Lab_Test   lt ON lr.Test_ID=lt.Test_ID
      JOIN Appointment a ON lo.Appointment_ID=a.Appointment_ID
      JOIN Patient    p  ON a.Patient_ID=p.Patient_ID
      WHERE lr.Is_Abnormal=1 ORDER BY lr.Result_Date DESC LIMIT 50`);

    const [byTest] = await db.query(`
      SELECT lt.Test_Name, lt.Test_Code,
             COUNT(lr.Result_ID) AS performed,
             SUM(CASE WHEN lr.Is_Abnormal=1 THEN 1 ELSE 0 END) AS abnormal_count,
             SUM(lt.Price) AS revenue
      FROM Lab_Result lr JOIN Lab_Test lt ON lr.Test_ID=lt.Test_ID
      GROUP BY lt.Test_ID ORDER BY performed DESC`);

    res.json({ success: true, abnormal_results: abnormal, by_test: byTest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
