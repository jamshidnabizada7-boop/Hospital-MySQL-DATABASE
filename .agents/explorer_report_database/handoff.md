# Database Schema & SQL Scripts Analysis Report — Hospital Management System

## 1. Observation

### 1.1 Technical Environment & Database Engine
- **Database Management System**: MySQL 8.0 (InnoDB Engine, `utf8mb4` character set, `utf8mb4_unicode_ci` collation).
- **Schema File**: `d:\Hospital MYSQL Databse\Hospital_Management_System.sql` (2,401 lines).
- **Backend Database Client**: Node.js `mysql2/promise` pool (`backend/db.js`), connection limit 20, timezone `+00:00`.
- **Database Security Rules**: `SET FOREIGN_KEY_CHECKS = 0; SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';`.

### 1.2 Full Table Inventory (23 Relational Tables)

The database schema comprises **23 distinct tables** organized into 9 logical functional modules:

| Table Name | Module | Primary Key | Foreign Keys | Key Constraints & Indexes |
| :--- | :--- | :--- | :--- | :--- |
| `Role` | Security | `Role_ID` (INT UNSIGNED AUTO_INC) | None | Unique(`Role_Name`), Check(`CHAR_LENGTH(Role_Name) >= 2`) |
| `App_User` | Security | `User_ID` (INT UNSIGNED AUTO_INC) | `Role_ID` -> `Role(Role_ID)` (RESTRICT/CASCADE) | Unique(`Username`), Unique(`Email`), Check(`Email LIKE '%@%.%'`) |
| `Department` | Hospital | `Dept_ID` (INT UNSIGNED AUTO_INC) | `Head_Doctor` -> `Doctor(Doctor_ID)` (SET NULL/CASCADE) | Unique(`Dept_Name`) |
| `Specialization` | Hospital | `Spec_ID` (INT UNSIGNED AUTO_INC) | None | Unique(`Spec_Name`) |
| `Doctor` | Hospital | `Doctor_ID` (INT UNSIGNED AUTO_INC) | `Dept_ID` -> `Department(Dept_ID)`, `Spec_ID` -> `Specialization(Spec_ID)`, `User_ID` -> `App_User(User_ID)` | Unique(`License_Number`), Unique(`Email`), Check(`Consultation_Fee >= 0`), Check(`Experience_Years >= 0`), Index(`Last_Name, First_Name`), Index(`Dept_ID`), Index(`Spec_ID`), Index(`Is_Active`) |
| `Employee` | Hospital | `Emp_ID` (INT UNSIGNED AUTO_INC) | `Dept_ID` -> `Department(Dept_ID)`, `User_ID` -> `App_User(User_ID)` | Unique(`Email`), Check(`Salary >= 0`) |
| `Patient` | Patient | `Patient_ID` (INT UNSIGNED AUTO_INC) | `User_ID` -> `App_User(User_ID)` | Index(`Last_Name, First_Name`), Index(`Phone`), Index(`Date_Of_Birth`) |
| `Doctor_Schedule` | Scheduling | `Schedule_ID` (INT UNSIGNED AUTO_INC) | `Doctor_ID` -> `Doctor(Doctor_ID)` (CASCADE/CASCADE) | Check(`End_Time > Start_Time`), Index(`Doctor_ID`), Index(`Work_Date`), Index(`Status`) |
| `Appointment_Slot` | Scheduling | `Slot_ID` (INT UNSIGNED AUTO_INC) | `Schedule_ID` -> `Doctor_Schedule(Schedule_ID)` (CASCADE/CASCADE) | Check(`Slot_End > Slot_Start`), Index(`Schedule_ID`), Index(`Status`) |
| `Appointment` | Scheduling | `Appointment_ID` (INT UNSIGNED AUTO_INC) | `Patient_ID` -> `Patient(Patient_ID)` (RESTRICT/CASCADE), `Slot_ID` -> `Appointment_Slot(Slot_ID)` (RESTRICT/CASCADE) | Index(`Patient_ID`), Index(`Appointment_Status`), Key(`Slot_ID`) |
| `Medical_Record` | Clinical | `Record_ID` (INT UNSIGNED AUTO_INC) | `Appointment_ID` -> `Appointment(Appointment_ID)` (RESTRICT/CASCADE) | Unique(`Appointment_ID`) |
| `Prescription` | Clinical | `Prescription_ID` (INT UNSIGNED AUTO_INC) | `Record_ID` -> `Medical_Record(Record_ID)` (CASCADE/CASCADE) | None |
| `Prescription_Item` | Clinical | `Item_ID` (INT UNSIGNED AUTO_INC) | `Prescription_ID` -> `Prescription(Prescription_ID)` (CASCADE/CASCADE), `Medicine_ID` -> `Medicine(Medicine_ID)` (RESTRICT/CASCADE) | Check(`Duration_Days >= 1`) |
| `Medicine_Category` | Pharmacy | `Category_ID` (INT UNSIGNED AUTO_INC) | None | Unique(`Category_Name`) |
| `Medicine` | Pharmacy | `Medicine_ID` (INT UNSIGNED AUTO_INC) | `Category_ID` -> `Medicine_Category(Category_ID)` (RESTRICT/CASCADE) | Check(`Unit_Price >= 0`), Index(`Medicine_Name`), Index(`Category_ID`), Index(`Is_Active`) |
| `Pharmacy` | Pharmacy | `Pharmacy_ID` (INT UNSIGNED AUTO_INC) | None | Unique(`Pharmacy_Name`) |
| `Inventory` | Pharmacy | `Inventory_ID` (INT UNSIGNED AUTO_INC) | `Pharmacy_ID` -> `Pharmacy(Pharmacy_ID)` (RESTRICT/CASCADE), `Medicine_ID` -> `Medicine(Medicine_ID)` (RESTRICT/CASCADE) | Unique(`Pharmacy_ID, Medicine_ID, Batch_Number`), Check(`Quantity_In_Stock >= 0`), Check(`Unit_Cost >= 0`), Index(`Medicine_ID`), Index(`Expiry_Date`), Index(`Pharmacy_ID`) |
| `Lab_Test` | Laboratory | `Test_ID` (INT UNSIGNED AUTO_INC) | None | Unique(`Test_Code`), Check(`Price >= 0`) |
| `Lab_Order` | Laboratory | `Order_ID` (INT UNSIGNED AUTO_INC) | `Appointment_ID` -> `Appointment(Appointment_ID)` (RESTRICT/CASCADE), `Doctor_ID` -> `Doctor(Doctor_ID)` (RESTRICT/CASCADE) | Index(`Appointment_ID`), Index(`Status`) |
| `Lab_Result` | Laboratory | `Result_ID` (INT UNSIGNED AUTO_INC) | `Order_ID` -> `Lab_Order(Order_ID)` (RESTRICT/CASCADE), `Test_ID` -> `Lab_Test(Test_ID)` (RESTRICT/CASCADE), `Performed_By` -> `Employee(Emp_ID)` (SET NULL/CASCADE) | Unique(`Order_ID, Test_ID`) |
| `Bill` | Billing | `Bill_ID` (INT UNSIGNED AUTO_INC) | `Appointment_ID` -> `Appointment(Appointment_ID)` (RESTRICT/CASCADE) | Unique(`Appointment_ID`), Check(`Total_Amount >= 0 AND Discount >= 0 AND Amount_Paid >= 0`), Index(`Bill_Date`), Index(`Bill_Status`) |
| `Payment` | Billing | `Payment_ID` (INT UNSIGNED AUTO_INC) | `Bill_ID` -> `Bill(Bill_ID)` (RESTRICT/CASCADE), `Received_By` -> `Employee(Emp_ID)` (SET NULL/CASCADE) | Check(`Amount > 0`), Index(`Bill_ID`), Index(`Payment_Date`) |
| `Audit_Log` | System | `Log_ID` (BIGINT UNSIGNED AUTO_INC) | None | Index(`Table_Name, Changed_At`) |

