# Hospital Management System - University Project Report

**Course**: Database Management Systems  
**Project Title**: Enterprise Hospital Management System (HMS)  
**Database Engine**: MySQL 8.0 (InnoDB, `utf8mb4_unicode_ci`)  
**Backend Framework**: Node.js & Express 5.x (REST API)  
**Frontend Architecture**: Single Page Application (SPA) - HTML5, CSS3, Vanilla JavaScript (ES6+)  
**Security Standard**: Stateless JWT Authentication, bcryptjs (Cost Factor 10), Dual-Layer Role-Based Access Control (RBAC)  

---

## 1. Abstract & Executive Summary

### 1.1 Project Overview
The **Hospital Management System (HMS)** is an enterprise-grade, multi-tenant digital healthcare management solution designed and implemented for a comprehensive Database Management Systems university curriculum. The system addresses critical operational, clinical, administrative, and financial workflows within modern healthcare institutions. By centralizing patient registration, doctor scheduling, appointment booking, medical record documentation, electronic prescriptions, pharmacy inventory control, laboratory diagnostics, and financial invoicing, the HMS converts complex, multi-departmental medical processes into an integrated, data-driven software architecture.

### 1.2 Motivation & Domain Problem
Traditional healthcare operations often suffer from fragmented record-keeping, billing discrepancies, double-booked appointment slots, inventory stockouts, expired medication dispenses, and uncoordinated diagnostic workflows. These operational bottlenecks lead to prolonged patient wait times, administrative errors, and security vulnerabilities regarding sensitive personal health data. The primary objective of this project is to model, design, build, and evaluate an enterprise relational database architecture backed by secure RESTful microservices and a responsive single-page web application that eliminates operational redundancies, guarantees strict transactional integrity, and enforces granular role-based access control.

### 1.3 Key Architectural Highlights
1. **Fully Normalized Relational Core**: Built on a 3rd Normal Form (3NF) relational model in MySQL 8.0 comprising **23 normalized tables** spanning 9 functional modules: Security, Hospital Infrastructure, Patient Registry, Scheduling, Clinical Records, Pharmacy & Inventory, Diagnostics, Billing, and System Audit.
2. **ACID Transaction & Concurrency Guarantees**: Prevents race conditions such as appointment double-booking, over-dispensing of low-stock medications, and partial billing updates by leveraging MySQL row-level pessimistic locking (`SELECT ... FOR UPDATE`), explicit transaction demarcations (`START TRANSACTION`, `COMMIT`, `ROLLBACK`), and isolation levels.
3. **Automated Database Invariants & Business Logic**: Integrates **7 database triggers**, **4 stored functions**, **11 stored procedures**, and **7 security-scoped database views** to execute complex calculations (e.g., patient age, net bill totals, rolling revenue windows), maintain financial balances, block expired medicine prescriptions, and record structural audit logs automatically at the database tier.
4. **Dual-Tier Role-Based Security Architecture**: Combines database user privilege grants (`GRANT SELECT, INSERT, UPDATE`) across 6 specialized MySQL user accounts with stateless JSON Web Token (JWT) HTTP authorization headers and bcrypt password hashing (cost factor 10) in the Node.js Express backend.
5. **High-Performance Vanilla JS SPA Frontend**: Implements a lightweight, zero-framework Single Page Application using standard HTML5, CSS3, and JavaScript (ES6+). Features client-side routing (`pushState`/`popstate`), 9 domain view sections, 15 modal dialogs, debounced typeahead auto-suggest search, dynamic staff auto-provisioning UI, real-time notification polling (60s interval), and custom printable document generators for billing receipts and laboratory diagnostic certificates.

---

## 2. System Architecture & Technologies Used

### 2.1 System Architecture Topology
The Hospital Management System follows a 3-tier client-server architecture. The system establishes clear boundaries between data persistence, server-side business logic, and client-side presentation layers.

```
+-----------------------------------------------------------------------------------+
|                                PRESENTATION TIER                                  |
|  Single Page Application (SPA) - HTML5 / CSS3 / Vanilla JS (ES6+)                 |
|  - Client Routing (pushState/popstate)         - 9 Interactive Domain Views       |
|  - Debounced Typeahead Search (350ms)           - 15 Modal Overlay Forms           |
|  - Real-Time Notification Polling (60s)        - Printable Receipts & Reports     |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTP/HTTPS REST API (JSON)
                                         | Bearer Token (JWT Header)
                                         v
+-----------------------------------------------------------------------------------+
|                                APPLICATION TIER                                   |
|  Node.js (v18+) & Express 5.x RESTful Backend Server                              |
|  - CORS & Global Payload Middleware            - Stateless JWT Authentication     |
|  - bcryptjs Password Hashing (Cost 10)         - Role Guards (authorize/adminOr) |
|  - Transactional Business Logic                - Parameterized SQL Execution      |
|  - Centralized MySQL Error Mapper              - Account Lockout Safeguards       |
+-----------------------------------------------------------------------------------+
                                         |
                                         | mysql2/promise Connection Pool
                                         | Connection Limit: 20, UTC Timezone
                                         v
+-----------------------------------------------------------------------------------+
|                                 DATA TIER                                         |
|  MySQL 8.0 Community Server (InnoDB Engine, utf8mb4_unicode_ci)                   |
|  - 23 Relational Tables (3NF Compliant)        - 7 Security & Summary Views       |
|  - 17 B-Tree Performance Indexes              - 4 Stored Functions               |
|  - 11 ACID Stored Procedures                   - 7 Automated Triggers             |
|  - Row Locking (SELECT ... FOR UPDATE)         - JSON Format Audit Logging        |
|  - 6 Database User Accounts & Privileges       - Table Constraints (FK/CHECK/UQ)  |
+-----------------------------------------------------------------------------------+
```

### 2.2 Technology Stack Breakdown

| Layer / Domain | Technology | Version / Specification | Rationale & Responsibility |
| :--- | :--- | :--- | :--- |
| **Database Management** | MySQL Community Server | 8.0+ (InnoDB Engine) | Provides full ACID compliance, foreign key integrity, row-level locking, JSON datatype support, window functions, and Common Table Expressions (CTEs). |
| **Character Set & Collation** | `utf8mb4` / `utf8mb4_unicode_ci` | Standard Unicode | Supports complete international character sets and medical terminology formatting without encoding corruption. |
| **Backend Runtime** | Node.js | v18.x / v20.x LTS | High-throughput non-blocking I/O event loop ideal for concurrent REST API handling. |
| **Web Server Framework** | Express.js | 5.2.1 | Lightweight HTTP routing framework for endpoint organization, middleware pipeline execution, and static file delivery. |
| **Database Driver** | `mysql2/promise` | 3.23.2 | Asynchronous Promise-based MySQL driver featuring connection pooling (limit 20), prepared statement caching, and direct decimal float parsing (`decimalNumbers: true`). |
| **Authentication** | `jsonwebtoken` (JWT) | 9.0.3 | Cryptographically signed, stateless session tokens transmitted via HTTP `Authorization: Bearer <token>` headers (8-hour expiration). |
| **Password Security** | `bcryptjs` | 3.0.3 | Adaptive salt hashing algorithm operating at cost factor 10 to resist rainbow table and brute-force attacks. |
| **Cross-Origin Handling** | `cors` | 2.8.6 | Configures CORS headers allowing safe cross-origin client REST API requests. |
| **Input Validation** | `express-validator` | 7.3.2 | Sanitizes and validates request bodies, route parameters, and query strings. |
| **Frontend Framework** | Vanilla JavaScript | ES6+ Standard | Zero external framework overhead (no React, Angular, or Vue). High execution speed, small footprint, direct DOM manipulation. |
| **Styling & Layout** | HTML5 / CSS3 | Modern Flexbox & CSS Grid | Custom design system using CSS variables, modal overlays, card grid layouts, responsive navigation bars, and print stylesheets. |
| **UI Iconography & Typography**| Lucide Icons / Google Inter | Open Source Fonts & SVG Icons | Modern vector icons and clean typography for healthcare data representation. |

---

## 3. Database Schema & Design

### 3.1 Entity-Relationship (ER) Architecture & Cardinality Analysis

The relational schema of the Hospital Management System is structured around **23 normalized tables** categorized into 9 logical modules. The conceptual data model isolates entity domain boundaries while establishing explicit referential integrity constraints across the entire data lifecycle.

```
                                [ Role ] (1)
                                   |
                                   | 1:N (Role_ID)
                                   v
                                [ App_User ]
                                   |
           +-----------------------+-----------------------+
           | 1:0..1                | 1:0..1                | 1:0..1
           v                       v                       v
      [ Doctor ]               [ Employee ]            [ Patient ]
       |      |                    |                       |
       |      +------+             |                       |
   1:N |             | 1:N         | 1:N                   | 1:N
       v             v             v                       v
[ Doctor_Schedule ]  [ Specialization ] [ Department ] <---+  [ Appointment ]
       |                                   ^ (Head_Doctor) |
   1:N |                                   +---------------+       |
       v                                                           |
[ Appointment_Slot ] <---------------------------------------------+
       | 1:1
       +-------------------+-------------------+
                           | 1:1               | 1:1
                           v                   v
                  [ Medical_Record ]    [ Lab_Order ] <--------+
                           |                   |               |
                       1:N |               1:N |               | 1:N
                           v                   v               |
                    [ Prescription ]    [ Lab_Result ]         |
                           |                   |               |
                       1:N |               N:1 | (Performed_By)|
                           v                   v               |
                [ Prescription_Item ]   [ Lab_Test ]           |
                           |                                   |
                       N:1 |                                   |
                           v                                   |
                      [ Medicine ]                             |
                           |                                   |
                       N:1 | (Category_ID)                     |
                           v                                   |
                 [ Medicine_Category ]                         |
                           ^                                   |
                       1:N |                                   |
                      [ Inventory ]                            |
                           |                                   |
                       N:1 | (Pharmacy_ID)                     |
                           v                                   |
                      [ Pharmacy ]                             |
                                                               |
                               [ Bill ] <----------------------+ (1:1 Appointment)
                                  |
                              1:N | (Bill_ID)
                                  v
                             [ Payment ] ----------------------> [ Employee ] (Received_By)
```

