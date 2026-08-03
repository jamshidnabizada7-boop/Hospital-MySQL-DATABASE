/**
 * routes/notifications.js — Notification counts and details
 */
const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications/count
router.get('/count', authenticate, async (req, res) => {
  try {
    // Run all queries in parallel
    const [
      [[billCount]],
      [billsDetail],
      [[labCount]],
      [labsDetail],
      [[stockCount]],
      [stockDetail],
      [[followCount]],
      [followDetail],
    ] = await Promise.all([

      // Pending bills count
      db.query(`SELECT COUNT(*) AS n FROM Bill WHERE Bill_Status IN ('Pending','Partial')`),

      // Top 5 pending bills
      db.query(`
        SELECT b.Bill_ID, b.Balance_Due,
               CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name
        FROM Bill b
        JOIN Appointment a ON b.Appointment_ID=a.Appointment_ID
        JOIN Patient     p ON a.Patient_ID=p.Patient_ID
        WHERE b.Bill_Status IN ('Pending','Partial')
        ORDER BY b.Balance_Due DESC LIMIT 5`),

      // Unreviewed abnormal lab results (last 7 days)
      db.query(`SELECT COUNT(*) AS n FROM Lab_Result WHERE Is_Abnormal=1
                AND Result_Date >= DATE_SUB(NOW(), INTERVAL 7 DAY)`),

      // Top 5 abnormal lab results
      db.query(`
        SELECT lr.Result, lt.Test_Name,
               CONCAT(p.First_Name,' ',p.Last_Name) AS patient_name
        FROM Lab_Result lr
        JOIN Lab_Test   lt ON lr.Test_ID=lt.Test_ID
        JOIN Lab_Order  lo ON lr.Order_ID=lo.Order_ID
        JOIN Appointment a ON lo.Appointment_ID=a.Appointment_ID
        JOIN Patient     p ON a.Patient_ID=p.Patient_ID
        WHERE lr.Is_Abnormal=1
          AND lr.Result_Date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY lr.Result_Date DESC LIMIT 5`),

      // Low stock count
      db.query(`SELECT COUNT(*) AS n FROM Inventory
                WHERE Quantity_In_Stock <= Reorder_Level AND Expiry_Date >= CURDATE()`),

      // Top 4 low stock items
      db.query(`
        SELECT m.Medicine_Name, m.Strength, i.Quantity_In_Stock, i.Reorder_Level
        FROM Inventory i JOIN Medicine m ON i.Medicine_ID=m.Medicine_ID
        WHERE i.Quantity_In_Stock <= i.Reorder_Level AND i.Expiry_Date >= CURDATE()
        ORDER BY (i.Reorder_Level - i.Quantity_In_Stock) DESC LIMIT 4`),

      // Follow-ups due this week
      db.query(`SELECT COUNT(*) AS n FROM Medical_Record
                WHERE Follow_Up_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`),

      // Follow-up details
      db.query(`
        SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient_Name,
               CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor_Name,
               mr.Follow_Up_Date
        FROM Medical_Record mr
        JOIN Appointment      a    ON mr.Appointment_ID=a.Appointment_ID
        JOIN Patient          p    ON a.Patient_ID=p.Patient_ID
        JOIN Appointment_Slot sl   ON a.Slot_ID=sl.Slot_ID
        JOIN Doctor_Schedule  ds   ON sl.Schedule_ID=ds.Schedule_ID
        JOIN Doctor           d    ON ds.Doctor_ID=d.Doctor_ID
        WHERE mr.Follow_Up_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY mr.Follow_Up_Date LIMIT 4`),
    ]);

    res.json({
      success:       true,
      pending_bills: billCount.n,
      bills_detail:  billsDetail,
      abnormal_labs: labCount.n,
      labs_detail:   labsDetail,
      low_stock:     stockCount.n,
      stock_detail:  stockDetail,
      follow_ups:    followCount.n,
      followup_detail: followDetail,
      total:         billCount.n + labCount.n + stockCount.n + followCount.n,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