---

### 1.3 Database Views (7 Views)

1. **`Upcoming_Appointments`**: Joins `Appointment`, `Patient`, `Appointment_Slot`, `Doctor_Schedule`, `Doctor`, and `Department` to display scheduled future patient appointments with patient phone numbers, doctor names, department, work date, and slot start/end times (`WHERE Appointment_Status = 'Scheduled' AND Work_Date >= CURRENT_DATE`).
2. **`Doctor_Daily_Schedule`**: Joins doctor schedules, slots, and left-joins appointments and patients to display today's schedule (`WHERE Work_Date = CURRENT_DATE`) for all active doctors.
3. **`Patient_Medical_History`**: Consolidates complete clinical histories per patient by joining `Patient`, `Appointment`, `Appointment_Slot`, `Doctor_Schedule`, `Doctor`, `Department`, and `Medical_Record` sorted chronologically (`ORDER BY Patient_ID, Visit_Date DESC`).
4. **`Outstanding_Bills`**: Filters bills where `Bill_Status IN ('Pending', 'Partial')` along with patient phone and balance due.
5. **`Available_Doctors`**: Aggregates open 30-minute appointment slots per doctor for current/future dates using `COUNT(sl.Slot_ID)` grouped by doctor and date.
6. **`Medicine_Inventory`**: Calculates `Days_Until_Expiry` via `DATEDIFF(Expiry_Date, CURRENT_DATE)` and assigns a dynamic `Stock_Status` (`Expired`, `Expiring_Soon`, `Low_Stock`, `OK`).
7. **`Lab_Test_Results`**: Combines lab test results with patient details, ordering doctor, test normal range, and abnormal indicators (`Is_Abnormal`).