#### Detailed Relational Cardinality Breakdown:
1. **Security & User Account Linkages (`Role` 1:N `App_User`)**:
   - `App_User.Role_ID` references `Role.Role_ID` (`ON DELETE RESTRICT ON UPDATE CASCADE`). A system role (e.g., `Doctor`, `Receptionist`) can be assigned to multiple users, but each user possesses exactly one primary system role.
2. **User Account Extensions (`App_User` 1:0..1 `Doctor` / `Employee` / `Patient`)**:
   - Foreign keys `Doctor.User_ID`, `Employee.User_ID`, and `Patient.User_ID` establish optional 1-to-1 relationships referencing `App_User.User_ID` (`ON DELETE SET NULL ON UPDATE CASCADE`). This allows system credentials to be created dynamically without corrupting core entity tables if credentials are reset or deleted.
3. **Department & Physician Circular Dependency (`Department` ↔ `Doctor`)**:
   - `Doctor.Dept_ID` references `Department.Dept_ID` (`ON DELETE RESTRICT ON UPDATE CASCADE`), capturing the organizational unit for each doctor.
   - `Department.Head_Doctor` references `Doctor.Doctor_ID` (`ON DELETE SET NULL ON UPDATE CASCADE`), identifying the lead consultant. Circular dependency is resolved during schema creation via a deferred `ALTER TABLE Department ADD CONSTRAINT fk_dept_head` statement.
4. **Physician Working Calendar (`Doctor` 1:N `Doctor_Schedule` 1:N `Appointment_Slot`)**:
   - A doctor configures daily shift parameters in `Doctor_Schedule`.
   - Each schedule automatically expands into discrete 30-minute bookable rows in `Appointment_Slot`. `ON DELETE CASCADE` rules ensure schedule modifications maintain slot sync.
5. **Appointment Reservation (`Patient` 1:N `Appointment` N:1 `Appointment_Slot`)**:
   - An appointment links a `Patient_ID` and an `Appointment_Slot.Slot_ID`. Unique reservation is enforced via database triggers and row-level locking.
6. **Clinical Documentation (`Appointment` 1:1 `Medical_Record` 1:N `Prescription` 1:N `Prescription_Item` N:1 `Medicine`)**:
   - `Medical_Record.Appointment_ID` enforces a strict 1-to-1 constraint (`UNIQUE`).
   - A medical record can have multiple `Prescription` headers, which contain discrete `Prescription_Item` rows referencing the master `Medicine` catalog.
7. **Multi-Location Pharmacy Control (`Pharmacy` 1:N `Inventory` N:1 `Medicine`)**:
   - A composite unique constraint `UNIQUE (Pharmacy_ID, Medicine_ID, Batch_Number)` on `Inventory` prevents duplicate stock tracking records for identical batches across hospital branches.
8. **Diagnostic Operations (`Appointment` 1:N `Lab_Order` 1:N `Lab_Result` N:1 `Lab_Test`)**:
   - A consultation can yield multiple diagnostic `Lab_Order` entries. Each order contains individual `Lab_Result` records for required `Lab_Test` items, retaining employee accountability via `Performed_By`.
9. **Financial Accounting (`Appointment` 1:1 `Bill` 1:N `Payment`)**:
   - `Bill.Appointment_ID` enforces a strict 1-to-1 constraint.
   - A bill supports multiple `Payment` transactions (partial settlements), with `Payment.Received_By` maintaining an audit trail back to `Employee.Emp_ID`.

---

### 3.2 Exhaustive Table Dictionary (23 Tables)

Below is the complete dictionary for all 23 relational tables in `Hospital_Management_System.sql`.

#### Module 1: Security & Identity