---

### 1.4 Stored Functions (4 Functions)

```sql
-- 1. CalculateAge: Returns age in years
CREATE FUNCTION CalculateAge(p_dob DATE) RETURNS TINYINT UNSIGNED DETERMINISTIC READS SQL DATA
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_dob, CURRENT_DATE);
END$$

-- 2. CalculateBillTotal: Calculates net bill total after fee components, tax, and discount
CREATE FUNCTION CalculateBillTotal(p_bill_id INT UNSIGNED) RETURNS DECIMAL(10,2) DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;
    SELECT (Consultation_Fee + Medicine_Fee + Lab_Fee + Other_Fee + Tax - Discount)
    INTO v_total FROM Bill WHERE Bill_ID = p_bill_id;
    RETURN IFNULL(v_total, 0.00);
END$$

-- 3. DoctorAvailable: Checks if a doctor has open slots on a specific date
CREATE FUNCTION DoctorAvailable(p_doctor_id INT UNSIGNED, p_date DATE) RETURNS TINYINT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_count INT DEFAULT 0;
    SELECT COUNT(*) INTO v_count
    FROM Doctor_Schedule ds JOIN Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
    WHERE ds.Doctor_ID = p_doctor_id AND ds.Work_Date = p_date AND ds.Status = 'Available' AND sl.Status = 'Open';
    RETURN IF(v_count > 0, 1, 0);
END$$

-- 4. PatientAppointmentCount: Returns total visit count for a given patient
CREATE FUNCTION PatientAppointmentCount(p_patient_id INT UNSIGNED) RETURNS INT UNSIGNED DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_cnt INT UNSIGNED DEFAULT 0;
    SELECT COUNT(*) INTO v_cnt FROM Appointment WHERE Patient_ID = p_patient_id;
    RETURN v_cnt;
END$$
```

---

### 1.5 Stored Procedures (11 Procedures)