##### 1. `Role`
Defines system access roles for application-level RBAC.
```sql
CREATE TABLE Role (
    Role_ID     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Role_Name   VARCHAR(50)  NOT NULL UNIQUE,
    Description VARCHAR(255) DEFAULT NULL,
    Created_At  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_role_name_length CHECK (CHAR_LENGTH(Role_Name) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 2. `App_User`
Stores user credentials, bcrypt password hashes, and active session states.
```sql
CREATE TABLE App_User (
    User_ID       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Role_ID       INT UNSIGNED NOT NULL,
    Username      VARCHAR(50)  NOT NULL UNIQUE,
    Password_Hash VARCHAR(255) NOT NULL,
    Email         VARCHAR(100) NOT NULL UNIQUE,
    Is_Active     TINYINT(1)   NOT NULL DEFAULT 1,
    Last_Login    TIMESTAMP    NULL DEFAULT NULL,
    Created_At    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role FOREIGN KEY (Role_ID) REFERENCES Role(Role_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_user_email CHECK (Email LIKE '%@%.%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### Module 2: Hospital Infrastructure & Staffing

##### 3. `Department`
Hospital organizational departments.
```sql
CREATE TABLE Department (
    Dept_ID     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Dept_Name   VARCHAR(100) NOT NULL UNIQUE,
    Location    VARCHAR(100) DEFAULT NULL,
    Head_Doctor INT UNSIGNED DEFAULT NULL,
    Phone       VARCHAR(20)  DEFAULT NULL,
    Created_At  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 4. `Specialization`
Medical specializations assigned to doctors.
```sql
CREATE TABLE Specialization (
    Spec_ID     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Spec_Name   VARCHAR(100) NOT NULL UNIQUE,
    Description VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 5. `Doctor`
Master directory of licensed medical practitioners.
```sql
CREATE TABLE Doctor (
    Doctor_ID        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    User_ID          INT UNSIGNED DEFAULT NULL,
    Dept_ID          INT UNSIGNED NOT NULL,
    Spec_ID          INT UNSIGNED NOT NULL,
    First_Name       VARCHAR(50)  NOT NULL,
    Last_Name        VARCHAR(50)  NOT NULL,
    License_Number   VARCHAR(50)  NOT NULL UNIQUE,
    Phone            VARCHAR(20)  NOT NULL,
    Email            VARCHAR(100) NOT NULL UNIQUE,
    Consultation_Fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Experience_Years TINYINT UNSIGNED DEFAULT 0,
    Qualification    VARCHAR(150) DEFAULT NULL,
    Is_Active        TINYINT(1)   NOT NULL DEFAULT 1,
    Created_At       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctor_user FOREIGN KEY (User_ID) REFERENCES App_User(User_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_doctor_dept FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_doctor_spec FOREIGN KEY (Spec_ID) REFERENCES Specialization(Spec_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_consult_fee CHECK (Consultation_Fee >= 0),
    CONSTRAINT chk_exp_years   CHECK (Experience_Years >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### Deferred Foreign Key Constraint for Department Head Doctor:
```sql
ALTER TABLE Department
    ADD CONSTRAINT fk_dept_head
    FOREIGN KEY (Head_Doctor) REFERENCES Doctor(Doctor_ID)
    ON DELETE SET NULL ON UPDATE CASCADE;
```

##### 6. `Employee`
Non-doctor administrative, clinical, laboratory, and pharmacy staff records.
```sql
CREATE TABLE Employee (
    Emp_ID     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    User_ID    INT UNSIGNED DEFAULT NULL,
    Dept_ID    INT UNSIGNED DEFAULT NULL,
    First_Name VARCHAR(50)  NOT NULL,
    Last_Name  VARCHAR(50)  NOT NULL,
    Job_Title  VARCHAR(80)  NOT NULL,
    Phone      VARCHAR(20)  NOT NULL,
    Email      VARCHAR(100) NOT NULL UNIQUE,
    Hire_Date  DATE         NOT NULL,
    Salary     DECIMAL(10,2) DEFAULT NULL,
    Is_Active  TINYINT(1)   NOT NULL DEFAULT 1,
    Created_At TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_emp_user FOREIGN KEY (User_ID) REFERENCES App_User(User_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_emp_dept FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_emp_salary CHECK (Salary >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### Module 3: Patient Registry

##### 7. `Patient`
Master patient demographic and contact registry.
```sql
CREATE TABLE Patient (
    Patient_ID      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    User_ID         INT UNSIGNED DEFAULT NULL,
    First_Name      VARCHAR(50)  NOT NULL,
    Last_Name       VARCHAR(50)  NOT NULL,
    Gender          ENUM('Male','Female','Other') NOT NULL,
    Date_Of_Birth   DATE         NOT NULL,
    Blood_Group     ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown') DEFAULT 'Unknown',
    Phone           VARCHAR(20)  NOT NULL,
    Email           VARCHAR(100) DEFAULT NULL,
    Address         VARCHAR(255) DEFAULT NULL,
    Emergency_Name  VARCHAR(100) DEFAULT NULL,
    Emergency_Phone VARCHAR(20)  DEFAULT NULL,
    Created_At      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_user FOREIGN KEY (User_ID) REFERENCES App_User(User_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### Module 4: Scheduling & Appointments

##### 8. `Doctor_Schedule`
Master daily working shifts defined for doctors.
```sql
CREATE TABLE Doctor_Schedule (
    Schedule_ID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Doctor_ID   INT UNSIGNED NOT NULL,
    Work_Date   DATE         NOT NULL,
    Start_Time  TIME         NOT NULL,
    End_Time    TIME         NOT NULL,
    Status      ENUM('Available','Unavailable','On-Leave') DEFAULT 'Available',
    Created_At  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sched_doctor FOREIGN KEY (Doctor_ID) REFERENCES Doctor(Doctor_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_sched_times CHECK (End_Time > Start_Time),
    CONSTRAINT uq_doctor_date  UNIQUE (Doctor_ID, Work_Date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 9. `Appointment_Slot`
Discrete 30-minute bookable time slots dynamically expanded from schedules.
```sql
CREATE TABLE Appointment_Slot (
    Slot_ID     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Schedule_ID INT UNSIGNED NOT NULL,
    Slot_Start  TIME         NOT NULL,
    Slot_End    TIME         NOT NULL,
    Status      ENUM('Open','Booked','Completed','Cancelled') DEFAULT 'Open',
    CONSTRAINT fk_slot_schedule FOREIGN KEY (Schedule_ID) REFERENCES Doctor_Schedule(Schedule_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_slot_times CHECK (Slot_End > Slot_Start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 10. `Appointment`
Patient appointment bookings bound to specific slots.
```sql
CREATE TABLE Appointment (
    Appointment_ID     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Patient_ID         INT UNSIGNED NOT NULL,
    Slot_ID            INT UNSIGNED NOT NULL UNIQUE,
    Appointment_Status ENUM('Scheduled','Completed','Cancelled','No-Show') DEFAULT 'Scheduled',
    Reason             VARCHAR(255) DEFAULT NULL,
    Cancelled_Reason   VARCHAR(255) DEFAULT NULL,
    Created_At         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_patient FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_appt_slot    FOREIGN KEY (Slot_ID)    REFERENCES Appointment_Slot(Slot_ID) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### Module 5: Clinical & Medical Records

##### 11. `Medical_Record`
Clinical diagnosis and treatment notes recorded upon appointment completion.
```sql
CREATE TABLE Medical_Record (
    Record_ID      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Appointment_ID INT UNSIGNED NOT NULL UNIQUE,
    Diagnosis      TEXT         NOT NULL,
    Treatment      TEXT         DEFAULT NULL,
    Visit_Notes    TEXT         DEFAULT NULL,
    Follow_Up_Date DATE         DEFAULT NULL,
    Created_At     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mr_appt FOREIGN KEY (Appointment_ID) REFERENCES Appointment(Appointment_ID) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 12. `Prescription`
Master prescription header linked to a medical record.
```sql
CREATE TABLE Prescription (
    Prescription_ID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Record_ID       INT UNSIGNED NOT NULL,
    Prescribed_Date TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    Notes           TEXT         DEFAULT NULL,
    CONSTRAINT fk_rx_record FOREIGN KEY (Record_ID) REFERENCES Medical_Record(Record_ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 13. `Prescription_Item`
Specific medication line items prescribed to a patient.
```sql
CREATE TABLE Prescription_Item (
    Item_ID         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Prescription_ID INT UNSIGNED NOT NULL,
    Medicine_ID     INT UNSIGNED NOT NULL,
    Dosage          VARCHAR(100) NOT NULL,
    Frequency       VARCHAR(100) NOT NULL,
    Duration_Days   TINYINT UNSIGNED NOT NULL DEFAULT 1,
    Instructions    VARCHAR(255) DEFAULT NULL,
    CONSTRAINT fk_pi_rx   FOREIGN KEY (Prescription_ID) REFERENCES Prescription(Prescription_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pi_med  FOREIGN KEY (Medicine_ID)     REFERENCES Medicine(Medicine_ID)     ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_duration CHECK (Duration_Days >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### Module 6: Pharmacy & Inventory Management

##### 14. `Medicine_Category`
Categorization taxonomy for pharmaceutical products.
```sql
CREATE TABLE Medicine_Category (
    Category_ID   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Category_Name VARCHAR(100) NOT NULL UNIQUE,
    Description   VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 15. `Medicine`
Master pharmaceutical drug catalog.
```sql
CREATE TABLE Medicine (
    Medicine_ID   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Category_ID   INT UNSIGNED NOT NULL,
    Medicine_Name VARCHAR(150) NOT NULL,
    Generic_Name  VARCHAR(150) DEFAULT NULL,
    Manufacturer  VARCHAR(100) DEFAULT NULL,
    Dosage_Form   ENUM('Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Other') NOT NULL,
    Strength      VARCHAR(50)  NOT NULL,
    Unit_Price    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Requires_Rx   TINYINT(1)   NOT NULL DEFAULT 1,
    Is_Active     TINYINT(1)   NOT NULL DEFAULT 1,
    Created_At    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_med_cat FOREIGN KEY (Category_ID) REFERENCES Medicine_Category(Category_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_unit_price CHECK (Unit_Price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 16. `Pharmacy`
Hospital pharmacy locations or dispensaries.
```sql
CREATE TABLE Pharmacy (
    Pharmacy_ID   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Pharmacy_Name VARCHAR(100) NOT NULL UNIQUE,
    Location      VARCHAR(100) DEFAULT NULL,
    Phone         VARCHAR(20)  DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 17. `Inventory`
Physical drug inventory stock levels per pharmacy location and batch.
```sql
CREATE TABLE Inventory (
    Inventory_ID      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Pharmacy_ID       INT UNSIGNED NOT NULL,
    Medicine_ID       INT UNSIGNED NOT NULL,
    Batch_Number      VARCHAR(50)  NOT NULL,
    Quantity_In_Stock INT          NOT NULL DEFAULT 0,
    Reorder_Level     INT          NOT NULL DEFAULT 10,
    Unit_Cost         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Expiry_Date       DATE         NOT NULL,
    Last_Restocked    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_pharmacy FOREIGN KEY (Pharmacy_ID) REFERENCES Pharmacy(Pharmacy_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_inv_medicine FOREIGN KEY (Medicine_ID) REFERENCES Medicine(Medicine_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_qty_stock   CHECK (Quantity_In_Stock >= 0),
    CONSTRAINT chk_unit_cost   CHECK (Unit_Cost >= 0),
    CONSTRAINT uq_pharm_med_batch UNIQUE (Pharmacy_ID, Medicine_ID, Batch_Number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### Module 7: Laboratory & Diagnostics

##### 18. `Lab_Test`
Diagnostic laboratory test catalog.
```sql
CREATE TABLE Lab_Test (
    Test_ID      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Test_Name    VARCHAR(150) NOT NULL,
    Test_Code    VARCHAR(20)  NOT NULL UNIQUE,
    Description  VARCHAR(255) DEFAULT NULL,
    Normal_Range VARCHAR(100) DEFAULT NULL,
    Unit         VARCHAR(30)  DEFAULT NULL,
    Price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_test_price CHECK (Price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 19. `Lab_Order`
Diagnostic test requisitions ordered by physicians.
```sql
CREATE TABLE Lab_Order (
    Order_ID       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Appointment_ID INT UNSIGNED NOT NULL,
    Doctor_ID      INT UNSIGNED NOT NULL,
    Order_Date     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    Priority       ENUM('Routine','Urgent','STAT') DEFAULT 'Routine',
    Status         ENUM('Pending','In-Progress','Completed','Cancelled') DEFAULT 'Pending',
    Notes          TEXT         DEFAULT NULL,
    CONSTRAINT fk_lo_appt   FOREIGN KEY (Appointment_ID) REFERENCES Appointment(Appointment_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lo_doctor FOREIGN KEY (Doctor_ID)      REFERENCES Doctor(Doctor_ID)      ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 20. `Lab_Result`
Quantitative and qualitative diagnostic test results entered by laboratory technicians.
```sql
CREATE TABLE Lab_Result (
    Result_ID    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Order_ID     INT UNSIGNED NOT NULL,
    Test_ID      INT UNSIGNED NOT NULL,
    Result       TEXT         NOT NULL,
    Is_Abnormal  TINYINT(1)   NOT NULL DEFAULT 0,
    Result_Date  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    Performed_By INT UNSIGNED DEFAULT NULL,
    Remarks      TEXT         DEFAULT NULL,
    CONSTRAINT fk_lr_order FOREIGN KEY (Order_ID)     REFERENCES Lab_Order(Order_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lr_test  FOREIGN KEY (Test_ID)      REFERENCES Lab_Test(Test_ID)   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lr_emp   FOREIGN KEY (Performed_By) REFERENCES Employee(Emp_ID)    ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_order_test UNIQUE (Order_ID, Test_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### Module 8: Financials & Billing

##### 21. `Bill`
Master financial invoices generated for patient appointments.
```sql
CREATE TABLE Bill (
    Bill_ID          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Appointment_ID   INT UNSIGNED NOT NULL UNIQUE,
    Bill_Date        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    Consultation_Fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Medicine_Fee     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Lab_Fee          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Other_Fee        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Discount         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Tax              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Total_Amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Amount_Paid      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Balance_Due      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Bill_Status      ENUM('Pending','Partial','Paid','Cancelled','Waived') DEFAULT 'Pending',
    CONSTRAINT fk_bill_appt FOREIGN KEY (Appointment_ID) REFERENCES Appointment(Appointment_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_bill_amounts CHECK (Total_Amount >= 0 AND Discount >= 0 AND Amount_Paid >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

##### 22. `Payment`
Payment transactions settled against patient bills.
```sql
CREATE TABLE Payment (
    Payment_ID     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Bill_ID        INT UNSIGNED NOT NULL,
    Payment_Date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    Amount         DECIMAL(10,2) NOT NULL,
    Payment_Method ENUM('Cash','Card','Bank_Transfer','Insurance','Mobile_Money','Other') NOT NULL,
    Reference_No   VARCHAR(100) DEFAULT NULL,
    Received_By    INT UNSIGNED DEFAULT NULL,
    CONSTRAINT fk_pay_bill FOREIGN KEY (Bill_ID)     REFERENCES Bill(Bill_ID)      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pay_emp  FOREIGN KEY (Received_By) REFERENCES Employee(Emp_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_payment_amount CHECK (Amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### Module 9: Audit & Logging

##### 23. `Audit_Log`
JSON-formatted audit trail recording structural changes to sensitive system entities.
```sql
CREATE TABLE Audit_Log (
    Log_ID     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Table_Name VARCHAR(50) NOT NULL,
    Record_ID  INT UNSIGNED NOT NULL,
    Action     ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    Old_Values JSON DEFAULT NULL,
    New_Values JSON DEFAULT NULL,
    Changed_By VARCHAR(50) DEFAULT 'SYSTEM',
    Changed_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.3 Performance Optimization via Indexes (17 Indexes)

To accelerate search performance, JOIN operations, and analytical query execution across large datasets, **17 strategic secondary B-Tree indexes** are created across critical database tables.

```sql
-- Doctor Directory Indexes
CREATE INDEX idx_doctor_name       ON Doctor(Last_Name, First_Name);
CREATE INDEX idx_doctor_dept       ON Doctor(Dept_ID);
CREATE INDEX idx_doctor_spec       ON Doctor(Spec_ID);
CREATE INDEX idx_doctor_active     ON Doctor(Is_Active);

-- Patient Search Indexes
CREATE INDEX idx_patient_name      ON Patient(Last_Name, First_Name);
CREATE INDEX idx_patient_phone     ON Patient(Phone);
CREATE INDEX idx_patient_dob       ON Patient(Date_Of_Birth);

-- Appointment & Scheduling Indexes
CREATE INDEX idx_appt_patient      ON Appointment(Patient_ID);
CREATE INDEX idx_appt_status       ON Appointment(Appointment_Status);
CREATE INDEX idx_sched_doctor      ON Doctor_Schedule(Doctor_ID);
CREATE INDEX idx_sched_date        ON Doctor_Schedule(Work_Date);
CREATE INDEX idx_sched_status      ON Doctor_Schedule(Status);
CREATE INDEX idx_slot_schedule     ON Appointment_Slot(Schedule_ID);
CREATE INDEX idx_slot_status       ON Appointment_Slot(Status);

-- Pharmacy & Inventory Indexes
CREATE INDEX idx_med_name          ON Medicine(Medicine_Name);
CREATE INDEX idx_med_category      ON Medicine(Category_ID);
CREATE INDEX idx_med_active        ON Medicine(Is_Active);
CREATE INDEX idx_inv_medicine      ON Inventory(Medicine_ID);
CREATE INDEX idx_inv_expiry        ON Inventory(Expiry_Date);
CREATE INDEX idx_inv_pharmacy      ON Inventory(Pharmacy_ID);

-- Billing & Diagnostic Indexes
CREATE INDEX idx_bill_date         ON Bill(Bill_Date);
CREATE INDEX idx_bill_status       ON Bill(Bill_Status);
CREATE INDEX idx_laborder_appt     ON Lab_Order(Appointment_ID);
CREATE INDEX idx_laborder_status   ON Lab_Order(Status);
CREATE INDEX idx_payment_bill      ON Payment(Bill_ID);
CREATE INDEX idx_payment_date      ON Payment(Payment_Date);

-- Security Audit Indexes
CREATE INDEX idx_audit_table       ON Audit_Log(Table_Name, Changed_At);
```

---

### 3.4 Database Views (7 Views)

Database views abstract complex multi-table JOIN operations into secure, virtual relations:

#### 1. `Upcoming_Appointments`
Retrieves scheduled future appointments with patient and physician details.
```sql
CREATE OR REPLACE VIEW Upcoming_Appointments AS
SELECT
    a.Appointment_ID,
    CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
    p.Phone                                AS Patient_Phone,
    CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
    dept.Dept_Name,
    ds.Work_Date,
    sl.Slot_Start,
    sl.Slot_End,
    a.Reason,
    a.Appointment_Status
FROM Appointment a
JOIN Patient          p    ON a.Patient_ID   = p.Patient_ID
JOIN Appointment_Slot sl   ON a.Slot_ID      = sl.Slot_ID
JOIN Doctor_Schedule  ds   ON sl.Schedule_ID  = ds.Schedule_ID
JOIN Doctor           d    ON ds.Doctor_ID   = d.Doctor_ID
JOIN Department       dept ON d.Dept_ID      = dept.Dept_ID
WHERE a.Appointment_Status = 'Scheduled'
  AND ds.Work_Date >= CURRENT_DATE
ORDER BY ds.Work_Date, sl.Slot_Start;
```

#### 2. `Doctor_Daily_Schedule`
Displays the daily schedule and patient bookings for all active physicians.
```sql
CREATE OR REPLACE VIEW Doctor_Daily_Schedule AS
SELECT
    d.Doctor_ID,
    CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
    dept.Dept_Name,
    ds.Work_Date,
    sl.Slot_ID,
    sl.Slot_Start,
    sl.Slot_End,
    sl.Status                              AS Slot_Status,
    CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
    a.Reason
FROM Doctor_Schedule ds
JOIN Doctor           d    ON ds.Doctor_ID   = d.Doctor_ID
JOIN Department       dept ON d.Dept_ID      = dept.Dept_ID
JOIN Appointment_Slot sl   ON sl.Schedule_ID = ds.Schedule_ID
LEFT JOIN Appointment a    ON a.Slot_ID      = sl.Slot_ID
LEFT JOIN Patient     p    ON a.Patient_ID   = p.Patient_ID
WHERE ds.Work_Date = CURRENT_DATE
ORDER BY d.Last_Name, sl.Slot_Start;
```

#### 3. `Patient_Medical_History`
Consolidates patient visit history, diagnoses, treatments, and follow-up dates.
```sql
CREATE OR REPLACE VIEW Patient_Medical_History AS
SELECT
    p.Patient_ID,
    CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
    ds.Work_Date                           AS Visit_Date,
    CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
    dept.Dept_Name,
    mr.Diagnosis,
    mr.Treatment,
    mr.Visit_Notes,
    mr.Follow_Up_Date
FROM Patient          p
JOIN Appointment      a    ON a.Patient_ID      = p.Patient_ID
JOIN Appointment_Slot sl   ON a.Slot_ID         = sl.Slot_ID
JOIN Doctor_Schedule  ds   ON sl.Schedule_ID    = ds.Schedule_ID
JOIN Doctor           d    ON ds.Doctor_ID      = d.Doctor_ID
JOIN Department       dept ON d.Dept_ID         = dept.Dept_ID
JOIN Medical_Record   mr   ON mr.Appointment_ID = a.Appointment_ID
ORDER BY p.Patient_ID, ds.Work_Date DESC;
```

#### 4. `Outstanding_Bills`
Filters unpaid or partially paid patient invoices sorted by balance due.
```sql
CREATE OR REPLACE VIEW Outstanding_Bills AS
SELECT
    b.Bill_ID,
    CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
    p.Phone                                AS Patient_Phone,
    b.Bill_Date,
    b.Total_Amount,
    b.Amount_Paid,
    b.Balance_Due,
    b.Bill_Status
FROM Bill b
JOIN Appointment a ON b.Appointment_ID = a.Appointment_ID
JOIN Patient     p ON a.Patient_ID     = p.Patient_ID
WHERE b.Bill_Status IN ('Pending', 'Partial')
ORDER BY b.Balance_Due DESC;
```

#### 5. `Available_Doctors`
Aggregates open appointment slot counts per active doctor for upcoming dates.
```sql
CREATE OR REPLACE VIEW Available_Doctors AS
SELECT
    d.Doctor_ID,
    CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
    s.Spec_Name,
    dept.Dept_Name,
    d.Consultation_Fee,
    ds.Work_Date,
    COUNT(sl.Slot_ID)                      AS Open_Slots
FROM Doctor         d
JOIN Specialization s    ON d.Spec_ID      = s.Spec_ID
JOIN Department     dept ON d.Dept_ID      = dept.Dept_ID
JOIN Doctor_Schedule ds  ON ds.Doctor_ID   = d.Doctor_ID
JOIN Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
WHERE d.Is_Active   = 1
  AND ds.Status     = 'Available'
  AND ds.Work_Date >= CURRENT_DATE
  AND sl.Status     = 'Open'
GROUP BY d.Doctor_ID, s.Spec_Name, dept.Dept_Name, d.Consultation_Fee, ds.Work_Date
ORDER BY ds.Work_Date, d.Last_Name;
```

#### 6. `Medicine_Inventory`
Evaluates stock levels and dynamically categorizes drug expiration status.
```sql
CREATE OR REPLACE VIEW Medicine_Inventory AS
SELECT
    i.Inventory_ID,
    ph.Pharmacy_Name,
    m.Medicine_Name,
    m.Generic_Name,
    m.Strength,
    m.Dosage_Form,
    mc.Category_Name,
    i.Batch_Number,
    i.Quantity_In_Stock,
    i.Reorder_Level,
    i.Expiry_Date,
    DATEDIFF(i.Expiry_Date, CURRENT_DATE) AS Days_Until_Expiry,
    CASE
        WHEN i.Expiry_Date < CURRENT_DATE              THEN 'Expired'
        WHEN i.Expiry_Date < DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY) THEN 'Expiring_Soon'
        WHEN i.Quantity_In_Stock <= i.Reorder_Level    THEN 'Low_Stock'
        ELSE 'OK'
    END AS Stock_Status
FROM Inventory        i
JOIN Pharmacy         ph ON i.Pharmacy_ID  = ph.Pharmacy_ID
JOIN Medicine         m  ON i.Medicine_ID  = m.Medicine_ID
JOIN Medicine_Category mc ON m.Category_ID = mc.Category_ID
ORDER BY Stock_Status, i.Expiry_Date;
```

#### 7. `Lab_Test_Results`
Displays completed diagnostic test results alongside patient and reference range data.
```sql
CREATE OR REPLACE VIEW Lab_Test_Results AS
SELECT
    lr.Result_ID,
    CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
    CONCAT(d.First_Name, ' ', d.Last_Name) AS Ordering_Doctor,
    lt.Test_Name,
    lt.Test_Code,
    lt.Normal_Range,
    lt.Unit,
    lr.Result,
    lr.Is_Abnormal,
    lr.Result_Date,
    lr.Remarks,
    lo.Priority,
    lo.Status                              AS Order_Status
FROM Lab_Result lr
JOIN Lab_Order  lo ON lr.Order_ID       = lo.Order_ID
JOIN Lab_Test   lt ON lr.Test_ID        = lt.Test_ID
JOIN Appointment a ON lo.Appointment_ID = a.Appointment_ID
JOIN Patient     p ON a.Patient_ID      = p.Patient_ID
JOIN Doctor      d ON lo.Doctor_ID      = d.Doctor_ID
ORDER BY lr.Result_Date DESC;
```

---

### 3.5 Stored Functions (4 Functions)

Stored functions encapsulate deterministic business calculations at the database tier:

```sql
DELIMITER $$

-- Function 1: CalculateAge
-- Computes patient age in years from date of birth
CREATE FUNCTION CalculateAge(p_dob DATE)
RETURNS TINYINT UNSIGNED
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_dob, CURRENT_DATE);
END$$

-- Function 2: CalculateBillTotal
-- Calculates net bill total after fees, tax, and discounts
CREATE FUNCTION CalculateBillTotal(p_bill_id INT UNSIGNED)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;
    SELECT (Consultation_Fee + Medicine_Fee + Lab_Fee + Other_Fee + Tax - Discount)
    INTO   v_total
    FROM   Bill
    WHERE  Bill_ID = p_bill_id;
    RETURN IFNULL(v_total, 0.00);
END$$

-- Function 3: DoctorAvailable
-- Checks if a physician has open appointment slots on a given date
CREATE FUNCTION DoctorAvailable(p_doctor_id INT UNSIGNED, p_date DATE)
RETURNS TINYINT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_count INT DEFAULT 0;
    SELECT COUNT(*)
    INTO   v_count
    FROM   Doctor_Schedule ds
    JOIN   Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
    WHERE  ds.Doctor_ID = p_doctor_id
      AND  ds.Work_Date = p_date
      AND  ds.Status    = 'Available'
      AND  sl.Status    = 'Open';
    RETURN IF(v_count > 0, 1, 0);
END$$

-- Function 4: PatientAppointmentCount
-- Returns cumulative visit count for a specific patient
CREATE FUNCTION PatientAppointmentCount(p_patient_id INT UNSIGNED)
RETURNS INT UNSIGNED
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_cnt INT UNSIGNED DEFAULT 0;
    SELECT COUNT(*) INTO v_cnt
    FROM   Appointment
    WHERE  Patient_ID = p_patient_id;
    RETURN v_cnt;
END$$

DELIMITER ;
```

---

### 3.6 Stored Procedures (11 Procedures)

Stored procedures manage critical multi-table transactions directly within the database:

```sql
DELIMITER $$

-- 1. RegisterPatient
CREATE PROCEDURE RegisterPatient(
    IN p_first_name      VARCHAR(50),
    IN p_last_name       VARCHAR(50),
    IN p_gender          ENUM('Male','Female','Other'),
    IN p_dob             DATE,
    IN p_blood_group     ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'),
    IN p_phone           VARCHAR(20),
    IN p_email           VARCHAR(100),
    IN p_address         VARCHAR(255),
    IN p_emerg_name      VARCHAR(100),
    IN p_emerg_phone     VARCHAR(20),
    OUT p_patient_id     INT UNSIGNED
)
BEGIN
    INSERT INTO Patient(First_Name, Last_Name, Gender, Date_Of_Birth, Blood_Group,
                        Phone, Email, Address, Emergency_Name, Emergency_Phone)
    VALUES(p_first_name, p_last_name, p_gender, p_dob, p_blood_group,
           p_phone, p_email, p_address, p_emerg_name, p_emerg_phone);
    SET p_patient_id = LAST_INSERT_ID();
END$$

-- 2. BookAppointment (Pessimistic Row Locking FOR UPDATE)
CREATE PROCEDURE BookAppointment(
    IN  p_patient_id INT UNSIGNED,
    IN  p_slot_id    INT UNSIGNED,
    IN  p_reason     VARCHAR(255),
    OUT p_appt_id    INT UNSIGNED,
    OUT p_message    VARCHAR(255)
)
BEGIN
    DECLARE v_slot_status VARCHAR(20);

    START TRANSACTION;

    SELECT Status INTO v_slot_status
    FROM   Appointment_Slot
    WHERE  Slot_ID = p_slot_id
    FOR UPDATE;

    IF v_slot_status IS NULL THEN
        SET p_message = 'Slot not found';
        SET p_appt_id = 0;
        ROLLBACK;
    ELSEIF v_slot_status != 'Open' THEN
        SET p_message = 'Slot is not available';
        SET p_appt_id = 0;
        ROLLBACK;
    ELSE
        INSERT INTO Appointment(Patient_ID, Slot_ID, Reason)
        VALUES(p_patient_id, p_slot_id, p_reason);

        SET p_appt_id = LAST_INSERT_ID();
        UPDATE Appointment_Slot SET Status = 'Booked' WHERE Slot_ID = p_slot_id;

        SET p_message = 'Appointment booked successfully';
        COMMIT;
    END IF;
END$$

-- 3. CancelAppointment
CREATE PROCEDURE CancelAppointment(
    IN  p_appt_id INT UNSIGNED,
    IN  p_reason  VARCHAR(255),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_slot   INT UNSIGNED;

    START TRANSACTION;

    SELECT Appointment_Status, Slot_ID INTO v_status, v_slot
    FROM   Appointment WHERE Appointment_ID = p_appt_id FOR UPDATE;

    IF v_status IS NULL THEN
        SET p_message = 'Appointment not found';
        ROLLBACK;
    ELSEIF v_status NOT IN ('Scheduled') THEN
        SET p_message = CONCAT('Cannot cancel appointment in status: ', v_status);
        ROLLBACK;
    ELSE
        UPDATE Appointment
        SET    Appointment_Status = 'Cancelled', Cancelled_Reason = p_reason
        WHERE  Appointment_ID = p_appt_id;

        UPDATE Appointment_Slot SET Status = 'Open' WHERE Slot_ID = v_slot;

        SET p_message = 'Appointment cancelled';
        COMMIT;
    END IF;
END$$

-- 4. CompleteAppointment
CREATE PROCEDURE CompleteAppointment(
    IN  p_appt_id   INT UNSIGNED,
    IN  p_diagnosis TEXT,
    IN  p_treatment TEXT,
    IN  p_notes     TEXT,
    OUT p_record_id INT UNSIGNED,
    OUT p_message   VARCHAR(255)
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_slot   INT UNSIGNED;

    START TRANSACTION;

    SELECT Appointment_Status, Slot_ID INTO v_status, v_slot
    FROM   Appointment WHERE Appointment_ID = p_appt_id FOR UPDATE;

    IF v_status != 'Scheduled' THEN
        SET p_message = 'Appointment must be Scheduled to complete';
        SET p_record_id = 0;
        ROLLBACK;
    ELSE
        UPDATE Appointment SET Appointment_Status = 'Completed' WHERE Appointment_ID = p_appt_id;
        UPDATE Appointment_Slot SET Status = 'Completed' WHERE Slot_ID = v_slot;

        UPDATE Medical_Record
        SET    Diagnosis   = p_diagnosis,
               Treatment   = COALESCE(p_treatment, ''),
               Visit_Notes = p_notes
        WHERE  Appointment_ID = p_appt_id;

        SELECT Record_ID INTO p_record_id
        FROM   Medical_Record WHERE Appointment_ID = p_appt_id;

        SET p_message = 'Appointment completed and medical record created';
        COMMIT;
    END IF;
END$$

-- 5. GenerateBill
CREATE PROCEDURE GenerateBill(
    IN  p_appt_id   INT UNSIGNED,
    IN  p_med_fee   DECIMAL(10,2),
    IN  p_lab_fee   DECIMAL(10,2),
    IN  p_other_fee DECIMAL(10,2),
    IN  p_discount  DECIMAL(10,2),
    IN  p_tax       DECIMAL(10,2),
    OUT p_bill_id   INT UNSIGNED,
    OUT p_message   VARCHAR(255)
)
BEGIN
    DECLARE v_appt_status VARCHAR(20);
    DECLARE v_consult_fee DECIMAL(10,2);
    DECLARE v_total       DECIMAL(10,2);
    DECLARE v_exist       INT DEFAULT 0;

    START TRANSACTION;

    SELECT a.Appointment_Status, d.Consultation_Fee
    INTO   v_appt_status, v_consult_fee
    FROM   Appointment a
    JOIN   Appointment_Slot sl ON a.Slot_ID      = sl.Slot_ID
    JOIN   Doctor_Schedule  ds ON sl.Schedule_ID = ds.Schedule_ID
    JOIN   Doctor           d  ON ds.Doctor_ID   = d.Doctor_ID
    WHERE  a.Appointment_ID = p_appt_id;

    SELECT COUNT(*) INTO v_exist FROM Bill WHERE Appointment_ID = p_appt_id;

    IF v_appt_status != 'Completed' THEN
        SET p_message = 'Bill can only be generated for completed appointments';
        SET p_bill_id = 0;
        ROLLBACK;
    ELSEIF v_exist > 0 THEN
        SET p_message = 'Bill already exists for this appointment';
        SET p_bill_id = 0;
        ROLLBACK;
    ELSE
        SET v_total = v_consult_fee + p_med_fee + p_lab_fee + p_other_fee + p_tax - p_discount;

        INSERT INTO Bill(Appointment_ID, Consultation_Fee, Medicine_Fee, Lab_Fee,
                         Other_Fee, Discount, Tax, Total_Amount, Balance_Due)
        VALUES(p_appt_id, v_consult_fee, p_med_fee, p_lab_fee,
               p_other_fee, p_discount, p_tax, v_total, v_total);

        SET p_bill_id = LAST_INSERT_ID();
        SET p_message = 'Bill generated successfully';
        COMMIT;
    END IF;
END$$

-- 6. AddMedicine
CREATE PROCEDURE AddMedicine(
    IN p_category_id  INT UNSIGNED,
    IN p_name         VARCHAR(150),
    IN p_generic      VARCHAR(150),
    IN p_manufacturer VARCHAR(100),
    IN p_form         ENUM('Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Other'),
    IN p_strength     VARCHAR(50),
    IN p_unit_price   DECIMAL(10,2),
    IN p_req_rx       TINYINT(1),
    OUT p_medicine_id INT UNSIGNED
)
BEGIN
    INSERT INTO Medicine(Category_ID, Medicine_Name, Generic_Name, Manufacturer,
                          Dosage_Form, Strength, Unit_Price, Requires_Rx)
    VALUES(p_category_id, p_name, p_generic, p_manufacturer,
           p_form, p_strength, p_unit_price, p_req_rx);
    SET p_medicine_id = LAST_INSERT_ID();
END$$

-- 7. UpdateMedicineStock
CREATE PROCEDURE UpdateMedicineStock(
    IN  p_inventory_id INT UNSIGNED,
    IN  p_qty_change   INT,
    OUT p_message      VARCHAR(255)
)
BEGIN
    DECLARE v_current INT UNSIGNED;

    START TRANSACTION;

    SELECT Quantity_In_Stock INTO v_current
    FROM   Inventory WHERE Inventory_ID = p_inventory_id FOR UPDATE;

    IF (v_current + p_qty_change) < 0 THEN
        SET p_message = 'Insufficient stock';
        ROLLBACK;
    ELSE
        UPDATE Inventory
        SET    Quantity_In_Stock = Quantity_In_Stock + p_qty_change
        WHERE  Inventory_ID = p_inventory_id;
        SET p_message = 'Stock updated';
        COMMIT;
    END IF;
END$$

-- 8. CreatePrescription
CREATE PROCEDURE CreatePrescription(
    IN  p_record_id       INT UNSIGNED,
    IN  p_notes           TEXT,
    OUT p_prescription_id INT UNSIGNED
)
BEGIN
    INSERT INTO Prescription(Record_ID, Notes) VALUES(p_record_id, p_notes);
    SET p_prescription_id = LAST_INSERT_ID();
END$$

-- 9. OrderLabTest
CREATE PROCEDURE OrderLabTest(
    IN  p_appt_id   INT UNSIGNED,
    IN  p_doctor_id INT UNSIGNED,
    IN  p_priority  ENUM('Routine','Urgent','STAT'),
    IN  p_notes     TEXT,
    OUT p_order_id  INT UNSIGNED
)
BEGIN
    INSERT INTO Lab_Order(Appointment_ID, Doctor_ID, Priority, Notes)
    VALUES(p_appt_id, p_doctor_id, p_priority, p_notes);
    SET p_order_id = LAST_INSERT_ID();
END$$

-- 10. RecordLabResult
CREATE PROCEDURE RecordLabResult(
    IN  p_order_id     INT UNSIGNED,
    IN  p_test_id      INT UNSIGNED,
    IN  p_result       TEXT,
    IN  p_is_abnormal  TINYINT(1),
    IN  p_remarks      TEXT,
    IN  p_performed_by INT UNSIGNED,
    OUT p_result_id    INT UNSIGNED
)
BEGIN
    INSERT INTO Lab_Result(Order_ID, Test_ID, Result, Is_Abnormal, Remarks, Performed_By)
    VALUES(p_order_id, p_test_id, p_result, p_is_abnormal, p_remarks, p_performed_by);
    SET p_result_id = LAST_INSERT_ID();
END$$

-- 11. ProcessPayment
CREATE PROCEDURE ProcessPayment(
    IN  p_bill_id    INT UNSIGNED,
    IN  p_amount     DECIMAL(10,2),
    IN  p_method     ENUM('Cash','Card','Bank_Transfer','Insurance','Mobile_Money','Other'),
    IN  p_ref_no     VARCHAR(100),
    IN  p_emp_id     INT UNSIGNED,
    OUT p_payment_id INT UNSIGNED,
    OUT p_message    VARCHAR(255)
)
BEGIN
    DECLARE v_balance DECIMAL(10,2);
    DECLARE v_status  VARCHAR(20);

    START TRANSACTION;

    SELECT Balance_Due, Bill_Status INTO v_balance, v_status
    FROM   Bill WHERE Bill_ID = p_bill_id FOR UPDATE;

    IF v_balance IS NULL THEN
        SET p_message = 'Bill not found';
        SET p_payment_id = 0;
        ROLLBACK;
    ELSEIF p_amount <= 0 THEN
        SET p_message = 'Payment amount must be positive';
        SET p_payment_id = 0;
        ROLLBACK;
    ELSEIF v_status IN ('Paid','Cancelled','Waived') THEN
        SET p_message = CONCAT('Bill is already ', v_status);
        SET p_payment_id = 0;
        ROLLBACK;
    ELSE
        INSERT INTO Payment(Bill_ID, Amount, Payment_Method, Reference_No, Received_By)
        VALUES(p_bill_id, p_amount, p_method, p_ref_no, p_emp_id);

        SET p_payment_id = LAST_INSERT_ID();
        SET p_message = 'Payment processed successfully';
        COMMIT;
    END IF;
END$$

DELIMITER ;
```

---

### 3.7 Database Triggers (7 Triggers)

Automated database triggers maintain system invariants, prevent data corruption, and audit administrative actions:

```sql
DELIMITER $$

-- Trigger 1: Double-Booking Prevention (BEFORE INSERT ON Appointment)
CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_slot_status VARCHAR(20);
    SELECT Status INTO v_slot_status
    FROM   Appointment_Slot WHERE Slot_ID = NEW.Slot_ID;
    IF v_slot_status != 'Open' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This slot is already booked or not available.';
    END IF;
END$$

-- Trigger 2: Automatic Slot Reservation Update (AFTER INSERT ON Appointment)
CREATE TRIGGER trg_slot_booked_after_appointment
AFTER INSERT ON Appointment
FOR EACH ROW
BEGIN
    UPDATE Appointment_Slot SET Status = 'Booked' WHERE Slot_ID = NEW.Slot_ID;
END$$

-- Trigger 3: Expired Medication Prescription Blocker (BEFORE INSERT ON Prescription_Item)
CREATE TRIGGER trg_prevent_expired_medicine
BEFORE INSERT ON Prescription_Item
FOR EACH ROW
BEGIN
    DECLARE v_expiry DATE;
    SELECT MIN(Expiry_Date) INTO v_expiry
    FROM   Inventory
    WHERE  Medicine_ID = NEW.Medicine_ID
      AND  Quantity_In_Stock > 0;
    IF v_expiry IS NULL OR v_expiry < CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Medicine is expired or out of stock and cannot be prescribed.';
    END IF;
END$$

-- Trigger 4: Automatic Invoicing & Payment Balance Calculation (AFTER INSERT ON Payment)
CREATE TRIGGER trg_update_bill_status_after_payment
AFTER INSERT ON Payment
FOR EACH ROW
BEGIN
    DECLARE v_total_paid DECIMAL(10,2);
    SELECT SUM(Amount) INTO v_total_paid FROM Payment WHERE Bill_ID = NEW.Bill_ID;
    UPDATE Bill
    SET    Amount_Paid = v_total_paid,
           Balance_Due = GREATEST(0.00, Total_Amount - v_total_paid),
           Bill_Status = CASE
               WHEN GREATEST(0.00, Total_Amount - v_total_paid) <= 0 THEN 'Paid'
               WHEN v_total_paid > 0 THEN 'Partial'
               ELSE 'Pending'
           END
    WHERE  Bill_ID = NEW.Bill_ID;
END$$

-- Trigger 5: Automatic Clinical Medical Record Initialization (AFTER UPDATE ON Appointment)
CREATE TRIGGER trg_auto_medical_record_on_complete
AFTER UPDATE ON Appointment
FOR EACH ROW
BEGIN
    IF NEW.Appointment_Status = 'Completed' AND OLD.Appointment_Status != 'Completed' THEN
        IF NOT EXISTS (SELECT 1 FROM Medical_Record WHERE Appointment_ID = NEW.Appointment_ID) THEN
            INSERT INTO Medical_Record(Appointment_ID, Diagnosis, Treatment)
            VALUES(NEW.Appointment_ID, 'Pending physician notes', '');
        END IF;
    END IF;
END$$

-- Trigger 6: Doctor Audit Log Capture (AFTER UPDATE ON Doctor)
CREATE TRIGGER trg_audit_doctor_update
AFTER UPDATE ON Doctor
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log(Table_Name, Record_ID, Action, Old_Values, New_Values)
    VALUES('Doctor', OLD.Doctor_ID, 'UPDATE',
           JSON_OBJECT('First_Name', OLD.First_Name, 'Last_Name', OLD.Last_Name,
                       'Consultation_Fee', OLD.Consultation_Fee, 'Is_Active', OLD.Is_Active),
           JSON_OBJECT('First_Name', NEW.First_Name, 'Last_Name', NEW.Last_Name,
                       'Consultation_Fee', NEW.Consultation_Fee, 'Is_Active', NEW.Is_Active));
END$$

-- Trigger 7: Bill State Audit Log Capture (AFTER UPDATE ON Bill)
CREATE TRIGGER trg_audit_bill_update
AFTER UPDATE ON Bill
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log(Table_Name, Record_ID, Action, Old_Values, New_Values)
    VALUES('Bill', OLD.Bill_ID, 'UPDATE',
           JSON_OBJECT('Bill_Status', OLD.Bill_Status, 'Amount_Paid', OLD.Amount_Paid, 'Balance_Due', OLD.Balance_Due),
           JSON_OBJECT('Bill_Status', NEW.Bill_Status, 'Amount_Paid', NEW.Amount_Paid, 'Balance_Due', NEW.Balance_Due));
END$$

DELIMITER ;
```

---

### 3.8 Concurrency Control & Database Transaction Management

Maintaining transactional integrity across a multi-user hospital system requires strict concurrency handling mechanisms.

#### 1. Pessimistic Row Locking (`FOR UPDATE`)
To prevent concurrent race conditions (such as two receptionists attempting to book the exact same 30-minute appointment slot simultaneously), both database stored procedures and Express backend endpoints use `SELECT ... FOR UPDATE`.
```sql
-- Transactional Slot Lock during Booking
START TRANSACTION;
SELECT Status FROM Appointment_Slot WHERE Slot_ID = p_slot_id FOR UPDATE;
-- Checks status and locks row until COMMIT/ROLLBACK
```

#### 2. Express Backend Transaction Demarcation (`mysql2/promise`)
The Node.js Express server executes multi-table operations inside explicit database transactions, guaranteeing atomic commit or complete rollback upon error:
```javascript
const conn = await db.getConnection();
try {
  await conn.beginTransaction();
  
  // 1. Map role title to system role ID
  const [roles] = await conn.query('SELECT Role_ID FROM Role WHERE Role_Name = ?', [roleName]);
  
  // 2. Provision App_User credentials account
  const [userRes] = await conn.query(
    'INSERT INTO App_User (Role_ID, Username, Password_Hash, Email) VALUES (?, ?, ?, ?)',
    [roles[0].Role_ID, username, hashedPassword, email]
  );
  
  // 3. Insert linked Employee staff record
  await conn.query(
    'INSERT INTO Employee (User_ID, Dept_ID, First_Name, Last_Name, Job_Title, Phone, Email, Hire_Date, Salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userRes.insertId, deptId, firstName, lastName, jobTitle, phone, email, hireDate, salary]
  );
  
  await conn.commit();
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  conn.release();
}
```

---

### 3.9 Advanced SQL Queries & Analytical Techniques

The system utilizes advanced SQL construct patterns (Window Functions, Common Table Expressions, Unions, Subqueries, and Conditional Aggregations) to generate complex analytical reporting metrics.

#### 1. Window Functions & Ranking (`RANK() OVER`, `SUM() OVER`)
Rank doctors by total appointment volume:
```sql
SELECT Doctor_Name, Total_Appointments,
       RANK() OVER (ORDER BY Total_Appointments DESC) AS Rank_Position
FROM (
    SELECT CONCAT(d.First_Name, ' ', d.Last_Name) AS Doctor_Name,
           COUNT(a.Appointment_ID) AS Total_Appointments
    FROM Doctor d
    LEFT JOIN Doctor_Schedule  ds ON ds.Doctor_ID   = d.Doctor_ID
    LEFT JOIN Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
    LEFT JOIN Appointment      a  ON a.Slot_ID      = sl.Slot_ID
    GROUP BY d.Doctor_ID
) ranked;
```

Compute a 7-day rolling total revenue window:
```sql
SELECT Payment_ID, Bill_ID, Amount, Payment_Date,
       SUM(Amount) OVER (ORDER BY Payment_Date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS Rolling_7Day_Total
FROM Payment 
ORDER BY Payment_Date;
```

#### 2. Common Table Expressions (CTEs)
Identify patients requiring clinical follow-up due to abnormal diagnostic lab findings:
```sql
WITH Abnormal_Patients AS (
    SELECT DISTINCT a.Patient_ID
    FROM Lab_Result lr
    JOIN Lab_Order   lo ON lr.Order_ID       = lo.Order_ID
    JOIN Appointment  a ON lo.Appointment_ID = a.Appointment_ID
    WHERE lr.Is_Abnormal = 1
)
SELECT p.Patient_ID, CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient, p.Phone
FROM Patient p
WHERE p.Patient_ID IN (SELECT Patient_ID FROM Abnormal_Patients);
```

#### 3. Set Operations (`UNION`)
Consolidate historical completed visits and upcoming scheduled appointments into a unified chronological log:
```sql
SELECT 'Past' AS Type, a.Appointment_ID,
       CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient, ds.Work_Date
FROM Appointment a
JOIN Patient          p  ON a.Patient_ID   = p.Patient_ID
JOIN Appointment_Slot sl ON a.Slot_ID      = sl.Slot_ID
JOIN Doctor_Schedule  ds ON sl.Schedule_ID = ds.Schedule_ID
WHERE a.Appointment_Status = 'Completed'
UNION
SELECT 'Upcoming', a.Appointment_ID,
       CONCAT(p.First_Name, ' ', p.Last_Name), ds.Work_Date
FROM Appointment a
JOIN Patient          p  ON a.Patient_ID   = p.Patient_ID
JOIN Appointment_Slot sl ON a.Slot_ID      = sl.Slot_ID
JOIN Doctor_Schedule  ds ON sl.Schedule_ID = ds.Schedule_ID
WHERE a.Appointment_Status = 'Scheduled'
ORDER BY Work_Date DESC;
```

#### 4. Subqueries & Correlated Subqueries
Identify patients who have completed more than one consultation:
```sql
SELECT Patient_ID, CONCAT(First_Name, ' ', Last_Name) AS Patient,
       PatientAppointmentCount(Patient_ID) AS Total_Visits
FROM Patient
WHERE Patient_ID IN (
    SELECT Patient_ID 
    FROM Appointment
    GROUP BY Patient_ID 
    HAVING COUNT(*) > 1
);
```

#### 5. Conditional Aggregations & Pivot Queries
Pivot daily revenue statistics by payment channel method:
```sql
SELECT 
    DATE(Payment_Date) AS Payment_Day,
    COUNT(Payment_ID)  AS Total_Transactions,
    SUM(Amount)        AS Gross_Revenue,
    SUM(CASE WHEN Payment_Method = 'Cash'          THEN Amount ELSE 0 END) AS Cash_Total,
    SUM(CASE WHEN Payment_Method = 'Card'          THEN Amount ELSE 0 END) AS Card_Total,
    SUM(CASE WHEN Payment_Method = 'Insurance'     THEN Amount ELSE 0 END) AS Insurance_Total,
    SUM(CASE WHEN Payment_Method = 'Bank_Transfer' THEN Amount ELSE 0 END) AS Bank_Total
FROM Payment
GROUP BY DATE(Payment_Date)
ORDER BY Payment_Day DESC;
```

---

### 3.10 MySQL Database Users & RBAC GRANTs

At the database tier, multi-tenant security is enforced by creating 6 discrete MySQL database user accounts with explicit table-level `GRANT` permissions:

```sql
-- Create dedicated database users
CREATE USER IF NOT EXISTS 'hospital_admin'@'localhost' IDENTIFIED BY 'Admin@HMS2026!';
CREATE USER IF NOT EXISTS 'receptionist'@'localhost'   IDENTIFIED BY 'Recep@HMS2026!';
CREATE USER IF NOT EXISTS 'doctor_user'@'localhost'    IDENTIFIED BY 'Doctor@HMS2026!';
CREATE USER IF NOT EXISTS 'lab_tech'@'localhost'       IDENTIFIED BY 'LabTech@HMS2026!';
CREATE USER IF NOT EXISTS 'pharmacist'@'localhost'     IDENTIFIED BY 'Pharm@HMS2026!';
CREATE USER IF NOT EXISTS 'accountant'@'localhost'     IDENTIFIED BY 'Acct@HMS2026!';

-- Hospital Admin: Full Administrative Privileges
GRANT ALL PRIVILEGES ON Hospital_Management_System.* TO 'hospital_admin'@'localhost' WITH GRANT OPTION;

-- Receptionist: Patient Registration, Scheduling & Slot Booking
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Patient          TO 'receptionist'@'localhost';
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Appointment      TO 'receptionist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Doctor           TO 'receptionist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Doctor_Schedule  TO 'receptionist'@'localhost';
GRANT SELECT, UPDATE         ON Hospital_Management_System.Appointment_Slot TO 'receptionist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Department       TO 'receptionist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Specialization   TO 'receptionist'@'localhost';

-- Doctor: Clinical Records, Prescriptions, Lab Orders
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Medical_Record   TO 'doctor_user'@'localhost';
GRANT SELECT, INSERT         ON Hospital_Management_System.Prescription     TO 'doctor_user'@'localhost';
GRANT SELECT, INSERT         ON Hospital_Management_System.Prescription_Item TO 'doctor_user'@'localhost';
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Lab_Order        TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Lab_Result       TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Patient          TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Appointment      TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Medicine         TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Inventory        TO 'doctor_user'@'localhost';

-- Lab Technician: Lab Orders & Result Entry
GRANT SELECT, UPDATE         ON Hospital_Management_System.Lab_Order        TO 'lab_tech'@'localhost';
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Lab_Result       TO 'lab_tech'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Lab_Test         TO 'lab_tech'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Patient          TO 'lab_tech'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Appointment      TO 'lab_tech'@'localhost';

-- Pharmacist: Medicine Catalog & Inventory Stock Control
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Inventory        TO 'pharmacist'@'localhost';
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Medicine         TO 'pharmacist'@'localhost';
GRANT SELECT, INSERT         ON Hospital_Management_System.Medicine_Category TO 'pharmacist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Prescription     TO 'pharmacist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Prescription_Item TO 'pharmacist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Pharmacy         TO 'pharmacist'@'localhost';

-- Accountant: Billing, Invoicing & Payments
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Bill             TO 'accountant'@'localhost';
GRANT SELECT, INSERT         ON Hospital_Management_System.Payment          TO 'accountant'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Patient          TO 'accountant'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Appointment      TO 'accountant'@'localhost';

FLUSH PRIVILEGES;
```

---

## 4. Access Control & Security Features

### 4.1 Authentication Paradigm (Stateless JWT & bcryptjs)
Security in the Hospital Management System relies on stateless JSON Web Tokens (JWT) combined with adaptive bcrypt password hashing.

1. **Authentication Endpoint (`POST /api/auth/login`)**:
   - Accepts user credentials (`username` / `password`).
   - Queries `App_User` and verifies user activation status (`Is_Active = 1`).
   - Compares cleartext password against `Password_Hash` using `bcrypt.compare(password, user.Password_Hash)`. Passwords are encrypted during seed initialization and user creation using a bcrypt cost factor of 10 (`bcrypt.hashSync(password, 10)`).
   - Upon successful verification, generates a signed JWT payload carrying session metadata:
     ```json
     {
       "id": 1,
       "username": "admin",
       "role": "Hospital_Admin",
       "name": "System Administrator",
       "doctorId": null,
       "employeeId": 1
     }
     ```
   - Tokens are cryptographically signed using a 256-bit secret key (`JWT_SECRET`) with an 8-hour expiration period (`JWT_EXPIRES_IN=8h`).

2. **Bearer Token Middleware (`backend/middleware/auth.js`)**:
   - Incoming REST API requests extract the token from the HTTP `Authorization: Bearer <token>` header.
   - The token is verified using `jwt.verify()`. Upon success, decoded token metadata is attached to `req.user`.
   - If the token is missing, invalid, or expired, the backend returns an HTTP `401 Unauthorized` response.

### 4.2 Backend Role Guards & Middleware Authorization
Route access is enforced using higher-order authorization middleware guards:
- `authorize(...roles)`: Restricts endpoint access strictly to matching system roles.
- `adminOr(...roles)`: Grants automatic access to `Hospital_Admin` while checking matching roles for non-admin users.

```javascript
// Example Endpoint Authorization
router.post('/employees', authMiddleware, adminOr('Hospital_Admin'), async (req, res) => { ... });
router.post('/prescriptions', authMiddleware, authorize('Doctor', 'Hospital_Admin'), async (req, res) => { ... });
```

### 4.3 System Role Access Control Matrix

| System Module / Feature | Hospital Admin | Doctor | Receptionist | Lab Tech | Pharmacist | Accountant |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **System User Provisioning** | ✅ Full CRUD | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **Staff & Employee Directory** | ✅ Full CRUD | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **Patient Directory** | ✅ Full CRUD | ✅ View/History | ✅ View/Add/Edit | ✅ View | ❌ Denied | ✅ View |
| **Doctor Schedules & Slots** | ✅ Manage | ✅ Manage Own | ✅ View | ❌ Denied | ❌ Denied | ❌ Denied |
| **Appointment Booking** | ✅ Full CRUD | ✅ Complete Visit | ✅ Book/Cancel | ❌ Denied | ❌ Denied | ❌ Denied |
| **Medical Records & Prescriptions**| ✅ View | ✅ Write Notes/Rx | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **Pharmacy & Drug Inventory** | ✅ Full CRUD | ✅ View Catalog | ❌ Denied | ❌ Denied | ✅ Full Stock Control| ❌ Denied |
| **Lab Orders & Diagnostics** | ✅ Full CRUD | ✅ Order Tests | ✅ View Orders | ✅ Enter Results | ❌ Denied | ❌ Denied |
| **Billing & Invoicing** | ✅ Full CRUD | ✅ View Patient Bills| ✅ View Bills | ❌ Denied | ❌ Denied | ✅ Generate/Collect |
| **Analytics & Reports** | ✅ Full Reports | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Financial Reports|

### 4.4 Account Lockout & Self-Deletion Protection
To prevent accidental administrative lockout or self-sabotage, the staff deletion endpoint (`DELETE /api/employees/:id`) evaluates session credentials against target record parameters:
```javascript
// Self-Deletion Protection Guard
if (req.user.employeeId === parseInt(empId) || req.user.id === targetUserId) {
  return res.status(400).json({ 
    success: false, 
    message: 'Security Violation: You cannot delete your own active administrative account.' 
  });
}
```

---

## 5. Frontend UI Flow & Component Architecture

### 5.1 Vanilla JS Single Page Application (SPA) Architecture
The frontend is constructed as a frameworkless vanilla JavaScript SPA contained within `frontend/index.html`, `frontend/css/style.css`, and 13 modular JS files in `frontend/js/`.

```
frontend/
├── index.html               # Main HTML DOM container, topbar, sidebar, & 15 modal overlay forms
├── css/
│   └── style.css            # Global CSS variables, Flexbox/Grid layouts, utility classes, print styles
└── js/
    ├── api.js               # Centralized HTTP fetch client, Bearer header injection, 401 interceptor
    ├── app.js               # Navigation routing coordinator & RBAC engine (window.CAN)
    ├── auth.js              # Token storage, login lifecycle, and user session initialization
    ├── utils.js             # Toast notifications, modal show/hide, date formatting, pagination helpers
    ├── dashboard.js         # Analytics widget renderer & KPI cards
    ├── patients.js          # Patient directory table, modal forms, medical history timeline
    ├── doctors.js           # Doctor directory, specialization filtering, schedule calendar modal
    ├── appointments.js      # Appointment booking, date/slot pickers, visit completion modal
    ├── billing.js           # Invoicing table, payment modal, printable receipt generator
    ├── pharmacy.js          # Drug catalog, stock batch updates, pharmacy location switcher
    ├── laboratory.js        # Lab order queue, result entry modal, printable lab certificate generator
    ├── staff.js             # Staff directory table, dynamic role-based auto-provisioning form
    ├── reports.js           # Financial analytics, department revenue breakdown, stock expiry alerts
    └── notifications.js     # Real-time alert polling engine (60s interval) & popover dropdown panel
```

### 5.2 Client-Side Routing & View Filtering
The application operates within a single HTML DOM structure containing 9 main `<section id="page-<name>" class="page-section">` containers.

1. **History API Integration**: `App.navigate(page)` triggers client routing using `window.history.pushState({ page }, '', '/' + page)` without full browser page reloads. Backward and forward browser navigation is intercepted via `window.addEventListener('popstate', ...)`.
2. **DOM Section Activation**: Navigation toggles the `.active` CSS class on the target page section while removing it from inactive sections.
3. **Role-Based UI Rendering**: Upon user login, `App.applyRoleNav(user.role)` evaluates the user's system role against a page permissions matrix (`pageAccess`). Nav items for restricted modules are dynamically hidden (`display: none`). Action-level flags are exposed on `window.CAN` to conditionally suppress action buttons (e.g., "+ Add Staff", "Delete Patient", "Process Payment").

### 5.3 Interactive UI Views & Features

#### 1. Dashboard View (`#page-dashboard`)
Displays system summary widgets tailored to user role: total active patients, today's appointments, pending bill balances, low-stock inventory alerts, and active doctors.

#### 2. Patients Registry View (`#page-patients`)
Interactive patient directory featuring real-time search, gender/blood group filter dropdowns, demographic details modal (`#patient-modal`), and full medical history timeline view (`#patient-history-modal`).

#### 3. Doctors Directory & Schedule View (`#page-doctors`)
Displays doctor cards with consultation fees, specializations, and qualifications. Includes a schedule management modal (`#schedule-modal`) allowing doctors and admins to define working shift parameters and auto-generate 30-minute bookable slots.

#### 4. Staff Management & Dynamic Auto-Provisioning View (`#page-staff`)
Features staff member tables and an integrated auto-provisioning modal (`#staff-modal`). Selecting the "Doctor" role dynamically renders doctor-specific inputs (Specialization, License Number, Experience, Consultation Fee) while hiding standard employee salary inputs. Submitting the form automatically provisions an `App_User` account inside a single backend transaction.

#### 5. Appointments & Slot Booking View (`#page-appointments`)
Interactive appointment desk utilizing debounced typeahead auto-suggest search (350ms delay) for patient and doctor lookup. Selecting a doctor fetches available working dates rendered as interactive chips (`.date-chip`). Selecting a date populates open 30-minute time slots (`.slot-chip`).

#### 6. Billing & Invoicing View (`#page-billing`)
Lists patient invoices with balance statuses (`Pending`, `Partial`, `Paid`). Features a bill generation modal (`#bill-modal`), payment processing modal (`#payment-modal`), and custom printable receipt window.

#### 7. Pharmacy & Inventory View (`#page-pharmacy`)
Multi-location pharmacy control panel supporting medicine catalog management (`#medicine-modal`), stock quantity adjustments (`#stock-modal`), and batch reorder level alerts.

#### 8. Laboratory Diagnostics View (`#page-laboratory`)
Manages lab order requisitions and result entries (`#lab-result-modal`). Highlights abnormal diagnostic values and generates official printable laboratory certificates.

#### 9. Operational & Financial Reports View (`#page-reports`)
Generates analytics charts and data tables detailing revenue by department, monthly appointment volume, doctor workload rankings, and stock expiration timelines.

---

### 5.4 Real-Time Notification Polling Engine
`Notifications.init()` in `frontend/js/notifications.js` sets up an automated 60-second polling timer against `/api/notifications/count`.

```javascript
// Real-time Notification Polling Engine
setInterval(async () => {
  if (!Auth.user) return;
  const res = await Api.get('/notifications/count');
  if (res.success && res.data.total > 0) {
    const badge = document.querySelector('#notif-badge');
    badge.textContent = res.data.total;
    badge.classList.remove('hidden');
  }
}, 60000);
```

If notifications exist (unpaid bills, abnormal lab findings, low inventory stock), a red badge counter is updated on the topbar bell icon. Clicking the bell toggles an absolute-positioned popover panel (`#notif-panel`) displaying categorized alert items.

---

### 5.5 Printable Document Generators
To generate physical paper records without external library dependencies, `Billing.printBill(id)` and `Laboratory.printOrder(id)` construct dynamic printable document windows:

```javascript
// Printable Receipt Generator (Billing)
printBill(billId) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hospital Receipt #${bill.Bill_ID}</title>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
        .receipt-header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .receipt-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .receipt-table th, .receipt-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .total-row { font-weight: bold; background: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="receipt-header">
        <h2>METROPOLITAN GENERAL HOSPITAL</h2>
        <p>Official Billing Receipt | Bill #${bill.Bill_ID}</p>
      </div>
      ...
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
}
```

---

## 6. Future Enhancements & Conclusion

### 6.1 Future System Enhancements
While the Hospital Management System fulfills all database, security, backend, and frontend requirements, future operational expansions could include:
1. **Mobile Application Integration**: Developing native Android (Kotlin) and iOS (Swift) applications utilizing the existing Express RESTful API endpoints.
2. **Telemedicine & Video Consultations**: Integrating WebRTC protocols to facilitate remote virtual patient consultations.
3. **HL7 / FHIR Interoperability**: Implementing HL7 FHIR standard data format exporters to enable seamless electronic health record (EHR) exchanges with external healthcare institutions.
4. **AI-Assisted Diagnostic Analytics**: Integrating machine learning models to analyze patient diagnostic lab trends and assist physicians in early symptom detection.

### 6.2 Conclusion
The **Hospital Management System** represents a robust, university-level Database Management Systems project. By pairing an enterprise-grade **MySQL 8.0 relational schema** featuring 23 normalized tables, strict ACID transactional controls, 7 database triggers, 4 stored functions, 11 stored procedures, and 7 views with a secure **Node.js Express backend** and a responsive **Vanilla JS SPA frontend**, the system successfully resolves real-world operational bottlenecks in healthcare management. The architecture ensures uncompromising data integrity, high-performance query execution, and fine-grained role-based security across all administrative, clinical, and financial workflows.