1. `RegisterPatient(...)`: Inserts new patient into `Patient` table and outputs `p_patient_id` via `LAST_INSERT_ID()`.
2. `BookAppointment(...)`: Uses `START TRANSACTION`, locks slot row with `SELECT Status ... FOR UPDATE`, checks availability, inserts `Appointment`, updates slot to `'Booked'`, and commits/rolls back atomically.
3. `CancelAppointment(...)`: Cancels scheduled appointment and re-opens the associated slot inside a row-locked transaction (`FOR UPDATE`).
4. `CompleteAppointment(...)`: Changes appointment status to `'Completed'`, updates slot status to `'Completed'`, and populates the auto-generated `Medical_Record` with diagnosis and treatment notes.
5. `GenerateBill(...)`: Verifies appointment completion, checks for existing bills, fetches consultation fee from `Doctor`, computes net total, and inserts into `Bill`.
6. `AddMedicine(...)`: Inserts medicine definition into `Medicine` catalog.
7. `UpdateMedicineStock(...)`: Adjusts inventory quantity with pessimistic locking (`FOR UPDATE`) and validates stock level against negative values.
8. `CreatePrescription(...)`: Creates a prescription header linked to a `Medical_Record`.
9. `OrderLabTest(...)`: Places a lab test order linked to an appointment and doctor.
10. `RecordLabResult(...)`: Inserts lab result metrics and flags abnormal findings.
11. `ProcessPayment(...)`: Validates bill status and payment amount, inserts payment transaction into `Payment`, triggering automatic recalculation of bill balance and payment status.

---

### 1.6 Database Triggers (7 Triggers)

1. **`trg_prevent_double_booking`** (`BEFORE INSERT ON Appointment`): Raises SQL exception (`SQLSTATE '45000'`) if target slot status is not `'Open'`.
2. **`trg_slot_booked_after_appointment`** (`AFTER INSERT ON Appointment`): Automatically updates slot status to `'Booked'`.
3. **`trg_prevent_expired_medicine`** (`BEFORE INSERT ON Prescription_Item`): Checks medicine expiry date and available stock level; blocks insertion with `45000` if expired or out of stock.
4. **`trg_update_bill_status_after_payment`** (`AFTER INSERT ON Payment`): Recalculates total paid amount via `SUM(Amount)`, updates `Amount_Paid` and `Balance_Due`, and transitions `Bill_Status` between `'Pending'`, `'Partial'`, and `'Paid'`.
5. **`trg_auto_medical_record_on_complete`** (`AFTER UPDATE ON Appointment`): When appointment status transitions to `'Completed'`, automatically inserts an initial stub record into `Medical_Record` if one does not already exist.
6. **`trg_audit_doctor_update`** (`AFTER UPDATE ON Doctor`): Writes old and new field values formatted as JSON objects (`JSON_OBJECT(...)`) into `Audit_Log`.
7. **`trg_audit_bill_update`** (`AFTER UPDATE ON Bill`): Captures bill state updates into `Audit_Log`.

---

### 1.7 Embedded SQL & Auto-Provisioning Transactions in Node.js Backend

1. **Employee Auto-Provisioning Transaction** (`backend/routes/employees.js`):
   - **Path**: `POST /api/employees`
   - **Transaction Logic**:
     1. Calls `conn.beginTransaction()`.
     2. Maps requested `job_title` to system role ID (`Role` lookup).
     3. Automatically generates a unique username using first name + last name pattern (e.g. `sara.ahmed`), checking collisions in `App_User` using a loop (`baseUsername` + suffix).
     4. Hashes password using `bcryptjs` (defaulting to `admin123` or custom password).
     5. Inserts into `App_User` and gets `User_ID`.
     6. Inserts into `Employee` linking `User_ID` and `Dept_ID`.
     7. Calls `conn.commit()`. On error, executes `conn.rollback()` and releases connection in `finally` block.
   - **Update/Delete Atomic Sync**:
     - `PUT /api/employees/:id`: Updates both `Employee` and linked `App_User` (full name, email, phone, role, password) inside `beginTransaction()` / `commit()`.
     - `DELETE /api/employees/:id`: Enforces **Self-Deletion Lockout Protection** preventing the logged-in administrator from deleting their own account (`req.user.user_id === userId`), then deletes `Employee` record followed by linked `App_User` record inside an atomic transaction.

2. **Concurrency Control in Appointments** (`backend/routes/appointments.js`):
   - In `POST /api/appointments`, uses `SELECT Status FROM Appointment_Slot WHERE Slot_ID=? FOR UPDATE` inside `beginTransaction()` to prevent simultaneous bookings on identical slots.

3. **Payment & Billing Synchronization** (`backend/routes/billing.js`):
   - In `POST /api/billing/:id/payment`, locks `Bill` record with `FOR UPDATE`, inserts payment into `Payment`, sums total payments, and updates `Bill` balance and status inside a transaction block.

---

### 1.8 MySQL Database User Accounts & RBAC Security

The database script defines **6 MySQL database users** with strict table-level `GRANT` privileges (`Hospital_Management_System.sql` lines 2276–2332):

```sql
CREATE USER 'hospital_admin'@'localhost' IDENTIFIED BY 'Admin@HMS2026!';
CREATE USER 'receptionist'@'localhost'   IDENTIFIED BY 'Recep@HMS2026!';
CREATE USER 'doctor_user'@'localhost'    IDENTIFIED BY 'Doctor@HMS2026!';
CREATE USER 'lab_tech'@'localhost'       IDENTIFIED BY 'LabTech@HMS2026!';
CREATE USER 'pharmacist'@'localhost'     IDENTIFIED BY 'Pharm@HMS2026!';
CREATE USER 'accountant'@'localhost'     IDENTIFIED BY 'Acct@HMS2026!';

-- Privileges Matrix:
-- hospital_admin: ALL PRIVILEGES WITH GRANT OPTION
-- receptionist:   SELECT, INSERT, UPDATE on Patient, Appointment; SELECT on Doctor, Schedule; SELECT, UPDATE on Slot
-- doctor_user:    SELECT, INSERT, UPDATE on Medical_Record, Lab_Order; SELECT, INSERT on Prescription, Item; SELECT on Patient, Appointment, Medicine, Inventory
-- lab_tech:       SELECT, UPDATE on Lab_Order; SELECT, INSERT, UPDATE on Lab_Result; SELECT on Lab_Test, Patient, Appointment
-- pharmacist:     SELECT, INSERT, UPDATE on Inventory, Medicine; SELECT, INSERT on Medicine_Category; SELECT on Prescription, Item, Pharmacy
-- accountant:     SELECT, INSERT, UPDATE on Bill; SELECT, INSERT on Payment; SELECT on Patient, Appointment
```

---

## 2. Logic Chain

### 2.1 Entity Relationship (ER) Architecture & Cardinality Analysis

```
[ Role ] (1) <------- (N) [ App_User ] (1) <------- (0..1) [ Doctor ] (N) -------> (1) [ Specialization ]
                                |                             ^    |
                                |                             |    +-------> (1) [ Department ]
                                v                             |                     ^
                          [ Employee ] (0..1) ----------------+                     | (Head_Doctor)
                                |                                                   |
                                +---------------------------------------------------+
                                
[ Patient ] (1) <------- (N) [ Appointment ] (N) -------> (1) [ Appointment_Slot ] (N) -------> (1) [ Doctor_Schedule ] (N) -> (1) [ Doctor ]
                                |       |
         +----------------------+       +-----------------------+
         |                              |                       |
         v                              v                       v
[ Medical_Record ] (1)        [ Lab_Order ] (1)            [ Bill ] (1)
         |                              |                       |
         v                              v                       v
[ Prescription ] (1)          [ Lab_Result ] (N)           [ Payment ] (N)
         |                              |                       |
         v                              +--> (1) [ Lab_Test ]   +--> (0..1) [ Employee ]
[ Prescription_Item ] (N)
         |
         v
  [ Medicine ] (N) -------> (1) [ Medicine_Category ]
         |
         v
 [ Inventory ] (N) -------> (1) [ Pharmacy ]
```

#### Relational Cardinalities & Keys:
1. **`Role` 1:N `App_User`**: Foreign key `App_User.Role_ID` -> `Role.Role_ID` (`ON DELETE RESTRICT ON UPDATE CASCADE`). One role belongs to multiple user accounts.
2. **`App_User` 1:0..1 `Doctor` / `Employee` / `Patient`**: Optional 1:1 linkages. `Doctor.User_ID`, `Employee.User_ID`, `Patient.User_ID` refer to `App_User.User_ID` (`ON DELETE SET NULL ON UPDATE CASCADE`).
3. **`Department` ↔ `Doctor` Dual Circular Relationship**:
   - `Doctor.Dept_ID` -> `Department.Dept_ID` (Many doctors belong to 1 department, `ON DELETE RESTRICT`).
   - `Department.Head_Doctor` -> `Doctor.Doctor_ID` (1 head doctor per department, nullable, `ON DELETE SET NULL`). Resolves circular dependency via deferred `ALTER TABLE Department ADD CONSTRAINT fk_dept_head`.
4. **`Doctor` 1:N `Doctor_Schedule` 1:N `Appointment_Slot` 1:0..1 `Appointment`**:
   - Doctor defines working days (`Doctor_Schedule`).
   - Schedule breaks down into 30-minute bookable slots (`Appointment_Slot`). `ON DELETE CASCADE` ensures deleting a schedule removes slots.
   - An `Appointment` references exactly one `Appointment_Slot` via foreign key with `UNIQUE` logic enforced by trigger `trg_prevent_double_booking`.
5. **`Appointment` 1:1 `Medical_Record`**: `Medical_Record.Appointment_ID` is defined with a `UNIQUE` constraint (`uq_record_appt`), enforcing a strict 1-to-1 relationship.
6. **`Medical_Record` 1:N `Prescription` 1:N `Prescription_Item` N:1 `Medicine`**: Junction table pattern linking prescriptions to drug catalog.
7. **`Pharmacy` N:M `Medicine` via `Inventory`**: Composite unique key `uq_pharm_med_batch (Pharmacy_ID, Medicine_ID, Batch_Number)` handles stock tracking per location and batch.
8. **`Appointment` 1:1 `Bill` 1:N `Payment`**: `Bill.Appointment_ID` is `UNIQUE`. Multiple partial payments reference a single bill.

---

### 2.2 Normalization Proof (3NF Compliance)

- **First Normal Form (1NF)**: All column attributes are atomic (e.g. separate `First_Name`, `Last_Name`, scalar numeric fees, discrete `DATE`/`TIME` types). Composite values like address or full name are structured or handled explicitly.
- **Second Normal Form (2NF)**: All non-key attributes in tables with composite candidate keys (e.g., `Inventory` with composite key `Pharmacy_ID, Medicine_ID, Batch_Number`) are fully functionally dependent on the entire composite key.
- **Third Normal Form (3NF)**: Transitive dependencies are removed. For instance, patient address and contact details are stored in `Patient`, not duplicated in `Appointment` or `Bill`. Doctor specialization fees and names are stored in `Specialization` and `Doctor`, not duplicated in `Appointment_Slot`. Derived summary fields (such as `Bill.Balance_Due`) are updated deterministically via ACID database triggers (`trg_update_bill_status_after_payment`).

---

### 2.3 Complex SQL Query Techniques Utilized

1. **Window Functions & Ranking**:
   - `RANK() OVER (ORDER BY Total_Appointments DESC)` in Q14 (Doctor workload ranking).
   - `ROW_NUMBER() OVER (PARTITION BY Schedule_ID ORDER BY Slot_Start)` in sample data generation script (dynamic slot binding).
   - `SUM(Amount) OVER (ORDER BY Payment_Date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` in Q21 (7-day rolling revenue window).
2. **Common Table Expressions (CTEs)**:
   - `WITH Abnormal_Patients AS (...)` in Q15 for identifying patients requiring clinical follow-up.
   - `WITH Monthly AS (...)` in Q26 for appointment trend analysis.
   - `WITH Overdue AS (...)` in Q38 for tracking aging accounts receivable.
3. **Conditional Aggregation & Pivot Queries**:
   - `SUM(CASE WHEN Payment_Method = 'Cash' THEN Amount ELSE 0 END)` in Q40 and `backend/routes/reports.js` for payment channel matrix.
   - Doctor schedule slot utilization percentage calculation in Q22.
4. **Pessimistic Concurrency Locking**:
   - `SELECT ... FOR UPDATE` in procedures `BookAppointment`, `CancelAppointment`, `UpdateMedicineStock`, `ProcessPayment`, and backend endpoints (`appointments.js`, `billing.js`).

---

## 3. Caveats

1. **Stored Procedure vs. Node.js Backend Dual Implementation**:
   - Both `Hospital_Management_System.sql` (stored procedures like `BookAppointment`, `ProcessPayment`, `RegisterPatient`) and the Express.js routes (`routes/appointments.js`, `routes/billing.js`, `routes/employees.js`) contain equivalent transaction logic. The Express backend uses `mysql2/promise` inline transactions rather than calling the SQL stored procedures directly. Both enforce identical invariants.
2. **Database Passwords in Script**:
   - `Hospital_Management_System.sql` contains default bcrypt hashes for seed users (password `'x'`) and cleartext passwords for MySQL role users (`Admin@HMS2026!`). In production, environment-variable based credentials must be used.
3. **Audit Log JSON Handling**:
   - `Audit_Log` uses MySQL 8.0 `JSON` type. Older MySQL versions (<5.7.8) will fail to execute triggers `trg_audit_doctor_update` and `trg_audit_bill_update`.

---

## 4. Conclusion

The Hospital Management System database architecture represents an **enterprise-grade, 3NF-compliant MySQL 8.0 relational schema**. It features:
- **23 normalized tables** spanning security, clinical, scheduling, billing, inventory, and audit domains.
- **Strict Data Integrity**: 17 performance indexes, explicit foreign key cascade constraints, unique constraints, and check constraints (`CHECK`).
- **Automation & Invariants**: 7 database triggers and 4 stored functions maintaining financial calculations, audit logging, double-booking prevention, and expired drug validation.
- **ACID Transaction Safeguards**: Row locking (`FOR UPDATE`) across critical workflows (employee auto-provisioning, appointment slot booking, bill settlement).
- **Multi-Tenant Security**: Role-based access control mirrored across both application RBAC and database user accounts (`GRANT`).

---

## 5. Verification Method

### 5.1 Verification Commands

To verify schema execution, constraint integrity, and view functionality:

1. **Execute Full SQL Script**:
   ```bash
   mysql -u root -p < "d:\Hospital MYSQL Databse\Hospital_Management_System.sql"
   ```
2. **Inspect Table Count & Verification**:
   ```sql
   USE Hospital_Management_System;
   SHOW TABLES; -- Must output 23 tables and 7 views
   ```
3. **Verify Triggers & Procedures**:
   ```sql
   SHOW TRIGGERS; -- Must list 7 active triggers
   SHOW PROCEDURE STATUS WHERE Db = 'Hospital_Management_System'; -- Must list 11 stored procedures
   SHOW FUNCTION STATUS WHERE Db = 'Hospital_Management_System'; -- Must list 4 stored functions
   ```
4. **Test Double-Booking Prevention Trigger**:
   ```sql
   -- Expect error: SQLSTATE '45000': This slot is already booked or not available.
   INSERT INTO Appointment(Patient_ID, Slot_ID, Reason) VALUES (1, 1, 'Test collision');
   ```
5. **Test Employee Auto-Provisioning & Self-Deletion Protection Backend Code**:
   - Run backend server: `cd "d:\Hospital MYSQL Databse\backend" && npm test` (or `node server.js`).
   - Send `POST /api/employees` request and verify dual record creation in `Employee` and `App_User`.
