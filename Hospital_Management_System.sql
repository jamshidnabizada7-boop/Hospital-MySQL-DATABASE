-- ============================================================
-- Hospital Management System - Complete MySQL 8.0 Database
-- Author  : Senior Database Architect
-- Version : 1.0.0
-- Engine  : MySQL 8.0
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ============================================================
-- SECTION 1: DATABASE CREATION
-- ============================================================
DROP DATABASE IF EXISTS Hospital_Management_System;
CREATE DATABASE Hospital_Management_System
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE Hospital_Management_System;

-- ============================================================
-- SECTION 2: MODULE 1 - SECURITY (Role, User)
-- ============================================================

-- Table: Role
-- Purpose : Defines system roles for access control (RBAC)
-- Relations: One Role -> Many Users
CREATE TABLE Role (
    Role_ID     INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    Role_Name   VARCHAR(50)     NOT NULL,
    Description VARCHAR(255)    NOT NULL DEFAULT '',
    Is_Active   TINYINT(1)      NOT NULL DEFAULT 1,
    Created_At  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_role       PRIMARY KEY (Role_ID),
    CONSTRAINT uq_role_name  UNIQUE      (Role_Name),
    CONSTRAINT chk_role_name CHECK       (CHAR_LENGTH(Role_Name) >= 2)
) ENGINE=InnoDB COMMENT='System roles for RBAC';


-- Table: App_User
-- Purpose : Application-level users mapped to roles
-- Relations: Many Users -> One Role
CREATE TABLE App_User (
    User_ID        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Role_ID        INT UNSIGNED  NOT NULL,
    Username       VARCHAR(50)   NOT NULL,
    Password_Hash  VARCHAR(255)  NOT NULL COMMENT 'bcrypt hash',
    Full_Name      VARCHAR(100)  NOT NULL,
    Email          VARCHAR(100)  NOT NULL,
    Phone          VARCHAR(20)       NULL,
    Is_Active      TINYINT(1)    NOT NULL DEFAULT 1,
    Last_Login     DATETIME          NULL,
    Created_At     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_app_user      PRIMARY KEY (User_ID),
    CONSTRAINT uq_username      UNIQUE      (Username),
    CONSTRAINT uq_user_email    UNIQUE      (Email),
    CONSTRAINT fk_user_role     FOREIGN KEY (Role_ID) REFERENCES Role(Role_ID)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_user_email   CHECK       (Email LIKE '%@%.%')
) ENGINE=InnoDB COMMENT='Application users with role-based access';

-- ============================================================
-- SECTION 3: MODULE 2 - HOSPITAL (Department, Specialization, Doctor, Employee)
-- ============================================================

-- Table: Department
-- Purpose : Hospital departments (e.g., Cardiology, Pediatrics)
-- Relations: One Department -> Many Doctors, Many Employees
CREATE TABLE Department (
    Dept_ID     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Dept_Name   VARCHAR(100)  NOT NULL,
    Location    VARCHAR(100)  NOT NULL DEFAULT '',
    Phone       VARCHAR(20)       NULL,
    Head_Doctor INT UNSIGNED      NULL COMMENT 'FK set after Doctor table created',
    Is_Active   TINYINT(1)    NOT NULL DEFAULT 1,
    Created_At  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_department    PRIMARY KEY (Dept_ID),
    CONSTRAINT uq_dept_name     UNIQUE      (Dept_Name)
) ENGINE=InnoDB COMMENT='Hospital departments';


-- Table: Specialization
-- Purpose : Medical specializations doctors can hold
-- Relations: One Specialization -> Many Doctors
CREATE TABLE Specialization (
    Spec_ID     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Spec_Name   VARCHAR(100)  NOT NULL,
    Description VARCHAR(255)  NOT NULL DEFAULT '',
    Created_At  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_specialization  PRIMARY KEY (Spec_ID),
    CONSTRAINT uq_spec_name       UNIQUE      (Spec_Name)
) ENGINE=InnoDB COMMENT='Medical specializations';

-- Table: Doctor
-- Purpose : Physician / Consultant records
-- Relations: Many -> Department, Many -> Specialization, One -> App_User
CREATE TABLE Doctor (
    Doctor_ID         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    User_ID           INT UNSIGNED       NULL COMMENT 'Linked app user account',
    Dept_ID           INT UNSIGNED   NOT NULL,
    Spec_ID           INT UNSIGNED   NOT NULL,
    First_Name        VARCHAR(50)    NOT NULL,
    Last_Name         VARCHAR(50)    NOT NULL,
    Gender            ENUM('Male','Female','Other') NOT NULL,
    Date_Of_Birth     DATE           NOT NULL,
    License_Number    VARCHAR(50)    NOT NULL,
    Qualification     VARCHAR(150)   NOT NULL DEFAULT '',
    Experience_Years  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    Consultation_Fee  DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Phone             VARCHAR(20)    NOT NULL,
    Email             VARCHAR(100)   NOT NULL,
    Is_Active         TINYINT(1)     NOT NULL DEFAULT 1,
    Joined_Date       DATE           NOT NULL DEFAULT (CURRENT_DATE),
    Created_At        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_doctor          PRIMARY KEY (Doctor_ID),
    CONSTRAINT uq_doctor_license  UNIQUE      (License_Number),
    CONSTRAINT uq_doctor_email    UNIQUE      (Email),
    CONSTRAINT fk_doctor_dept     FOREIGN KEY (Dept_ID)  REFERENCES Department(Dept_ID)
                                  ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_doctor_spec     FOREIGN KEY (Spec_ID)  REFERENCES Specialization(Spec_ID)
                                  ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_doctor_user     FOREIGN KEY (User_ID)  REFERENCES App_User(User_ID)
                                  ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_consult_fee    CHECK (Consultation_Fee >= 0),
    CONSTRAINT chk_exp_years      CHECK (Experience_Years >= 0)
) ENGINE=InnoDB COMMENT='Doctor / Physician records';

-- Now add Head_Doctor FK to Department
ALTER TABLE Department
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (Head_Doctor)
        REFERENCES Doctor(Doctor_ID) ON DELETE SET NULL ON UPDATE CASCADE;


-- Table: Employee
-- Purpose : Non-doctor hospital staff (nurses, admin, lab techs, etc.)
-- Relations: Many -> Department, One -> App_User
CREATE TABLE Employee (
    Emp_ID        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    User_ID       INT UNSIGNED      NULL,
    Dept_ID       INT UNSIGNED      NULL,
    First_Name    VARCHAR(50)   NOT NULL,
    Last_Name     VARCHAR(50)   NOT NULL,
    Gender        ENUM('Male','Female','Other') NOT NULL,
    Date_Of_Birth DATE          NOT NULL,
    Job_Title     VARCHAR(100)  NOT NULL,
    Phone         VARCHAR(20)   NOT NULL,
    Email         VARCHAR(100)  NOT NULL,
    Salary        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    Hire_Date     DATE          NOT NULL DEFAULT (CURRENT_DATE),
    Is_Active     TINYINT(1)    NOT NULL DEFAULT 1,
    Created_At    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_employee       PRIMARY KEY (Emp_ID),
    CONSTRAINT uq_emp_email      UNIQUE      (Email),
    CONSTRAINT fk_emp_dept       FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID)
                                 ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_emp_user       FOREIGN KEY (User_ID) REFERENCES App_User(User_ID)
                                 ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_emp_salary    CHECK (Salary >= 0)
) ENGINE=InnoDB COMMENT='Hospital staff (non-doctor employees)';

-- ============================================================
-- SECTION 4: MODULE 3 - PATIENT
-- ============================================================

-- Table: Patient
-- Purpose : Master patient registry
-- Relations: One Patient -> Many Appointments
CREATE TABLE Patient (
    Patient_ID      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    User_ID         INT UNSIGNED      NULL,
    First_Name      VARCHAR(50)   NOT NULL,
    Last_Name       VARCHAR(50)   NOT NULL,
    Gender          ENUM('Male','Female','Other') NOT NULL,
    Date_Of_Birth   DATE          NOT NULL,
    Blood_Group     ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown') NOT NULL DEFAULT 'Unknown',
    Phone           VARCHAR(20)   NOT NULL,
    Email           VARCHAR(100)      NULL,
    Address         VARCHAR(255)  NOT NULL DEFAULT '',
    Emergency_Name  VARCHAR(100)  NOT NULL DEFAULT '',
    Emergency_Phone VARCHAR(20)   NOT NULL DEFAULT '',
    Insurance_No    VARCHAR(50)       NULL,
    Is_Active       TINYINT(1)    NOT NULL DEFAULT 1,
    Registered_At   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_patient        PRIMARY KEY (Patient_ID),
    CONSTRAINT fk_patient_user   FOREIGN KEY (User_ID) REFERENCES App_User(User_ID)
                                 ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Patient master registry';


-- ============================================================
-- SECTION 5: MODULE 4 - SCHEDULING
-- ============================================================

-- Table: Doctor_Schedule
-- Purpose : Working calendar for each doctor
-- Relations: One Doctor -> Many Schedules; One Schedule -> Many Slots
CREATE TABLE Doctor_Schedule (
    Schedule_ID   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Doctor_ID     INT UNSIGNED  NOT NULL,
    Work_Date     DATE          NOT NULL,
    Start_Time    TIME          NOT NULL,
    End_Time      TIME          NOT NULL,
    Status        ENUM('Available','Leave','Holiday','Cancelled') NOT NULL DEFAULT 'Available',
    Notes         VARCHAR(255)  NOT NULL DEFAULT '',
    Created_At    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_schedule         PRIMARY KEY (Schedule_ID),

    CONSTRAINT fk_sched_doctor     FOREIGN KEY (Doctor_ID) REFERENCES Doctor(Doctor_ID)
                                   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_sched_times     CHECK (End_Time > Start_Time)
) ENGINE=InnoDB COMMENT='Doctor working schedules';

-- Table: Appointment_Slot
-- Purpose : Individual bookable time slots within a schedule
-- Relations: One Schedule -> Many Slots; One Slot -> 0..1 Appointment
CREATE TABLE Appointment_Slot (
    Slot_ID      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Schedule_ID  INT UNSIGNED  NOT NULL,
    Slot_Start   TIME          NOT NULL,
    Slot_End     TIME          NOT NULL,
    Status       ENUM('Open','Booked','Blocked','Completed') NOT NULL DEFAULT 'Open',
    Created_At   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_slot          PRIMARY KEY (Slot_ID),
    CONSTRAINT fk_slot_schedule FOREIGN KEY (Schedule_ID) REFERENCES Doctor_Schedule(Schedule_ID)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_slot_times   CHECK (Slot_End > Slot_Start)
) ENGINE=InnoDB COMMENT='Bookable appointment slots';

-- Table: Appointment
-- Purpose : Booked appointments linking patient to a slot
-- Relations: Many -> Patient, One -> Appointment_Slot
CREATE TABLE Appointment (
    Appointment_ID     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Patient_ID         INT UNSIGNED  NOT NULL,
    Slot_ID            INT UNSIGNED  NOT NULL,
    Reason             VARCHAR(255)  NOT NULL DEFAULT '',
    Appointment_Status ENUM('Scheduled','Completed','Cancelled','No_Show') NOT NULL DEFAULT 'Scheduled',
    Cancelled_Reason   VARCHAR(255)      NULL,
    Created_At         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_appointment       PRIMARY KEY (Appointment_ID),
    KEY idx_appointment_slot (Slot_ID),
    CONSTRAINT fk_appt_patient      FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_appt_slot         FOREIGN KEY (Slot_ID)    REFERENCES Appointment_Slot(Slot_ID)
                                    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Patient appointments';


-- ============================================================
-- SECTION 6: MODULE 5 - MEDICAL RECORDS
-- ============================================================

-- Table: Medical_Record
-- Purpose : Clinical notes created after a completed appointment
-- Relations: One Appointment -> One Medical_Record
CREATE TABLE Medical_Record (
    Record_ID       INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    Appointment_ID  INT UNSIGNED   NOT NULL,
    Diagnosis       TEXT           NOT NULL,
    Treatment       TEXT           NOT NULL,
    Visit_Notes     TEXT               NULL,
    Follow_Up_Date  DATE               NULL,
    Created_At      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_medical_record   PRIMARY KEY (Record_ID),
    CONSTRAINT uq_record_appt      UNIQUE      (Appointment_ID),
    CONSTRAINT fk_record_appt      FOREIGN KEY (Appointment_ID) REFERENCES Appointment(Appointment_ID)
                                   ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Medical records linked to completed appointments';

-- Table: Prescription
-- Purpose : Prescription header tied to a medical record
-- Relations: One Medical_Record -> Many Prescriptions
CREATE TABLE Prescription (
    Prescription_ID    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Record_ID          INT UNSIGNED  NOT NULL,
    Prescription_Date  DATE          NOT NULL DEFAULT (CURRENT_DATE),
    Notes              TEXT              NULL,
    Created_At         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_prescription    PRIMARY KEY (Prescription_ID),
    CONSTRAINT fk_presc_record    FOREIGN KEY (Record_ID) REFERENCES Medical_Record(Record_ID)
                                  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Prescription headers';

-- Table: Prescription_Item
-- Purpose : Individual medicine lines within a prescription
-- Relations: Many -> Prescription, Many -> Medicine
CREATE TABLE Prescription_Item (
    Item_ID          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Prescription_ID  INT UNSIGNED  NOT NULL,
    Medicine_ID      INT UNSIGNED  NOT NULL,
    Dosage           VARCHAR(50)   NOT NULL COMMENT 'e.g. 500mg',
    Frequency        VARCHAR(50)   NOT NULL COMMENT 'e.g. Twice daily',
    Duration_Days    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    Instructions     VARCHAR(255)  NOT NULL DEFAULT '',
    Created_At       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_presc_item      PRIMARY KEY (Item_ID),
    CONSTRAINT fk_item_presc      FOREIGN KEY (Prescription_ID) REFERENCES Prescription(Prescription_ID)
                                  ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_item_medicine   FOREIGN KEY (Medicine_ID) REFERENCES Medicine(Medicine_ID)
                                  ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_duration       CHECK (Duration_Days >= 1)
) ENGINE=InnoDB COMMENT='Prescription line items';


-- ============================================================
-- SECTION 7: MODULE 6 - PHARMACY
-- ============================================================

-- Table: Medicine_Category
-- Purpose : Classifies medicines (Antibiotic, Analgesic, etc.)
CREATE TABLE Medicine_Category (
    Category_ID   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Category_Name VARCHAR(100)  NOT NULL,
    Description   VARCHAR(255)  NOT NULL DEFAULT '',
    Created_At    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_med_category  PRIMARY KEY (Category_ID),
    CONSTRAINT uq_cat_name      UNIQUE      (Category_Name)
) ENGINE=InnoDB COMMENT='Medicine categories';

-- Table: Medicine
-- Purpose : Master medicine / drug catalog
-- Relations: Many -> Medicine_Category
CREATE TABLE Medicine (
    Medicine_ID     INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    Category_ID     INT UNSIGNED   NOT NULL,
    Medicine_Name   VARCHAR(150)   NOT NULL,
    Generic_Name    VARCHAR(150)   NOT NULL DEFAULT '',
    Manufacturer    VARCHAR(100)   NOT NULL DEFAULT '',
    Dosage_Form     ENUM('Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Other') NOT NULL DEFAULT 'Tablet',
    Strength        VARCHAR(50)    NOT NULL COMMENT 'e.g. 500mg',
    Unit_Price      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Requires_Rx     TINYINT(1)     NOT NULL DEFAULT 1 COMMENT '1=Prescription required',
    Is_Active       TINYINT(1)     NOT NULL DEFAULT 1,
    Created_At      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_medicine       PRIMARY KEY (Medicine_ID),

    CONSTRAINT fk_med_category   FOREIGN KEY (Category_ID) REFERENCES Medicine_Category(Category_ID)
                                 ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_unit_price    CHECK (Unit_Price >= 0),
    CONSTRAINT chk_medicine_strength CHECK (Strength REGEXP '^[0-9]+(\\.[0-9]+)?(/[0-9]+(\\.[0-9]+)?)?[a-zA-Z%]+$')
) ENGINE=InnoDB COMMENT='Medicine / drug master catalog';

-- Table: Pharmacy
-- Purpose : Physical pharmacy locations in the hospital
CREATE TABLE Pharmacy (
    Pharmacy_ID   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Pharmacy_Name VARCHAR(100)  NOT NULL,
    Location      VARCHAR(100)  NOT NULL DEFAULT '',
    Phone         VARCHAR(20)       NULL,
    Is_Active     TINYINT(1)    NOT NULL DEFAULT 1,
    Created_At    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_pharmacy      PRIMARY KEY (Pharmacy_ID),
    CONSTRAINT uq_pharmacy_name UNIQUE      (Pharmacy_Name),
    CONSTRAINT chk_pharmacy_loc CHECK       (TRIM(Location) <> '')
) ENGINE=InnoDB COMMENT='Pharmacy locations';

-- Table: Inventory
-- Purpose : Stock levels per medicine per pharmacy
-- Relations: Many -> Pharmacy, Many -> Medicine
CREATE TABLE Inventory (
    Inventory_ID     INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    Pharmacy_ID      INT UNSIGNED   NOT NULL,
    Medicine_ID      INT UNSIGNED   NOT NULL,
    Quantity_In_Stock INT UNSIGNED  NOT NULL DEFAULT 0,
    Reorder_Level    INT UNSIGNED   NOT NULL DEFAULT 10,
    Batch_Number     VARCHAR(50)    NOT NULL DEFAULT '',
    Expiry_Date      DATE           NOT NULL,
    Unit_Cost        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Last_Updated     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    Created_At       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_inventory       PRIMARY KEY (Inventory_ID),
    CONSTRAINT uq_pharm_med_batch UNIQUE      (Pharmacy_ID, Medicine_ID, Batch_Number),
    CONSTRAINT fk_inv_pharmacy    FOREIGN KEY (Pharmacy_ID)  REFERENCES Pharmacy(Pharmacy_ID)
                                  ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_inv_medicine    FOREIGN KEY (Medicine_ID)  REFERENCES Medicine(Medicine_ID)
                                  ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_qty            CHECK (Quantity_In_Stock >= 0),
    CONSTRAINT chk_unit_cost      CHECK (Unit_Cost >= 0)
) ENGINE=InnoDB COMMENT='Medicine inventory per pharmacy';


-- ============================================================
-- SECTION 8: MODULE 7 - LABORATORY
-- ============================================================

-- Table: Lab_Test
-- Purpose : Catalog of available lab tests
CREATE TABLE Lab_Test (
    Test_ID      INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    Test_Name    VARCHAR(150)   NOT NULL,
    Test_Code    VARCHAR(20)    NOT NULL,
    Category     VARCHAR(100)   NOT NULL DEFAULT '',
    Normal_Range VARCHAR(100)   NOT NULL DEFAULT '',
    Unit         VARCHAR(30)    NOT NULL DEFAULT '',
    Price        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Turnaround_Hrs SMALLINT UNSIGNED NOT NULL DEFAULT 24,
    Is_Active    TINYINT(1)     NOT NULL DEFAULT 1,
    Created_At   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_lab_test      PRIMARY KEY (Test_ID),
    CONSTRAINT uq_test_code     UNIQUE      (Test_Code),
    CONSTRAINT chk_test_price   CHECK       (Price >= 0)
) ENGINE=InnoDB COMMENT='Laboratory test catalog';

-- Table: Lab_Order
-- Purpose : Doctor-issued lab test orders for a patient appointment
-- Relations: Many -> Appointment, Many -> Doctor
CREATE TABLE Lab_Order (
    Order_ID      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Appointment_ID INT UNSIGNED NOT NULL,
    Doctor_ID     INT UNSIGNED  NOT NULL,
    Order_Date    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Priority      ENUM('Routine','Urgent','STAT') NOT NULL DEFAULT 'Routine',
    Status        ENUM('Pending','In_Progress','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
    Notes         TEXT              NULL,
    Created_At    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_lab_order     PRIMARY KEY (Order_ID),
    CONSTRAINT fk_order_appt    FOREIGN KEY (Appointment_ID) REFERENCES Appointment(Appointment_ID)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_order_doctor  FOREIGN KEY (Doctor_ID)      REFERENCES Doctor(Doctor_ID)
                                ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Lab test orders';

-- Table: Lab_Result
-- Purpose : Test results for each test within a lab order
-- Relations: Many -> Lab_Order, Many -> Lab_Test
CREATE TABLE Lab_Result (
    Result_ID    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    Order_ID     INT UNSIGNED   NOT NULL,
    Test_ID      INT UNSIGNED   NOT NULL,
    Result       TEXT           NOT NULL,
    Result_Date  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Is_Abnormal  TINYINT(1)     NOT NULL DEFAULT 0,
    Remarks      TEXT               NULL,
    Performed_By INT UNSIGNED       NULL COMMENT 'FK to Employee (lab tech)',
    Created_At   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_lab_result    PRIMARY KEY (Result_ID),
    CONSTRAINT uq_order_test    UNIQUE      (Order_ID, Test_ID),
    CONSTRAINT fk_result_order  FOREIGN KEY (Order_ID)       REFERENCES Lab_Order(Order_ID)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_result_test   FOREIGN KEY (Test_ID)        REFERENCES Lab_Test(Test_ID)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_result_emp    FOREIGN KEY (Performed_By)   REFERENCES Employee(Emp_ID)
                                ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Lab test results';


-- ============================================================
-- SECTION 9: MODULE 8 - BILLING
-- ============================================================

-- Table: Bill
-- Purpose : Invoice generated after appointment completion
-- Relations: One Appointment -> One Bill
CREATE TABLE Bill (
    Bill_ID          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    Appointment_ID   INT UNSIGNED   NOT NULL,
    Bill_Date        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Consultation_Fee DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Medicine_Fee     DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Lab_Fee          DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Other_Fee        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Discount         DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Tax              DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Total_Amount     DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Amount_Paid      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Balance_Due      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    Bill_Status      ENUM('Pending','Partial','Paid','Waived','Cancelled') NOT NULL DEFAULT 'Pending',
    Notes            TEXT               NULL,
    Created_At       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_bill          PRIMARY KEY (Bill_ID),
    CONSTRAINT uq_bill_appt     UNIQUE      (Appointment_ID),
    CONSTRAINT fk_bill_appt     FOREIGN KEY (Appointment_ID) REFERENCES Appointment(Appointment_ID)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_bill_amounts CHECK (Total_Amount >= 0 AND Discount >= 0 AND Amount_Paid >= 0)
) ENGINE=InnoDB COMMENT='Patient billing / invoices';

-- Table: Payment
-- Purpose : Payment transactions against a bill
-- Relations: Many -> Bill
CREATE TABLE Payment (
    Payment_ID      INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    Bill_ID         INT UNSIGNED   NOT NULL,
    Payment_Date    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Amount          DECIMAL(10,2)  NOT NULL,
    Payment_Method  ENUM('Cash','Card','Bank_Transfer','Insurance','Mobile_Money','Other') NOT NULL DEFAULT 'Cash',
    Reference_No    VARCHAR(100)       NULL COMMENT 'Transaction / receipt reference',
    Received_By     INT UNSIGNED       NULL COMMENT 'FK to Employee (accountant)',
    Notes           TEXT               NULL,
    Created_At      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_payment        PRIMARY KEY (Payment_ID),
    CONSTRAINT fk_payment_bill   FOREIGN KEY (Bill_ID)       REFERENCES Bill(Bill_ID)
                                 ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payment_emp    FOREIGN KEY (Received_By)   REFERENCES Employee(Emp_ID)
                                 ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_pay_amount    CHECK (Amount > 0)
) ENGINE=InnoDB COMMENT='Payment transactions';

-- ============================================================
-- SECTION 10: AUDIT LOG
-- ============================================================
CREATE TABLE Audit_Log (
    Log_ID       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    Table_Name   VARCHAR(64)     NOT NULL,
    Record_ID    INT UNSIGNED    NOT NULL,
    Action       ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    Changed_By   VARCHAR(50)     NOT NULL DEFAULT 'SYSTEM',
    Old_Values   JSON                NULL,
    New_Values   JSON                NULL,
    Changed_At   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_audit_log PRIMARY KEY (Log_ID)
) ENGINE=InnoDB COMMENT='Audit trail for all critical tables';


-- ============================================================
-- SECTION 11: INDEXES
-- ============================================================
-- Doctor indexes
CREATE INDEX idx_doctor_name       ON Doctor(Last_Name, First_Name);
CREATE INDEX idx_doctor_dept       ON Doctor(Dept_ID);
CREATE INDEX idx_doctor_spec       ON Doctor(Spec_ID);
CREATE INDEX idx_doctor_active     ON Doctor(Is_Active);

-- Patient indexes
CREATE INDEX idx_patient_name      ON Patient(Last_Name, First_Name);
CREATE INDEX idx_patient_phone     ON Patient(Phone);
CREATE INDEX idx_patient_dob       ON Patient(Date_Of_Birth);

-- Appointment indexes
CREATE INDEX idx_appt_patient      ON Appointment(Patient_ID);
CREATE INDEX idx_appt_status       ON Appointment(Appointment_Status);

-- Doctor_Schedule indexes
CREATE INDEX idx_sched_doctor      ON Doctor_Schedule(Doctor_ID);
CREATE INDEX idx_sched_date        ON Doctor_Schedule(Work_Date);
CREATE INDEX idx_sched_status      ON Doctor_Schedule(Status);

-- Appointment_Slot indexes
CREATE INDEX idx_slot_schedule     ON Appointment_Slot(Schedule_ID);
CREATE INDEX idx_slot_status       ON Appointment_Slot(Status);

-- Medicine indexes
CREATE INDEX idx_med_name          ON Medicine(Medicine_Name);
CREATE INDEX idx_med_category      ON Medicine(Category_ID);
CREATE INDEX idx_med_active        ON Medicine(Is_Active);

-- Inventory indexes
CREATE INDEX idx_inv_medicine      ON Inventory(Medicine_ID);
CREATE INDEX idx_inv_expiry        ON Inventory(Expiry_Date);
CREATE INDEX idx_inv_pharmacy      ON Inventory(Pharmacy_ID);

-- Bill indexes
CREATE INDEX idx_bill_date         ON Bill(Bill_Date);
CREATE INDEX idx_bill_status       ON Bill(Bill_Status);

-- Lab_Order indexes
CREATE INDEX idx_laborder_appt     ON Lab_Order(Appointment_ID);
CREATE INDEX idx_laborder_status   ON Lab_Order(Status);

-- Payment indexes
CREATE INDEX idx_payment_bill      ON Payment(Bill_ID);
CREATE INDEX idx_payment_date      ON Payment(Payment_Date);

-- Audit_Log indexes
CREATE INDEX idx_audit_table       ON Audit_Log(Table_Name, Changed_At);


-- ============================================================
-- SECTION 12: VIEWS
-- ============================================================

-- View: Upcoming_Appointments
-- Shows all scheduled future appointments with doctor and patient info
CREATE OR REPLACE VIEW Upcoming_Appointments AS
SELECT
    a.Appointment_ID,
    CONCAT(p.First_Name,' ',p.Last_Name)   AS Patient_Name,
    p.Phone                                 AS Patient_Phone,
    CONCAT(d.First_Name,' ',d.Last_Name)   AS Doctor_Name,
    dept.Dept_Name,
    ds.Work_Date,
    sl.Slot_Start,
    sl.Slot_End,
    a.Reason,
    a.Appointment_Status
FROM Appointment a
JOIN Patient           p    ON a.Patient_ID  = p.Patient_ID
JOIN Appointment_Slot  sl   ON a.Slot_ID     = sl.Slot_ID
JOIN Doctor_Schedule   ds   ON sl.Schedule_ID = ds.Schedule_ID
JOIN Doctor            d    ON ds.Doctor_ID  = d.Doctor_ID
JOIN Department        dept ON d.Dept_ID     = dept.Dept_ID
WHERE a.Appointment_Status = 'Scheduled'
  AND ds.Work_Date >= CURRENT_DATE
ORDER BY ds.Work_Date, sl.Slot_Start;

-- View: Doctor_Daily_Schedule
-- Today's schedule for every active doctor
CREATE OR REPLACE VIEW Doctor_Daily_Schedule AS
SELECT
    d.Doctor_ID,
    CONCAT(d.First_Name,' ',d.Last_Name)   AS Doctor_Name,
    dept.Dept_Name,
    ds.Work_Date,
    sl.Slot_ID,
    sl.Slot_Start,
    sl.Slot_End,
    sl.Status                               AS Slot_Status,
    CONCAT(p.First_Name,' ',p.Last_Name)   AS Patient_Name,
    a.Reason
FROM Doctor_Schedule ds
JOIN Doctor            d    ON ds.Doctor_ID   = d.Doctor_ID
JOIN Department        dept ON d.Dept_ID      = dept.Dept_ID
JOIN Appointment_Slot  sl   ON sl.Schedule_ID = ds.Schedule_ID
LEFT JOIN Appointment  a    ON a.Slot_ID      = sl.Slot_ID
LEFT JOIN Patient      p    ON a.Patient_ID   = p.Patient_ID
WHERE ds.Work_Date = CURRENT_DATE
ORDER BY d.Last_Name, sl.Slot_Start;

-- View: Patient_Medical_History
-- Full medical history per patient
CREATE OR REPLACE VIEW Patient_Medical_History AS
SELECT
    p.Patient_ID,
    CONCAT(p.First_Name,' ',p.Last_Name)   AS Patient_Name,
    ds.Work_Date                            AS Visit_Date,
    CONCAT(d.First_Name,' ',d.Last_Name)   AS Doctor_Name,
    dept.Dept_Name,
    mr.Diagnosis,
    mr.Treatment,
    mr.Visit_Notes,
    mr.Follow_Up_Date
FROM Patient          p
JOIN Appointment      a    ON a.Patient_ID    = p.Patient_ID
JOIN Appointment_Slot sl   ON a.Slot_ID       = sl.Slot_ID
JOIN Doctor_Schedule  ds   ON sl.Schedule_ID  = ds.Schedule_ID
JOIN Doctor           d    ON ds.Doctor_ID    = d.Doctor_ID
JOIN Department       dept ON d.Dept_ID       = dept.Dept_ID
JOIN Medical_Record   mr   ON mr.Appointment_ID = a.Appointment_ID
ORDER BY p.Patient_ID, ds.Work_Date DESC;


-- View: Outstanding_Bills
-- Bills with remaining balance
CREATE OR REPLACE VIEW Outstanding_Bills AS
SELECT
    b.Bill_ID,
    CONCAT(p.First_Name,' ',p.Last_Name)   AS Patient_Name,
    p.Phone                                 AS Patient_Phone,
    b.Bill_Date,
    b.Total_Amount,
    b.Amount_Paid,
    b.Balance_Due,
    b.Bill_Status
FROM Bill b
JOIN Appointment  a ON b.Appointment_ID = a.Appointment_ID
JOIN Patient      p ON a.Patient_ID     = p.Patient_ID
WHERE b.Bill_Status IN ('Pending','Partial')
ORDER BY b.Balance_Due DESC;

-- View: Available_Doctors
-- Doctors who have open slots today or in the future
CREATE OR REPLACE VIEW Available_Doctors AS
SELECT
    d.Doctor_ID,
    CONCAT(d.First_Name,' ',d.Last_Name)   AS Doctor_Name,
    s.Spec_Name,
    dept.Dept_Name,
    d.Consultation_Fee,
    ds.Work_Date,
    COUNT(sl.Slot_ID)                       AS Open_Slots
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

-- View: Medicine_Inventory
-- Current stock levels with expiry information
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

-- View: Lab_Test_Results
-- Lab results with patient and test details
CREATE OR REPLACE VIEW Lab_Test_Results AS
SELECT
    lr.Result_ID,
    CONCAT(p.First_Name,' ',p.Last_Name)   AS Patient_Name,
    CONCAT(d.First_Name,' ',d.Last_Name)   AS Ordering_Doctor,
    lt.Test_Name,
    lt.Test_Code,
    lt.Normal_Range,
    lt.Unit,
    lr.Result,
    lr.Is_Abnormal,
    lr.Result_Date,
    lr.Remarks,
    lo.Priority,
    lo.Status                               AS Order_Status
FROM Lab_Result       lr
JOIN Lab_Order        lo ON lr.Order_ID       = lo.Order_ID
JOIN Lab_Test         lt ON lr.Test_ID        = lt.Test_ID
JOIN Appointment      a  ON lo.Appointment_ID = a.Appointment_ID
JOIN Patient          p  ON a.Patient_ID      = p.Patient_ID
JOIN Doctor           d  ON lo.Doctor_ID      = d.Doctor_ID
ORDER BY lr.Result_Date DESC;


-- ============================================================
-- SECTION 13: FUNCTIONS
-- ============================================================
DELIMITER $$

-- Function: CalculateAge
-- Returns age in years from date of birth
CREATE FUNCTION CalculateAge(p_dob DATE)
RETURNS TINYINT UNSIGNED
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_dob, CURRENT_DATE);
END$$

-- Function: CalculateBillTotal
-- Returns total amount for a bill
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

-- Function: DoctorAvailable
-- Returns 1 if doctor has an open slot on a given date, else 0
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

-- Function: PatientAppointmentCount
-- Returns total number of appointments for a patient
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


-- ============================================================
-- SECTION 14: STORED PROCEDURES
-- ============================================================
DELIMITER $$

-- SP: RegisterPatient
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

-- SP: BookAppointment
CREATE PROCEDURE BookAppointment(
    IN  p_patient_id INT UNSIGNED,
    IN  p_slot_id    INT UNSIGNED,
    IN  p_reason     VARCHAR(255),
    OUT p_appt_id    INT UNSIGNED,
    OUT p_message    VARCHAR(255)
)
BEGIN
    DECLARE v_slot_status  VARCHAR(20);
    DECLARE v_existing_appt INT DEFAULT 0;

    START TRANSACTION;

    -- Lock slot row
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

-- SP: CancelAppointment
CREATE PROCEDURE CancelAppointment(
    IN  p_appt_id INT UNSIGNED,
    IN  p_reason  VARCHAR(255),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_slot   INT UNSIGNED;

    START TRANSACTION;

    SELECT Appointment_Status, Slot_ID
    INTO   v_status, v_slot
    FROM   Appointment
    WHERE  Appointment_ID = p_appt_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SET p_message = 'Appointment not found';
        ROLLBACK;
    ELSEIF v_status NOT IN ('Scheduled') THEN
        SET p_message = CONCAT('Cannot cancel appointment in status: ', v_status);
        ROLLBACK;
    ELSE
        UPDATE Appointment
        SET    Appointment_Status = 'Cancelled',
               Cancelled_Reason  = p_reason
        WHERE  Appointment_ID = p_appt_id;

        UPDATE Appointment_Slot SET Status = 'Open' WHERE Slot_ID = v_slot;

        SET p_message = 'Appointment cancelled';
        COMMIT;
    END IF;
END$$

-- SP: CompleteAppointment
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
        -- Update status; trg_auto_medical_record_on_complete trigger auto-creates the record
        UPDATE Appointment SET Appointment_Status = 'Completed' WHERE Appointment_ID = p_appt_id;
        UPDATE Appointment_Slot SET Status = 'Completed' WHERE Slot_ID = v_slot;

        -- Populate the auto-created Medical_Record with actual clinical data
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


-- SP: GenerateBill
CREATE PROCEDURE GenerateBill(
    IN  p_appt_id      INT UNSIGNED,
    IN  p_med_fee      DECIMAL(10,2),
    IN  p_lab_fee      DECIMAL(10,2),
    IN  p_other_fee    DECIMAL(10,2),
    IN  p_discount     DECIMAL(10,2),
    IN  p_tax          DECIMAL(10,2),
    OUT p_bill_id      INT UNSIGNED,
    OUT p_message      VARCHAR(255)
)
BEGIN
    DECLARE v_appt_status  VARCHAR(20);
    DECLARE v_consult_fee  DECIMAL(10,2);
    DECLARE v_total        DECIMAL(10,2);
    DECLARE v_exist        INT DEFAULT 0;

    START TRANSACTION;

    SELECT a.Appointment_Status, d.Consultation_Fee
    INTO   v_appt_status, v_consult_fee
    FROM   Appointment a
    JOIN   Appointment_Slot  sl ON a.Slot_ID      = sl.Slot_ID
    JOIN   Doctor_Schedule   ds ON sl.Schedule_ID = ds.Schedule_ID
    JOIN   Doctor            d  ON ds.Doctor_ID   = d.Doctor_ID
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

-- SP: AddMedicine
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

-- SP: UpdateMedicineStock
CREATE PROCEDURE UpdateMedicineStock(
    IN  p_inventory_id  INT UNSIGNED,
    IN  p_qty_change    INT,
    OUT p_message       VARCHAR(255)
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

-- SP: CreatePrescription
CREATE PROCEDURE CreatePrescription(
    IN  p_record_id      INT UNSIGNED,
    IN  p_notes          TEXT,
    OUT p_prescription_id INT UNSIGNED
)
BEGIN
    INSERT INTO Prescription(Record_ID, Notes)
    VALUES(p_record_id, p_notes);
    SET p_prescription_id = LAST_INSERT_ID();
END$$

-- SP: OrderLabTest
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

-- SP: RecordLabResult
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

-- SP: ProcessPayment
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
        -- Insert payment only; trigger recalculates Amount_Paid/Balance_Due/Status
        INSERT INTO Payment(Bill_ID, Amount, Payment_Method, Reference_No, Received_By)
        VALUES(p_bill_id, p_amount, p_method, p_ref_no, p_emp_id);
        SET p_payment_id = LAST_INSERT_ID();
        SET p_message = 'Payment processed successfully';
        COMMIT;
    END IF;
END$$

DELIMITER ;


-- ============================================================
-- SECTION 16: SAMPLE DATA
-- ============================================================

-- Roles
INSERT INTO Role(Role_Name, Description) VALUES
('Hospital_Admin',  'Full system access'),
('Receptionist',    'Appointment and patient registration'),
('Doctor',          'Patient care, records, prescriptions'),
('Lab_Technician',  'Lab orders and results'),
('Pharmacist',      'Inventory and dispensing'),
('Accountant',      'Billing and payments');

-- App Users (passwords are bcrypt hash for 'x')
INSERT INTO App_User(Role_ID, Username, Password_Hash, Full_Name, Email, Phone) VALUES
(1, 'admin',        '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'System Admin',         'admin@hospital.com',       '0700000001'),
(2, 'receptionist1','$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Sara Ahmed',           'sara@hospital.com',        '0700000002'),
(3, 'dr_kamal',     '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Dr. Kamal Haidari',    'kamal@hospital.com',       '0700000003'),
(3, 'dr_layla',     '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Dr. Layla Noori',      'layla@hospital.com',       '0700000004'),
(3, 'dr_omar',      '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Dr. Omar Yousuf',      'omar@hospital.com',        '0700000005'),
(4, 'labtech1',     '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Nadia Karimi',         'nadia@hospital.com',       '0700000006'),
(5, 'pharmacist1',  '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Khalid Wardak',        'khalid@hospital.com',      '0700000007'),
(6, 'accountant1',  '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Roya Ahmadi',          'roya@hospital.com',        '0700000008'),
(3, 'dr_fatima',    '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Dr. Fatima Sultani',   'fatima@hospital.com',      '0700000009'),
(3, 'dr_rahul',     '$2b$10$8vQXtiMyIKf275ky4MG3yeBeaYuZyKewFALyIPnsua60lRkududMK', 'Dr. Rahul Sharma',     'rahul@hospital.com',       '0700000010');

-- Specializations
INSERT INTO Specialization(Spec_Name, Description) VALUES
('Cardiology',          'Heart and cardiovascular system'),
('Neurology',           'Brain and nervous system'),
('Pediatrics',          'Children health care'),
('Orthopedics',         'Bones, joints, and muscles'),
('Dermatology',         'Skin, hair, and nails'),
('Gynecology',          'Female reproductive system'),
('Ophthalmology',       'Eye care'),
('ENT',                 'Ear, Nose, and Throat'),
('General Surgery',     'Surgical procedures'),
('Internal Medicine',   'General adult medicine');

-- Departments (Head_Doctor set later via UPDATE)
INSERT INTO Department(Dept_Name, Location, Phone) VALUES
('Cardiology',       'Block A, Floor 2', '0200000001'),
('Neurology',        'Block A, Floor 3', '0200000002'),
('Pediatrics',       'Block B, Floor 1', '0200000003'),
('Orthopedics',      'Block B, Floor 2', '0200000004'),
('Dermatology',      'Block C, Floor 1', '0200000005'),
('Gynecology',       'Block C, Floor 2', '0200000006'),
('Ophthalmology',    'Block D, Floor 1', '0200000007'),
('ENT',              'Block D, Floor 2', '0200000008'),
('General Surgery',  'Block E, Floor 1', '0200000009'),
('Internal Medicine','Block E, Floor 2', '0200000010');


-- Doctors (10)
INSERT INTO Doctor(User_ID, Dept_ID, Spec_ID, First_Name, Last_Name, Gender, Date_Of_Birth,
                   License_Number, Qualification, Experience_Years, Consultation_Fee, Phone, Email) VALUES
(3,  1,  1, 'Kamal',   'Haidari',  'Male',   '1975-04-10', 'LIC-001', 'MBBS, MD Cardiology',    20, 1500.00, '0700000003', 'kamal@hospital.com'),
(4,  2,  2, 'Layla',   'Noori',    'Female', '1980-07-22', 'LIC-002', 'MBBS, MD Neurology',     15, 1400.00, '0700000004', 'layla@hospital.com'),
(5,  3,  3, 'Omar',    'Yousuf',   'Male',   '1983-11-05', 'LIC-003', 'MBBS, DCH Pediatrics',   12, 1000.00, '0700000005', 'omar@hospital.com'),
(9,  4,  4, 'Fatima',  'Sultani',  'Female', '1978-02-14', 'LIC-004', 'MBBS, MS Orthopedics',   17, 1300.00, '0700000009', 'fatima@hospital.com'),
(10, 5,  5, 'Rahul',   'Sharma',   'Male',   '1985-09-30', 'LIC-005', 'MBBS, MD Dermatology',   10, 900.00,  '0700000010', 'rahul@hospital.com'),
(NULL,6, 6, 'Mariam',  'Rahmani',  'Female', '1979-06-18', 'LIC-006', 'MBBS, MS Gynecology',    16, 1200.00, '0701000006', 'mariam@hospital.com'),
(NULL,7, 7, 'Ahmad',   'Safi',     'Male',   '1982-03-25', 'LIC-007', 'MBBS, MS Ophthalmology', 13, 1100.00, '0701000007', 'ahmad@hospital.com'),
(NULL,8, 8, 'Zainab',  'Mohseni',  'Female', '1987-12-01', 'LIC-008', 'MBBS, DLO ENT',          8,  850.00,  '0701000008', 'zainab@hospital.com'),
(NULL,9, 9, 'Sami',    'Azizi',    'Male',   '1976-08-09', 'LIC-009', 'MBBS, MS General Surgery',19,1600.00, '0701000009', 'sami@hospital.com'),
(NULL,10,10,'Parisa',  'Karimi',   'Female', '1981-05-20', 'LIC-010', 'MBBS, MD Internal Medicine',14,1050.00,'0701000010','parisa@hospital.com');

-- Update department heads
UPDATE Department SET Head_Doctor = 1  WHERE Dept_ID = 1;
UPDATE Department SET Head_Doctor = 2  WHERE Dept_ID = 2;
UPDATE Department SET Head_Doctor = 3  WHERE Dept_ID = 3;
UPDATE Department SET Head_Doctor = 4  WHERE Dept_ID = 4;
UPDATE Department SET Head_Doctor = 5  WHERE Dept_ID = 5;
UPDATE Department SET Head_Doctor = 6  WHERE Dept_ID = 6;
UPDATE Department SET Head_Doctor = 7  WHERE Dept_ID = 7;
UPDATE Department SET Head_Doctor = 8  WHERE Dept_ID = 8;
UPDATE Department SET Head_Doctor = 9  WHERE Dept_ID = 9;
UPDATE Department SET Head_Doctor = 10 WHERE Dept_ID = 10;

-- Employees (15)
INSERT INTO Employee(User_ID, Dept_ID, First_Name, Last_Name, Gender, Date_Of_Birth,
                     Job_Title, Phone, Email, Salary, Hire_Date) VALUES
(2,  1,  'Sara',     'Ahmed',     'Female', '1990-01-15', 'Receptionist',    '0700000002', 'sara@hospital.com',       25000.00, '2020-01-10'),
(6,  2,  'Nadia',    'Karimi',    'Female', '1992-04-20', 'Lab Technician',  '0700000006', 'nadia@hospital.com',      28000.00, '2019-06-01'),
(7,  5,  'Khalid',   'Wardak',    'Male',   '1988-09-11', 'Pharmacist',      '0700000007', 'khalid@hospital.com',     30000.00, '2018-03-15'),
(8,  10, 'Roya',     'Ahmadi',    'Female', '1991-07-07', 'Accountant',      '0700000008', 'roya@hospital.com',       32000.00, '2017-11-20'),
(1,  1,  'Yusuf',    'Mansoor',   'Male',   '1985-02-28', 'IT Administrator','0701000011', 'yusuf@hospital.com',      35000.00, '2016-05-05'),
(NULL,3, 'Hamida',   'Noor',      'Female', '1993-06-30', 'Nurse',           '0701000012', 'hamida@hospital.com',     22000.00, '2021-08-01'),
(NULL,4, 'Tariq',    'Barakzai',  'Male',   '1989-10-14', 'Nurse',           '0701000013', 'tariq@hospital.com',      22000.00, '2020-09-15'),
(NULL,6, 'Maryam',   'Siddiq',    'Female', '1994-03-05', 'Nurse',           '0701000014', 'maryam@hospital.com',     22000.00, '2022-01-20'),
(NULL,7, 'Zia',      'Bahaduri',  'Male',   '1987-12-22', 'Optometrist',     '0701000015', 'zia@hospital.com',        26000.00, '2019-07-10'),
(NULL,8, 'Lina',     'Ghazni',    'Female', '1995-08-18', 'Audiologist',     '0701000016', 'lina@hospital.com',       24000.00, '2022-03-01'),
(NULL,9, 'Bilal',    'Stanekzai', 'Male',   '1990-11-09', 'Surgical Nurse',  '0701000017', 'bilal@hospital.com',      27000.00, '2020-06-18'),
(NULL,2, 'Safiya',   'Najib',     'Female', '1992-05-25', 'Lab Technician',  '0701000018', 'safiya@hospital.com',     28000.00, '2021-02-14'),
(NULL,1, 'Hamza',    'Rahimi',    'Male',   '1986-07-04', 'Security Guard',  '0701000019', 'hamza@hospital.com',      18000.00, '2015-10-01'),
(NULL,10,'Farida',   'Waziri',    'Female', '1991-04-16', 'Medical Coder',   '0701000020', 'farida@hospital.com',     29000.00, '2018-12-05'),
(NULL,5, 'Jawid',    'Tokhi',     'Male',   '1993-09-29', 'Pharmacy Asst.',  '0701000021', 'jawid@hospital.com',      20000.00, '2023-04-10');


-- Patients (25)
INSERT INTO Patient(First_Name, Last_Name, Gender, Date_Of_Birth, Blood_Group,
                    Phone, Email, Address, Emergency_Name, Emergency_Phone) VALUES
('Ali',       'Rezaei',     'Male',   '1990-03-12', 'A+',      '0780000001', 'ali@mail.com',      '12 Kabul St',  'Fatima Rezaei',   '0780000002'),
('Mina',      'Ghani',      'Female', '1985-07-19', 'B+',      '0780000003', 'mina@mail.com',     '45 Herat Rd',  'Ahmad Ghani',     '0780000004'),
('Reza',      'Mohammadi',  'Male',   '2010-01-05', 'O+',      '0780000005', NULL,                '7 Jalalabad',  'Zara Mohammadi',  '0780000006'),
('Sana',      'Yari',       'Female', '1972-11-28', 'AB-',     '0780000007', 'sana@mail.com',     '9 Kandahar',   'Hassan Yari',     '0780000008'),
('Tariq',     'Osmani',     'Male',   '1988-05-14', 'B-',      '0780000009', NULL,                '3 Mazari Blvd','Layla Osmani',    '0780000010'),
('Najwa',     'Hashimi',    'Female', '1995-09-22', 'O-',      '0780000011', 'najwa@mail.com',    '22 Kunduz Ave','Bilal Hashimi',   '0780000012'),
('Dawit',     'Tesfaye',    'Male',   '1980-06-01', 'A-',      '0780000013', NULL,                '18 Takhar St', 'Meron Tesfaye',   '0780000014'),
('Noor',      'Sultani',    'Female', '2005-12-10', 'B+',      '0780000015', NULL,                '6 Bamyan',     'Ahmad Sultani',   '0780000016'),
('Hassan',    'Barakzai',   'Male',   '1965-04-30', 'AB+',     '0780000017', 'hassan@mail.com',   '30 Logar Rd',  'Fatima Barakzai', '0780000018'),
('Zara',      'Noorzad',    'Female', '1998-08-17', 'O+',      '0780000019', NULL,                '55 Panjshir',  'Omar Noorzad',    '0780000020'),
('Bilal',     'Safi',       'Male',   '1975-02-25', 'A+',      '0780000021', 'bilal@mail.com',    '4 Kapisa',     'Hanan Safi',      '0780000022'),
('Parisa',    'Mansoor',    'Female', '1992-10-08', 'B+',      '0780000023', NULL,                '67 Uruzgan',   'Kamil Mansoor',   '0780000024'),
('Walid',     'Khalil',     'Male',   '2001-03-20', 'O-',      '0780000025', NULL,                '12 Zabul',     'Nadia Khalil',    '0780000026'),
('Samira',    'Nazari',     'Female', '1969-07-04', 'A-',      '0780000027', 'samira@mail.com',   '8 Nimroz',     'Javed Nazari',    '0780000028'),
('Farhan',    'Atmar',      'Male',   '1983-11-15', 'AB+',     '0780000029', NULL,                '99 Farah',     'Sima Atmar',      '0780000030'),
('Lena',      'Rahimi',     'Female', '2015-06-29', 'B-',      '0780000031', NULL,                '15 Ghor',      'Wahid Rahimi',    '0780000032'),
('Omid',      'Waziri',     'Male',   '1978-09-09', 'O+',      '0780000033', NULL,                '23 Daykundi',  'Rosa Waziri',     '0780000034'),
('Roya',      'Kargar',     'Female', '1990-01-31', 'A+',      '0780000035', 'roya@mail.com',     '7 Wardak',     'Siam Kargar',     '0780000036'),
('Mustafa',   'Sarwari',    'Male',   '1955-05-05', 'AB-',     '0780000037', NULL,                '41 Laghman',   'Huma Sarwari',    '0780000038'),
('Yasmin',    'Ebrahimi',   'Female', '2000-12-20', 'B+',      '0780000039', NULL,                '88 Nangarhar', 'Zia Ebrahimi',    '0780000040'),
('Samir',     'Farid',      'Male',   '1987-04-11', 'O+',      '0780000041', NULL,                '14 Kunar',     'Rana Farid',      '0780000042'),
('Hana',      'Hussain',    'Female', '1973-08-23', 'A-',      '0780000043', 'hana@mail.com',     '29 Nuristan',  'Bashir Hussain',  '0780000044'),
('Aryan',     'Joya',       'Male',   '2008-02-14', 'B+',      '0780000045', NULL,                '5 Badakhshan', 'Noor Joya',       '0780000046'),
('Sofia',     'Hasanzada',  'Female', '1996-11-07', 'O+',      '0780000047', NULL,                '33 Baghlan',   'Reza Hasanzada',  '0780000048'),
('Faisal',    'Popal',      'Male',   '1962-03-18', 'AB+',     '0780000049', 'faisal@mail.com',   '77 Samangan',  'Gul Popal',       '0780000050');


-- Doctor Schedules � using CURDATE() + intervals so dates are always in the future
-- These 20 schedules are for the sample appointment data below
INSERT INTO Doctor_Schedule(Doctor_ID, Work_Date, Start_Time, End_Time, Status) VALUES
(1,  DATE_ADD(CURDATE(), INTERVAL 1  DAY),'08:00:00','14:00:00','Available'),
(1,  DATE_ADD(CURDATE(), INTERVAL 2  DAY),'08:00:00','14:00:00','Available'),
(2,  DATE_ADD(CURDATE(), INTERVAL 1  DAY),'09:00:00','15:00:00','Available'),
(2,  DATE_ADD(CURDATE(), INTERVAL 3  DAY),'09:00:00','15:00:00','Available'),
(3,  DATE_ADD(CURDATE(), INTERVAL 1  DAY),'10:00:00','16:00:00','Available'),
(3,  DATE_ADD(CURDATE(), INTERVAL 2  DAY),'10:00:00','16:00:00','Available'),
(4,  DATE_ADD(CURDATE(), INTERVAL 1  DAY),'08:00:00','12:00:00','Available'),
(4,  DATE_ADD(CURDATE(), INTERVAL 4  DAY),'08:00:00','12:00:00','Available'),
(5,  DATE_ADD(CURDATE(), INTERVAL 2  DAY),'11:00:00','17:00:00','Available'),
(5,  DATE_ADD(CURDATE(), INTERVAL 3  DAY),'11:00:00','17:00:00','Available'),
(6,  DATE_ADD(CURDATE(), INTERVAL 1  DAY),'08:00:00','14:00:00','Available'),
(6,  DATE_ADD(CURDATE(), INTERVAL 2  DAY),'08:00:00','14:00:00','Available'),
(7,  DATE_ADD(CURDATE(), INTERVAL 3  DAY),'09:00:00','13:00:00','Available'),
(7,  DATE_ADD(CURDATE(), INTERVAL 4  DAY),'09:00:00','13:00:00','Available'),
(8,  DATE_ADD(CURDATE(), INTERVAL 1  DAY),'10:00:00','14:00:00','Available'),
(8,  DATE_ADD(CURDATE(), INTERVAL 2  DAY),'10:00:00','14:00:00','Available'),
(9,  DATE_ADD(CURDATE(), INTERVAL 3  DAY),'08:00:00','16:00:00','Available'),
(9,  DATE_ADD(CURDATE(), INTERVAL 4  DAY),'08:00:00','16:00:00','Available'),
(10, DATE_ADD(CURDATE(), INTERVAL 1  DAY),'09:00:00','15:00:00','Available'),
(10, DATE_ADD(CURDATE(), INTERVAL 2  DAY),'09:00:00','15:00:00','Available');

-- Generate 30-minute slots for all 20 schedules
DELIMITER $$
CREATE PROCEDURE gen_all_slots()
BEGIN
  DECLARE done    INT  DEFAULT 0;
  DECLARE v_sched INT;
  DECLARE v_start TIME;
  DECLARE v_end   TIME;
  DECLARE v_cur   TIME;
  DECLARE c CURSOR FOR
    SELECT Schedule_ID, Start_Time, End_Time FROM Doctor_Schedule;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  OPEN c;
  slot_loop: LOOP
    FETCH c INTO v_sched, v_start, v_end;
    IF done THEN LEAVE slot_loop; END IF;
    SET v_cur = v_start;
    WHILE ADDTIME(v_cur,'00:30:00') <= v_end DO
      INSERT IGNORE INTO Appointment_Slot(Schedule_ID, Slot_Start, Slot_End, Status)
      VALUES(v_sched, v_cur, ADDTIME(v_cur,'00:30:00'), 'Open');
      SET v_cur = ADDTIME(v_cur,'00:30:00');
    END WHILE;
  END LOOP;
  CLOSE c;
END$$
DELIMITER ;

CALL gen_all_slots();
DROP PROCEDURE IF EXISTS gen_all_slots;

-- Book sample appointments using dynamic slot IDs (1st slot of each schedule for Completed,
-- 2nd slot of each schedule for Scheduled)
SET FOREIGN_KEY_CHECKS = 0;

-- Helper: get Nth slot of Mth schedule
-- Schedule order is 1..20 by Schedule_ID (insertion order above)
-- Slot position 1 = first 30-min block, 2 = second block, etc.

INSERT INTO Appointment(Patient_ID, Slot_ID, Reason, Appointment_Status)
SELECT vals.pid, sl.Slot_ID, vals.reason, vals.appt_status
FROM (
  -- Completed (slot_pos=1 of schedules 1-21, schedule 20 used twice)
  SELECT 1  pid,'Chest pain follow-up'         reason,'Completed' appt_status,1 sched_rank,1 slot_pos UNION ALL
  SELECT 2, 'Palpitations',                           'Completed',2,1 UNION ALL
  SELECT 3, 'Routine checkup',                        'Completed',3,1 UNION ALL
  SELECT 4, 'Headache and dizziness',                 'Completed',4,1 UNION ALL
  SELECT 5, 'Memory issues',                          'Completed',5,1 UNION ALL
  SELECT 6, 'Fever in child',                         'Completed',6,1 UNION ALL
  SELECT 7, 'Vaccination',                            'Completed',7,1 UNION ALL
  SELECT 8, 'Knee pain',                              'Completed',8,1 UNION ALL
  SELECT 9, 'Back pain',                              'Completed',9,1 UNION ALL
  SELECT 10,'Skin rash',                              'Completed',10,1 UNION ALL
  SELECT 11,'Acne treatment',                         'Completed',11,1 UNION ALL
  SELECT 12,'Prenatal checkup',                       'Completed',12,1 UNION ALL
  SELECT 13,'Contraception consultation',             'Completed',13,1 UNION ALL
  SELECT 14,'Blurry vision',                          'Completed',14,1 UNION ALL
  SELECT 15,'Ear infection',                          'Completed',15,1 UNION ALL
  SELECT 16,'Abdominal pain',                         'Completed',16,1 UNION ALL
  SELECT 17,'Pre-surgical assessment',                'Completed',17,1 UNION ALL
  SELECT 18,'Fatigue and weakness',                   'Completed',18,1 UNION ALL
  SELECT 19,'Diabetes management',                    'Completed',19,1 UNION ALL
  SELECT 20,'Hypertension follow-up',                 'Completed',20,1 UNION ALL
  SELECT 21,'Thyroid checkup',                        'Completed',20,2 UNION ALL
  -- Scheduled (slot_pos=2 or 3 of various schedules)
  SELECT 22,'Annual cardiac screening',               'Scheduled',1,2 UNION ALL
  SELECT 23,'Post-op checkup',                        'Scheduled',2,2 UNION ALL
  SELECT 24,'New patient consultation',               'Scheduled',3,2 UNION ALL
  SELECT 25,'Migraine treatment',                     'Scheduled',4,2 UNION ALL
  SELECT 1, 'MRI follow-up',                          'Scheduled',5,2 UNION ALL
  SELECT 2, 'Child growth assessment',                'Scheduled',6,2 UNION ALL
  SELECT 3, 'Sports injury',                          'Scheduled',7,2 UNION ALL
  SELECT 4, 'Physiotherapy advice',                   'Scheduled',8,2 UNION ALL
  SELECT 5, 'Eczema review',                          'Scheduled',9,2 UNION ALL
  SELECT 6, 'Psoriasis treatment',                    'Scheduled',10,2 UNION ALL
  SELECT 7, 'Fertility consultation',                 'Scheduled',11,2 UNION ALL
  SELECT 8, 'Eye pain',                               'Scheduled',12,2 UNION ALL
  SELECT 9, 'Cataract evaluation',                    'Scheduled',13,2 UNION ALL
  SELECT 10,'Hearing loss',                           'Scheduled',14,2 UNION ALL
  SELECT 11,'Tonsillitis',                            'Scheduled',15,2 UNION ALL
  SELECT 12,'Hernia evaluation',                      'Scheduled',16,2 UNION ALL
  SELECT 13,'Appendix follow-up',                     'Scheduled',17,2 UNION ALL
  SELECT 14,'Cholesterol check',                      'Scheduled',18,2 UNION ALL
  SELECT 15,'Diabetes check',                         'Scheduled',19,2 UNION ALL
  SELECT 16,'Cardiac stress test',                    'Scheduled',20,3 UNION ALL
  SELECT 17,'Neuropathy review',                      'Scheduled',1,4 UNION ALL
  SELECT 18,'Child immunization',                     'Scheduled',3,4 UNION ALL
  SELECT 19,'Knee replacement consult',               'Scheduled',5,4 UNION ALL
  SELECT 20,'Acne treatment plan',                    'Scheduled',7,4 UNION ALL
  SELECT 21,'Gynecology annual exam',                 'Scheduled',9,4 UNION ALL
  SELECT 22,'Glaucoma check',                         'Scheduled',11,4 UNION ALL
  SELECT 23,'Surgical wound review',                  'Scheduled',13,4 UNION ALL
  SELECT 24,'Anemia management',                      'Scheduled',15,4 UNION ALL
  SELECT 25,'Hypertension checkup',                   'Scheduled',17,4
) vals
JOIN (
  SELECT sl.Slot_ID,
         DENSE_RANK()  OVER (ORDER BY sl.Schedule_ID)                          AS sched_rank,
         ROW_NUMBER()  OVER (PARTITION BY sl.Schedule_ID ORDER BY sl.Slot_Start) AS slot_pos
  FROM   Appointment_Slot sl
) sl ON sl.sched_rank = vals.sched_rank AND sl.slot_pos = vals.slot_pos;

SET FOREIGN_KEY_CHECKS = 1;

-- Sync slot statuses after bulk insert
UPDATE Appointment_Slot sl
JOIN Appointment a ON a.Slot_ID = sl.Slot_ID
SET sl.Status = CASE
  WHEN a.Appointment_Status = 'Completed'              THEN 'Completed'
  WHEN a.Appointment_Status = 'Scheduled'              THEN 'Booked'
  WHEN a.Appointment_Status IN ('Cancelled','No_Show') THEN 'Open'
  ELSE 'Booked'
END;


-- Medical Records � reference appointments dynamically by patient+reason
INSERT INTO Medical_Record(Appointment_ID, Diagnosis, Treatment, Visit_Notes, Follow_Up_Date)
SELECT a.Appointment_ID, mr.diag, mr.treat, mr.notes, mr.followup
FROM (
  SELECT 1  pid,'Chest pain follow-up'         reason,'Stable angina'               diag,'Nitrates prescribed'             treat,'Patient reports improvement'        notes,DATE_ADD(CURDATE(),INTERVAL 34 DAY) followup UNION ALL
  SELECT 2, 'Palpitations',                           'Atrial fibrillation',              'Beta-blockers initiated',             'ECG performed, results normal',         DATE_ADD(CURDATE(),INTERVAL 35 DAY) UNION ALL
  SELECT 3, 'Routine checkup',                        'Upper respiratory infection',       'Antibiotics and rest',                'Child showed mild fever',               NULL UNION ALL
  SELECT 4, 'Headache and dizziness',                 'Tension headache',                  'NSAIDs and lifestyle change',         'MRI recommended',                       DATE_ADD(CURDATE(),INTERVAL 36 DAY) UNION ALL
  SELECT 5, 'Memory issues',                          'Mild cognitive impairment',         'Cognitive therapy referral',          'Memory tests administered',             DATE_ADD(CURDATE(),INTERVAL 66 DAY) UNION ALL
  SELECT 6, 'Fever in child',                         'Viral fever',                       'Antipyretics and fluids',             'Temperature 38.5C on arrival',          NULL UNION ALL
  SELECT 7, 'Vaccination',                            'Completed vaccination schedule',    'MMR, Hepatitis B given',              'No adverse reactions observed',         DATE_ADD(CURDATE(),INTERVAL 100 DAY) UNION ALL
  SELECT 8, 'Knee pain',                              'Osteoarthritis right knee',         'Physiotherapy ordered',               'X-ray shows moderate degeneration',    DATE_ADD(CURDATE(),INTERVAL 38 DAY) UNION ALL
  SELECT 9, 'Back pain',                              'Lumbar disc herniation',            'Pain management, MRI ordered',        'Severe L4-L5 involvement',             DATE_ADD(CURDATE(),INTERVAL 39 DAY) UNION ALL
  SELECT 10,'Skin rash',                              'Contact dermatitis',                'Topical steroids prescribed',         'Allergen identified as nickel',         DATE_ADD(CURDATE(),INTERVAL 40 DAY) UNION ALL
  SELECT 11,'Acne treatment',                         'Moderate acne vulgaris',            'Topical retinoid and antibiotic',     'Sebaceous gland hyperactivity',         DATE_ADD(CURDATE(),INTERVAL 70 DAY) UNION ALL
  SELECT 12,'Prenatal checkup',                       '28-week prenatal visit',            'Iron and folate supplements',         'Fetal heartbeat normal 142bpm',         DATE_ADD(CURDATE(),INTERVAL 41 DAY) UNION ALL
  SELECT 13,'Contraception consultation',             'OCP initiation',                    'Oral contraceptive pill started',     'Blood pressure within normal range',    DATE_ADD(CURDATE(),INTERVAL 42 DAY) UNION ALL
  SELECT 14,'Blurry vision',                          'Myopia -2.5 diopters',              'Corrective lenses prescribed',        'Refraction test performed',             DATE_ADD(CURDATE(),INTERVAL 196 DAY) UNION ALL
  SELECT 15,'Ear infection',                          'Otitis media',                      'Amoxicillin 500mg course',            'Tympanic membrane inflamed',            DATE_ADD(CURDATE(),INTERVAL 24 DAY) UNION ALL
  SELECT 16,'Abdominal pain',                         'Appendicitis suspected',            'CT scan ordered, nil by mouth',       'WBC elevated at 14000',                 DATE_ADD(CURDATE(),INTERVAL 5 DAY) UNION ALL
  SELECT 17,'Pre-surgical assessment',                'Inguinal hernia',                   'Surgical repair scheduled',           'Reducible hernia identified',           DATE_ADD(CURDATE(),INTERVAL 17 DAY) UNION ALL
  SELECT 18,'Fatigue and weakness',                   'Iron-deficiency anemia',            'Ferrous sulfate 200mg TDS',           'Hb 8.5 g/dL',                          DATE_ADD(CURDATE(),INTERVAL 48 DAY) UNION ALL
  SELECT 19,'Diabetes management',                    'Type 2 diabetes mellitus',          'Metformin 500mg BD, diet plan',       'HbA1c 8.2%',                           DATE_ADD(CURDATE(),INTERVAL 49 DAY) UNION ALL
  SELECT 20,'Hypertension follow-up',                 'Essential hypertension',            'Amlodipine 5mg OD',                   'BP 158/96 on arrival',                  DATE_ADD(CURDATE(),INTERVAL 50 DAY) UNION ALL
  SELECT 21,'Thyroid checkup',                        'Hypothyroidism',                    'Levothyroxine 50mcg OD',              'TSH 7.8 mIU/L',                        DATE_ADD(CURDATE(),INTERVAL 51 DAY)
) mr
JOIN Appointment a ON a.Patient_ID=mr.pid AND a.Reason=mr.reason AND a.Appointment_Status='Completed';


-- Medicine Categories
INSERT INTO Medicine_Category(Category_Name, Description) VALUES
('Antibiotics',         'Drugs that kill or inhibit bacteria'),
('Analgesics',          'Pain-relieving medications'),
('Cardiovascular',      'Heart and blood pressure medications'),
('Antidiabetics',       'Medications for diabetes management'),
('Thyroid',             'Thyroid hormone modulators'),
('Antihistamines',      'Allergy and hypersensitivity medications'),
('Vitamins & Minerals', 'Nutritional supplements'),
('Dermatologicals',     'Skin treatment medications'),
('Respiratory',         'Asthma and COPD medications'),
('Gastrointestinal',    'Digestive system medications');

-- Medicines (20)
INSERT INTO Medicine(Category_ID, Medicine_Name, Generic_Name, Manufacturer, Dosage_Form, Strength, Unit_Price, Requires_Rx) VALUES
(1, 'Amoxil',        'Amoxicillin',        'GSK',        'Capsule',    '500mg',    15.00,  1),
(1, 'Augmentin',     'Amoxicillin+Clav.',  'GSK',        'Tablet',     '875/125mg',22.00,  1),
(2, 'Brufen',        'Ibuprofen',          'Abbott',     'Tablet',     '400mg',     5.00,  0),
(2, 'Panadol',       'Paracetamol',        'GSK',        'Tablet',     '500mg',     3.00,  0),
(3, 'Norvasc',       'Amlodipine',         'Pfizer',     'Tablet',     '5mg',      18.00,  1),
(3, 'Concor',        'Bisoprolol',         'Merck',      'Tablet',     '5mg',      20.00,  1),
(4, 'Glucophage',    'Metformin',          'Merck',      'Tablet',     '500mg',    10.00,  1),
(4, 'Diamicron',     'Gliclazide',         'Servier',    'Tablet',     '80mg',     14.00,  1),
(5, 'Eltroxin',      'Levothyroxine',      'Aspen',      'Tablet',     '50mcg',    12.00,  1),
(6, 'Clarityne',     'Loratadine',         'Bayer',      'Tablet',     '10mg',      7.00,  0),
(7, 'Ferrograd',     'Ferrous Sulfate',    'Abbott',     'Tablet',     '325mg',     6.00,  0),
(7, 'Folic Plus',    'Folic Acid',         'Actavis',    'Tablet',     '5mg',       4.00,  0),
(8, 'Betnovate',     'Betamethasone',      'GSK',        'Cream',      '0.1%',     25.00,  1),
(8, 'Retin-A',       'Tretinoin',          'Janssen',    'Cream',      '0.025%',   35.00,  1),
(9, 'Ventolin',      'Salbutamol',         'GSK',        'Inhaler',    '100mcg',   45.00,  1),
(9, 'Pulmicort',     'Budesonide',         'AstraZeneca','Inhaler',    '200mcg',   60.00,  1),
(10,'Omeprazole',    'Omeprazole',         'Actavis',    'Capsule',    '20mg',      8.00,  0),
(10,'Buscopan',      'Hyoscine Butylbrom.','Sanofi',     'Tablet',     '10mg',      9.00,  0),
(3, 'Isordil',       'Isosorbide Dinitrate','Pfizer',    'Tablet',     '10mg',     16.00,  1),
(2, 'Tramadol',      'Tramadol HCl',       'Mundipharma','Tablet',     '50mg',     20.00,  1);


-- Pharmacy
INSERT INTO Pharmacy(Pharmacy_Name, Location, Phone) VALUES
('Main Pharmacy',   'Ground Floor, Block A', '0200000020'),
('OP Pharmacy',     'Block B, Floor 1',      '0200000021');

-- Inventory (20 records)
INSERT INTO Inventory(Pharmacy_ID, Medicine_ID, Quantity_In_Stock, Reorder_Level, Batch_Number, Expiry_Date, Unit_Cost) VALUES
(1,  1,  200, 30, 'BATCH-A001', '2027-06-30',  12.00),
(1,  2,  150, 25, 'BATCH-A002', '2027-08-31',  18.00),
(1,  3,  500, 50, 'BATCH-A003', '2028-01-31',   3.50),
(1,  4,  600, 60, 'BATCH-A004', '2028-03-31',   2.50),
(1,  5,  120, 20, 'BATCH-A005', '2027-05-31',  15.00),
(1,  6,  100, 20, 'BATCH-A006', '2027-07-31',  16.00),
(1,  7,  300, 40, 'BATCH-A007', '2027-12-31',   8.00),
(1,  8,  180, 25, 'BATCH-A008', '2027-11-30',  11.00),
(1,  9,  250, 30, 'BATCH-A009', '2027-09-30',  10.00),
(1, 10,  400, 50, 'BATCH-A010', '2028-02-28',   5.50),
(2, 11,  350, 40, 'BATCH-B001', '2028-04-30',   4.50),
(2, 12,  280, 30, 'BATCH-B002', '2027-10-31',   3.00),
(2, 13,   80, 15, 'BATCH-B003', '2027-07-31',  20.00),
(2, 14,   50, 10, 'BATCH-B004', '2027-06-30',  28.00),
(2, 15,   60, 10, 'BATCH-B005', '2027-05-31',  38.00),
(2, 16,   45,  8, 'BATCH-B006', '2027-08-31',  50.00),
(2, 17,  200, 30, 'BATCH-B007', '2028-01-31',   6.00),
(2, 18,  160, 25, 'BATCH-B008', '2027-12-31',   7.00),
(2, 19,  100, 15, 'BATCH-B009', '2027-09-30',  13.00),
(2, 20,   70, 10, 'BATCH-B010', '2027-04-30',  16.00);


-- Prescriptions � linked to Medical Records by appointment patient+reason
INSERT INTO Prescription(Record_ID, Prescription_Date, Notes)
SELECT mr.Record_ID, CURDATE(), pdata.notes
FROM (
  SELECT 1 pid,'Chest pain follow-up' reason,'Take with food' notes UNION ALL
  SELECT 2,'Palpitations','Avoid alcohol' UNION ALL
  SELECT 3,'Routine checkup','Rest and fluids' UNION ALL
  SELECT 4,'Headache and dizziness','Take with water' UNION ALL
  SELECT 6,'Fever in child','Fever management' UNION ALL
  SELECT 8,'Knee pain','Post-physio medication' UNION ALL
  SELECT 9,'Back pain','Strict bed rest required' UNION ALL
  SELECT 10,'Skin rash','Avoid known allergens' UNION ALL
  SELECT 11,'Acne treatment','Apply thinly at night' UNION ALL
  SELECT 12,'Prenatal checkup','Take daily as directed' UNION ALL
  SELECT 13,'Contraception consultation','One tablet daily' UNION ALL
  SELECT 15,'Ear infection','Complete full antibiotic course' UNION ALL
  SELECT 16,'Abdominal pain','NIL BY MOUTH post-midnight' UNION ALL
  SELECT 18,'Fatigue and weakness','Take iron with orange juice' UNION ALL
  SELECT 19,'Diabetes management','Monitor blood glucose daily' UNION ALL
  SELECT 20,'Hypertension follow-up','Low sodium diet' UNION ALL
  SELECT 21,'Thyroid checkup','Take on empty stomach' UNION ALL
  SELECT 5,'Memory issues','Cognitive exercises daily' UNION ALL
  SELECT 7,'Vaccination','Monitor for vaccine reactions' UNION ALL
  SELECT 17,'Pre-surgical assessment','Pre-operative preparation'
) pdata
JOIN Appointment a  ON a.Patient_ID=pdata.pid AND a.Reason=pdata.reason AND a.Appointment_Status='Completed'
JOIN Medical_Record mr ON mr.Appointment_ID=a.Appointment_ID;

-- Prescription Items (20) � linked dynamically via prescription order
INSERT INTO Prescription_Item(Prescription_ID,Medicine_ID,Dosage,Frequency,Duration_Days,Instructions)
SELECT pr.Prescription_ID, pi.med_id, pi.dosage, pi.freq, pi.dur, pi.instr
FROM (
  SELECT 1 pnum,19 med_id,'10mg' dosage,'Twice daily' freq,30 dur,'Sublingual for chest pain' instr UNION ALL
  SELECT 2,6,'5mg','Once daily',90,'Monitor heart rate' UNION ALL
  SELECT 3,4,'500mg','Three times daily',5,'After meals' UNION ALL
  SELECT 4,3,'400mg','Twice daily',5,'With food' UNION ALL
  SELECT 5,4,'500mg','Every 6 hours',3,'For fever above 38.5' UNION ALL
  SELECT 6,3,'400mg','Three times daily',7,'After physiotherapy' UNION ALL
  SELECT 7,20,'50mg','Twice daily',7,'With food, avoid driving' UNION ALL
  SELECT 8,13,'0.1%','Twice daily',14,'Apply thin layer on affected area' UNION ALL
  SELECT 9,14,'0.025%','Once at night',42,'Avoid sun exposure' UNION ALL
  SELECT 10,12,'5mg','Once daily',30,'Folic acid supplement' UNION ALL
  SELECT 11,5,'5mg','Once daily',30,'Monitor blood pressure' UNION ALL
  SELECT 12,1,'500mg','Three times daily',7,'Complete the full course' UNION ALL
  SELECT 13,17,'20mg','Once daily',14,'Before breakfast' UNION ALL
  SELECT 14,11,'325mg','Twice daily',60,'With Vitamin C' UNION ALL
  SELECT 15,7,'500mg','Twice daily',90,'Monitor glucose levels' UNION ALL
  SELECT 16,5,'5mg','Once daily',60,'Salt restriction diet' UNION ALL
  SELECT 17,9,'50mcg','Once daily',90,'Morning empty stomach' UNION ALL
  SELECT 18,10,'10mg','Once at night',30,'Antihistamine for allergy' UNION ALL
  SELECT 19,4,'500mg','As needed',14,'For pain relief' UNION ALL
  SELECT 20,17,'20mg','Once daily',30,'Omeprazole for GI protection'
) pi
JOIN (SELECT Prescription_ID, ROW_NUMBER() OVER (ORDER BY Prescription_ID) AS pnum FROM Prescription) pr
  ON pr.pnum = pi.pnum;


-- Lab Tests
INSERT INTO Lab_Test(Test_Name, Test_Code, Category, Normal_Range, Unit, Price, Turnaround_Hrs) VALUES
('Complete Blood Count',         'CBC',      'Hematology',   'RBC 4.5-5.5 T/L', 'T/L',    500.00, 4),
('Blood Glucose Fasting',        'BGL-F',    'Biochemistry', '70-100',           'mg/dL',  200.00, 2),
('HbA1c',                        'HBA1C',    'Biochemistry', '< 5.7%',           '%',      600.00, 24),
('Thyroid Stimulating Hormone',  'TSH',      'Endocrinology','0.4-4.0',          'mIU/L',  700.00, 24),
('Lipid Profile',                'LIPID',    'Biochemistry', 'Total <200mg/dL',  'mg/dL',  800.00, 12),
('Liver Function Test',          'LFT',      'Biochemistry', 'ALT 7-56 U/L',     'U/L',    900.00, 12),
('Kidney Function Test',         'KFT',      'Biochemistry', 'Creat 0.6-1.2',    'mg/dL',  850.00, 12),
('Urinalysis',                   'UA',       'Urinalysis',   'Clear, pH 4.5-8',  '',       150.00, 2),
('ECG',                          'ECG',      'Cardiology',   'Normal sinus',     '',       400.00, 1),
('Chest X-Ray',                  'CXR',      'Radiology',    'Clear lungs',      '',       600.00, 2);

-- Lab Orders (20) � completed ones reference completed appointments, pending ones reference scheduled
INSERT INTO Lab_Order(Appointment_ID, Doctor_ID, Priority, Status, Notes)
SELECT a.Appointment_ID, lo.doc_id, lo.priority, lo.status, lo.notes
FROM (
  SELECT 1 pid,'Chest pain follow-up'    reason, 1 doc_id,'Routine'  priority,'Completed'   status,'Pre-cardiac evaluation'     notes UNION ALL
  SELECT 2,'Palpitations',                         1,'Urgent',  'Completed','Arrhythmia workup'           UNION ALL
  SELECT 4,'Headache and dizziness',               2,'Routine', 'Completed','Headache investigation'       UNION ALL
  SELECT 5,'Memory issues',                        2,'Routine', 'Completed','Cognitive workup'             UNION ALL
  SELECT 8,'Knee pain',                            4,'Routine', 'Completed','Bone density baseline'        UNION ALL
  SELECT 9,'Back pain',                            4,'Urgent',  'Completed','Spine imaging'                UNION ALL
  SELECT 10,'Skin rash',                           5,'Routine', 'Completed','Allergy panel'                UNION ALL
  SELECT 12,'Prenatal checkup',                    6,'Routine', 'Completed','Prenatal labs'                UNION ALL
  SELECT 15,'Ear infection',                       8,'Routine', 'Completed','Ear infection labs'           UNION ALL
  SELECT 16,'Abdominal pain',                      9,'STAT',    'Completed','Acute abdomen labs'           UNION ALL
  SELECT 18,'Fatigue and weakness',               10,'Routine', 'Completed','Anemia panel'                 UNION ALL
  SELECT 19,'Diabetes management',                10,'Routine', 'Completed','Diabetes panel'               UNION ALL
  SELECT 20,'Hypertension follow-up',             10,'Routine', 'Completed','Hypertension labs'            UNION ALL
  SELECT 21,'Thyroid checkup',                    10,'Routine', 'Completed','Thyroid panel'                UNION ALL
  SELECT 22,'Annual cardiac screening',            1,'Routine', 'Pending',  'Annual cardiac screening'     UNION ALL
  SELECT 23,'Post-op checkup',                     1,'Routine', 'Pending',  'Post-op follow up labs'       UNION ALL
  SELECT 25,'Migraine treatment',                  2,'Urgent',  'In_Progress','Migraine neuro panel'       UNION ALL
  SELECT 6, 'Psoriasis treatment',                 5,'Routine', 'Pending',  'Psoriasis baseline'           UNION ALL
  SELECT 16,'Cardiac stress test',                 1,'Routine', 'Pending',  'Cardiac risk screening'       UNION ALL
  SELECT 25,'Hypertension checkup',               10,'Routine', 'Pending',  'BP medication labs'
) lo
JOIN Appointment a ON a.Patient_ID=lo.pid AND a.Reason=lo.reason;


-- Lab Results (20) � reference lab orders by position
INSERT INTO Lab_Result(Order_ID, Test_ID, Result, Is_Abnormal, Remarks, Performed_By)
SELECT lo.Order_ID, lr.test_id, lr.result, lr.abnormal, lr.remarks, lr.performed_by
FROM (
  SELECT 1 onum,9 test_id,'Normal sinus rhythm, HR 72'         result,0 abnormal,'No significant findings'       remarks,2 performed_by UNION ALL
  SELECT 2,1,'WBC 14.2, RBC 4.1, PLT 210',                    1,'Elevated WBC - investigate',    2 UNION ALL
  SELECT 3,1,'WBC 8.5, RBC 4.8, PLT 280',                     0,'Within normal limits',          12 UNION ALL
  SELECT 4,3,'HbA1c 7.9%',                                    1,'Above target, adjust therapy',  12 UNION ALL
  SELECT 5,1,'CBC Normal',                                     0,'No anemia',                     2 UNION ALL
  SELECT 6,7,'Creatinine 0.9, BUN 18',                        0,'Kidney function normal',         12 UNION ALL
  SELECT 7,1,'Eosinophils elevated at 8%',                    1,'Allergic response indicated',    2 UNION ALL
  SELECT 8,1,'Hb 11.2, normal differential',                  1,'Mild anemia of pregnancy',       2 UNION ALL
  SELECT 9,8,'Cloudy urine, WBC 15/HPF',                      1,'Possible UTI',                  12 UNION ALL
  SELECT 10,1,'WBC 16.5, Neutrophils 85%',                    1,'Infection/Appendicitis likely',  2 UNION ALL
  SELECT 11,1,'Hb 8.5, MCV 72, MCH 24',                      1,'Iron deficiency anemia',         12 UNION ALL
  SELECT 12,2,'FBG 148 mg/dL',                                1,'Impaired fasting glucose',       2 UNION ALL
  SELECT 13,3,'HbA1c 8.2%',                                   1,'Poor glycemic control',          12 UNION ALL
  SELECT 14,4,'TSH 7.8 mIU/L',                               1,'Hypothyroidism confirmed',       2 UNION ALL
  SELECT 15,5,'Total Chol 195, LDL 125, HDL 48',             0,'Within acceptable range',        12 UNION ALL
  SELECT 16,6,'ALT 35, AST 28, Bilirubin 0.8',               0,'Liver function normal',          2 UNION ALL
  SELECT 17,7,'Creatinine 1.0, eGFR 85',                     0,'Kidney function preserved',      12 UNION ALL
  SELECT 18,4,'TSH 2.5 mIU/L',                               0,'Euthyroid',                      2 UNION ALL
  SELECT 19,9,'Left ventricular hypertrophy noted',           1,'Consistent with hypertension',   2 UNION ALL
  SELECT 20,2,'FBG 182 mg/dL',                               1,'Hyperglycemia, review meds',     12
) lr
JOIN (SELECT Order_ID, ROW_NUMBER() OVER (ORDER BY Order_ID) AS onum FROM Lab_Order) lo
  ON lo.onum = lr.onum;


-- Bills (20) � linked to completed appointments dynamically
INSERT INTO Bill(Appointment_ID, Bill_Date, Consultation_Fee, Medicine_Fee, Lab_Fee,
                 Other_Fee, Discount, Tax, Total_Amount, Amount_Paid, Balance_Due, Bill_Status)
SELECT a.Appointment_ID, CURDATE(),
       bdata.cf, bdata.mf, bdata.lf, bdata.othf, bdata.disc, bdata.tax, bdata.total, bdata.paid, bdata.balance, bdata.bstatus
FROM (
  SELECT 1 pid,'Chest pain follow-up'       reason,1500.00 cf,320.00 mf,400.00 lf,50.00 othf,0.00 disc,113.50 tax,2383.50 total,2383.50 paid,0.00 balance,'Paid' bstatus UNION ALL
  SELECT 2,'Palpitations',                         1500.00,220.00,500.00,50.00,0.00,113.50,2383.50,1500.00,883.50,'Partial' UNION ALL
  SELECT 3,'Routine checkup',                      1000.00,150.00,200.00,30.00,0.00,69.00,1449.00,1449.00,0.00,'Paid' UNION ALL
  SELECT 4,'Headache and dizziness',               1400.00,100.00,500.00,50.00,0.00,102.50,2152.50,2152.50,0.00,'Paid' UNION ALL
  SELECT 5,'Memory issues',                        1400.00,140.00,700.00,50.00,50.00,112.00,2352.00,0.00,2352.00,'Pending' UNION ALL
  SELECT 6,'Fever in child',                       1000.00,120.00,150.00,30.00,0.00,65.00,1365.00,1365.00,0.00,'Paid' UNION ALL
  SELECT 7,'Vaccination',                          1000.00,0.00,200.00,30.00,0.00,57.50,1287.50,1287.50,0.00,'Paid' UNION ALL
  SELECT 8,'Knee pain',                            1300.00,150.00,850.00,50.00,0.00,117.50,2467.50,0.00,2467.50,'Pending' UNION ALL
  SELECT 9,'Back pain',                            1300.00,400.00,850.00,50.00,0.00,130.00,2730.00,1000.00,1730.00,'Partial' UNION ALL
  SELECT 10,'Skin rash',                           900.00,500.00,150.00,50.00,0.00,80.00,1680.00,1680.00,0.00,'Paid' UNION ALL
  SELECT 11,'Acne treatment',                      900.00,700.00,100.00,50.00,0.00,87.50,1837.50,1837.50,0.00,'Paid' UNION ALL
  SELECT 12,'Prenatal checkup',                    1200.00,160.00,500.00,50.00,0.00,96.50,2006.50,0.00,2006.50,'Pending' UNION ALL
  SELECT 13,'Contraception consultation',          1200.00,60.00,200.00,30.00,0.00,74.50,1564.50,1564.50,0.00,'Paid' UNION ALL
  SELECT 14,'Blurry vision',                       1100.00,300.00,600.00,50.00,0.00,102.50,2152.50,2152.50,0.00,'Paid' UNION ALL
  SELECT 15,'Ear infection',                       850.00,300.00,150.00,30.00,0.00,66.50,1396.50,0.00,1396.50,'Pending' UNION ALL
  SELECT 16,'Abdominal pain',                      1600.00,170.00,900.00,100.00,0.00,138.50,2908.50,2908.50,0.00,'Paid' UNION ALL
  SELECT 17,'Pre-surgical assessment',             1600.00,170.00,850.00,100.00,0.00,136.00,2856.00,2856.00,0.00,'Paid' UNION ALL
  SELECT 18,'Fatigue and weakness',                1050.00,180.00,850.00,50.00,0.00,107.50,2237.50,2237.50,0.00,'Paid' UNION ALL
  SELECT 19,'Diabetes management',                 1050.00,200.00,800.00,50.00,0.00,105.00,2205.00,2205.00,0.00,'Paid' UNION ALL
  SELECT 20,'Hypertension follow-up',              1050.00,180.00,500.00,50.00,0.00,89.00,1869.00,1869.00,0.00,'Paid'
) bdata
JOIN Appointment a ON a.Patient_ID=bdata.pid AND a.Reason=bdata.reason AND a.Appointment_Status='Completed';

-- Payments (20) � linked to bills dynamically
INSERT INTO Payment(Bill_ID, Payment_Date, Amount, Payment_Method, Reference_No, Received_By)
SELECT b.Bill_ID, CURDATE(), pdata.amount, pdata.method, pdata.ref, 4
FROM (
  SELECT 1 bnum,2383.50 amount,'Cash'          method,'RCP-0001' ref UNION ALL
  SELECT 2,1500.00,'Card',          'RCP-0002' UNION ALL
  SELECT 3,1449.00,'Cash',          'RCP-0003' UNION ALL
  SELECT 4,2152.50,'Insurance',     'INS-0001' UNION ALL
  SELECT 6,1365.00,'Cash',          'RCP-0006' UNION ALL
  SELECT 7,1287.50,'Mobile_Money',  'MOB-0001' UNION ALL
  SELECT 10,1680.00,'Card',         'RCP-0010' UNION ALL
  SELECT 11,1837.50,'Cash',         'RCP-0011' UNION ALL
  SELECT 13,1564.50,'Insurance',    'INS-0002' UNION ALL
  SELECT 14,2152.50,'Cash',         'RCP-0014' UNION ALL
  SELECT 16,2908.50,'Cash',         'RCP-0016' UNION ALL
  SELECT 17,2856.00,'Bank_Transfer','TRF-0001' UNION ALL
  SELECT 18,2237.50,'Cash',         'RCP-0018' UNION ALL
  SELECT 19,2205.00,'Insurance',    'INS-0003' UNION ALL
  SELECT 20,1869.00,'Card',         'RCP-0020' UNION ALL
  SELECT 9,1000.00,'Cash',          'RCP-0009' UNION ALL
  SELECT 2,500.00,'Cash',           'RCP-0002B' UNION ALL
  SELECT 5,1000.00,'Card',          'RCP-0005' UNION ALL
  SELECT 8,1000.00,'Cash',          'RCP-0008' UNION ALL
  SELECT 15,700.00,'Mobile_Money',  'MOB-0002'
) pdata
JOIN (SELECT Bill_ID, ROW_NUMBER() OVER (ORDER BY Bill_ID) AS bnum FROM Bill) b
  ON b.bnum = pdata.bnum;

SET FOREIGN_KEY_CHECKS = 1;

-- Sync Appointment_Slot status to reflect actual bookings (sample data bypass fix)
-- Runs twice to handle any edge-case ordering in multi-statement imports
UPDATE Appointment_Slot sl
JOIN Appointment a ON a.Slot_ID = sl.Slot_ID
SET sl.Status = CASE
    WHEN a.Appointment_Status = 'Completed'              THEN 'Completed'
    WHEN a.Appointment_Status = 'Scheduled'              THEN 'Booked'
    WHEN a.Appointment_Status IN ('Cancelled','No_Show') THEN 'Open'
    ELSE 'Booked'
END;

-- Second pass: catch any stragglers (idempotent)
UPDATE Appointment_Slot sl
JOIN Appointment a ON a.Slot_ID = sl.Slot_ID
SET sl.Status = CASE
    WHEN a.Appointment_Status = 'Completed'              THEN 'Completed'
    WHEN a.Appointment_Status = 'Scheduled'              THEN 'Booked'
    WHEN a.Appointment_Status IN ('Cancelled','No_Show') THEN 'Open'
    ELSE 'Booked'
END;


-- ============================================================
-- SECTION 15: TRIGGERS
-- ============================================================
DELIMITER $$

-- Trigger: Prevent double booking (before insert on Appointment)
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

-- Trigger: Auto-mark slot as Booked after appointment inserted
CREATE TRIGGER trg_slot_booked_after_appointment
AFTER INSERT ON Appointment
FOR EACH ROW
BEGIN
    UPDATE Appointment_Slot SET Status = 'Booked' WHERE Slot_ID = NEW.Slot_ID;
END$$

-- Trigger: Prevent expired medicine from being prescribed
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



-- Trigger: Recalculate Bill totals after each payment (sum-based, accurate)
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

-- Trigger: Auto-create Medical_Record when appointment is completed via direct UPDATE
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

-- Trigger: Audit log for Doctor updates
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

-- Trigger: Audit log for Bill updates
CREATE TRIGGER trg_audit_bill_update
AFTER UPDATE ON Bill
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log(Table_Name, Record_ID, Action, Old_Values, New_Values)
    VALUES('Bill', OLD.Bill_ID, 'UPDATE',
           JSON_OBJECT('Bill_Status', OLD.Bill_Status, 'Amount_Paid', OLD.Amount_Paid, 'Balance_Due', OLD.Balance_Due),
           JSON_OBJECT('Bill_Status', NEW.Bill_Status, 'Amount_Paid', NEW.Amount_Paid, 'Balance_Due', NEW.Balance_Due));
END$$

-- Trigger: Validate Patient DOB
CREATE TRIGGER trg_validate_patient_dob_insert
BEFORE INSERT ON Patient
FOR EACH ROW
BEGIN
    IF NEW.Date_Of_Birth > CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of Birth cannot be in the future.';
    END IF;
END$$

CREATE TRIGGER trg_validate_patient_dob_update
BEFORE UPDATE ON Patient
FOR EACH ROW
BEGIN
    IF NEW.Date_Of_Birth > CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of Birth cannot be in the future.';
    END IF;
END$$

-- Trigger: Validate Doctor DOB
CREATE TRIGGER trg_validate_doctor_dob_insert
BEFORE INSERT ON Doctor
FOR EACH ROW
BEGIN
    IF NEW.Date_Of_Birth > CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of Birth cannot be in the future.';
    END IF;
END$$

CREATE TRIGGER trg_validate_doctor_dob_update
BEFORE UPDATE ON Doctor
FOR EACH ROW
BEGIN
    IF NEW.Date_Of_Birth > CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of Birth cannot be in the future.';
    END IF;
END$$

-- Trigger: Validate Employee Age 18+
CREATE TRIGGER trg_validate_employee_age_insert
BEFORE INSERT ON Employee
FOR EACH ROW
BEGIN
    IF TIMESTAMPDIFF(YEAR, NEW.Date_Of_Birth, NEW.Hire_Date) < 18 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee must be at least 18 years old at the time of hiring.';
    END IF;
END$$

CREATE TRIGGER trg_validate_employee_age_update
BEFORE UPDATE ON Employee
FOR EACH ROW
BEGIN
    IF TIMESTAMPDIFF(YEAR, NEW.Date_Of_Birth, NEW.Hire_Date) < 18 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee must be at least 18 years old at the time of hiring.';
    END IF;
END$$

-- Trigger: Validate Doctor_Schedule Work_Date
CREATE TRIGGER trg_validate_schedule_date_insert
BEFORE INSERT ON Doctor_Schedule
FOR EACH ROW
BEGIN
    IF NEW.Work_Date < CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot create a schedule in the past.';
    END IF;
END$$

CREATE TRIGGER trg_validate_schedule_date_update
BEFORE UPDATE ON Doctor_Schedule
FOR EACH ROW
BEGIN
    IF NEW.Work_Date < CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update a schedule to the past.';
    END IF;
END$$

-- Trigger: Prevent Duplicate Appointments
CREATE TRIGGER trg_prevent_duplicate_appt_insert
BEFORE INSERT ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM Appointment a
    JOIN Appointment_Slot sl ON a.Slot_ID = sl.Slot_ID
    JOIN Doctor_Schedule ds ON sl.Schedule_ID = ds.Schedule_ID
    WHERE a.Patient_ID = NEW.Patient_ID
      AND a.Appointment_Status != 'Cancelled'
      AND ds.Work_Date = (
          SELECT ds2.Work_Date
          FROM Appointment_Slot sl2
          JOIN Doctor_Schedule ds2 ON sl2.Schedule_ID = ds2.Schedule_ID
          WHERE sl2.Slot_ID = NEW.Slot_ID
      )
      AND ds.Doctor_ID = (
          SELECT ds2.Doctor_ID
          FROM Appointment_Slot sl2
          JOIN Doctor_Schedule ds2 ON sl2.Schedule_ID = ds2.Schedule_ID
          WHERE sl2.Slot_ID = NEW.Slot_ID
      );
      
    IF v_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Patient already has an appointment with this doctor on this date.';
    END IF;
END$$

CREATE TRIGGER trg_prevent_duplicate_appt_update
BEFORE UPDATE ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_count INT;
    IF NEW.Appointment_Status != 'Cancelled' AND (NEW.Slot_ID != OLD.Slot_ID OR NEW.Patient_ID != OLD.Patient_ID) THEN
        SELECT COUNT(*) INTO v_count
        FROM Appointment a
        JOIN Appointment_Slot sl ON a.Slot_ID = sl.Slot_ID
        JOIN Doctor_Schedule ds ON sl.Schedule_ID = ds.Schedule_ID
        WHERE a.Patient_ID = NEW.Patient_ID
          AND a.Appointment_ID != NEW.Appointment_ID
          AND a.Appointment_Status != 'Cancelled'
          AND ds.Work_Date = (
              SELECT ds2.Work_Date
              FROM Appointment_Slot sl2
              JOIN Doctor_Schedule ds2 ON sl2.Schedule_ID = ds2.Schedule_ID
              WHERE sl2.Slot_ID = NEW.Slot_ID
          )
          AND ds.Doctor_ID = (
              SELECT ds2.Doctor_ID
              FROM Appointment_Slot sl2
              JOIN Doctor_Schedule ds2 ON sl2.Schedule_ID = ds2.Schedule_ID
              WHERE sl2.Slot_ID = NEW.Slot_ID
          );
          
        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Patient already has an appointment with this doctor on this date.';
        END IF;
    END IF;
END$$

-- Trigger: Validate Inventory Pricing
CREATE TRIGGER trg_validate_inventory_price_insert
BEFORE INSERT ON Inventory
FOR EACH ROW
BEGIN
    DECLARE v_unit_price DECIMAL(10,2);
    SELECT Unit_Price INTO v_unit_price FROM Medicine WHERE Medicine_ID = NEW.Medicine_ID;
    IF NEW.Unit_Cost > v_unit_price THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Inventory Unit_Cost cannot exceed Medicine Unit_Price.';
    END IF;
END$$

CREATE TRIGGER trg_validate_inventory_price_update
BEFORE UPDATE ON Inventory
FOR EACH ROW
BEGIN
    DECLARE v_unit_price DECIMAL(10,2);
    SELECT Unit_Price INTO v_unit_price FROM Medicine WHERE Medicine_ID = NEW.Medicine_ID;
    IF NEW.Unit_Cost > v_unit_price THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Inventory Unit_Cost cannot exceed Medicine Unit_Price.';
    END IF;
END$$

-- Trigger: Auto-Pay Zero Amount Bills
CREATE TRIGGER trg_autopay_zero_bill_insert
BEFORE INSERT ON Bill
FOR EACH ROW
BEGIN
    IF NEW.Total_Amount = 0.00 THEN
        SET NEW.Bill_Status = 'Paid';
        SET NEW.Amount_Paid = 0.00;
        SET NEW.Balance_Due = 0.00;
    END IF;
END$$

DELIMITER ;


-- ============================================================
-- SECTION 17: SAMPLE QUERIES (40+)
-- ============================================================

-- Q1: List all patients with their age
SELECT Patient_ID, CONCAT(First_Name,' ',Last_Name) AS Patient_Name,
       Date_Of_Birth, CalculateAge(Date_Of_Birth) AS Age, Blood_Group, Phone
FROM Patient ORDER BY Last_Name;

-- Q2: List all active doctors with department and specialization
SELECT d.Doctor_ID, CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor,
       dept.Dept_Name, s.Spec_Name, d.Consultation_Fee, d.Experience_Years
FROM Doctor d
JOIN Department     dept ON d.Dept_ID = dept.Dept_ID
JOIN Specialization s    ON d.Spec_ID = s.Spec_ID
WHERE d.Is_Active = 1 ORDER BY dept.Dept_Name;

-- Q3: Count appointments per doctor
SELECT CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor,
       COUNT(a.Appointment_ID) AS Total_Appointments
FROM Doctor d
LEFT JOIN Doctor_Schedule  ds ON ds.Doctor_ID   = d.Doctor_ID
LEFT JOIN Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
LEFT JOIN Appointment      a  ON a.Slot_ID      = sl.Slot_ID
GROUP BY d.Doctor_ID ORDER BY Total_Appointments DESC;

-- Q4: All completed appointments with doctor and patient names
SELECT a.Appointment_ID,
       CONCAT(p.First_Name,' ',p.Last_Name)  AS Patient,
       CONCAT(d.First_Name,' ',d.Last_Name)  AS Doctor,
       dept.Dept_Name, ds.Work_Date, sl.Slot_Start, a.Appointment_Status
FROM Appointment      a
JOIN Patient           p    ON a.Patient_ID   = p.Patient_ID
JOIN Appointment_Slot  sl   ON a.Slot_ID      = sl.Slot_ID
JOIN Doctor_Schedule   ds   ON sl.Schedule_ID = ds.Schedule_ID
JOIN Doctor            d    ON ds.Doctor_ID   = d.Doctor_ID
JOIN Department        dept ON d.Dept_ID      = dept.Dept_ID
WHERE a.Appointment_Status = 'Completed';

-- Q5: Patients with outstanding bills (HAVING clause)
SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       COUNT(b.Bill_ID) AS Unpaid_Bills,
       SUM(b.Balance_Due) AS Total_Outstanding
FROM Patient p
JOIN Appointment a ON a.Patient_ID = p.Patient_ID
JOIN Bill        b ON b.Appointment_ID = a.Appointment_ID
WHERE b.Bill_Status IN ('Pending','Partial')
GROUP BY p.Patient_ID
HAVING Total_Outstanding > 0
ORDER BY Total_Outstanding DESC;

-- Q6: Medicine stock below reorder level
SELECT ph.Pharmacy_Name, m.Medicine_Name, m.Strength,
       i.Quantity_In_Stock, i.Reorder_Level,
       (i.Reorder_Level - i.Quantity_In_Stock) AS Deficit
FROM Inventory i
JOIN Pharmacy ph ON i.Pharmacy_ID = ph.Pharmacy_ID
JOIN Medicine m  ON i.Medicine_ID = m.Medicine_ID
WHERE i.Quantity_In_Stock <= i.Reorder_Level
ORDER BY Deficit DESC;

-- Q7: Medicines expiring within 90 days
SELECT m.Medicine_Name, m.Generic_Name, m.Strength, ph.Pharmacy_Name,
       i.Batch_Number, i.Expiry_Date,
       DATEDIFF(i.Expiry_Date, CURRENT_DATE) AS Days_Left
FROM Inventory i
JOIN Medicine  m  ON i.Medicine_ID  = m.Medicine_ID
JOIN Pharmacy  ph ON i.Pharmacy_ID  = ph.Pharmacy_ID
WHERE i.Expiry_Date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 90 DAY)
ORDER BY i.Expiry_Date;

-- Q8: Top 5 most-prescribed medicines
SELECT m.Medicine_Name, m.Generic_Name, COUNT(pi2.Item_ID) AS Times_Prescribed
FROM Prescription_Item pi2
JOIN Medicine m ON pi2.Medicine_ID = m.Medicine_ID
GROUP BY m.Medicine_ID
ORDER BY Times_Prescribed DESC LIMIT 5;

-- Q9: Daily revenue report
SELECT DATE(b.Bill_Date) AS Bill_Day,
       COUNT(b.Bill_ID)   AS Bills_Generated,
       SUM(b.Total_Amount) AS Total_Billed,
       SUM(b.Amount_Paid)  AS Total_Collected,
       SUM(b.Balance_Due)  AS Total_Outstanding
FROM Bill b
GROUP BY DATE(b.Bill_Date)
ORDER BY Bill_Day DESC;

-- Q10: Patient full medical history with prescriptions (JOIN)
SELECT p.Patient_ID, CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       ds.Work_Date, CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor,
       mr.Diagnosis, pr.Prescription_Date,
       m.Medicine_Name, pi2.Dosage, pi2.Frequency, pi2.Duration_Days
FROM Patient          p
JOIN Appointment      a   ON a.Patient_ID    = p.Patient_ID
JOIN Appointment_Slot sl  ON a.Slot_ID       = sl.Slot_ID
JOIN Doctor_Schedule  ds  ON sl.Schedule_ID  = ds.Schedule_ID
JOIN Doctor           d   ON ds.Doctor_ID    = d.Doctor_ID
JOIN Medical_Record   mr  ON mr.Appointment_ID = a.Appointment_ID
JOIN Prescription     pr  ON pr.Record_ID    = mr.Record_ID
JOIN Prescription_Item pi2 ON pi2.Prescription_ID = pr.Prescription_ID
JOIN Medicine         m   ON pi2.Medicine_ID = m.Medicine_ID
ORDER BY p.Patient_ID, ds.Work_Date;


-- Q11: Subquery - Patients who have had more than 1 appointment
SELECT Patient_ID, CONCAT(First_Name,' ',Last_Name) AS Patient,
       PatientAppointmentCount(Patient_ID) AS Total_Visits
FROM Patient
WHERE Patient_ID IN (
    SELECT Patient_ID FROM Appointment
    GROUP BY Patient_ID HAVING COUNT(*) > 1
);

-- Q12: Doctors with no appointments today (subquery)
SELECT d.Doctor_ID, CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor,
       dept.Dept_Name
FROM Doctor d JOIN Department dept ON d.Dept_ID = dept.Dept_ID
WHERE d.Doctor_ID NOT IN (
    SELECT ds.Doctor_ID FROM Doctor_Schedule ds
    JOIN Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
    JOIN Appointment      a  ON a.Slot_ID = sl.Slot_ID
    WHERE ds.Work_Date = CURRENT_DATE
);

-- Q13: Aggregate - Total revenue per department
SELECT dept.Dept_Name,
       COUNT(b.Bill_ID)        AS Total_Bills,
       SUM(b.Consultation_Fee) AS Consultation_Revenue,
       SUM(b.Total_Amount)     AS Total_Revenue
FROM Bill b
JOIN Appointment      a    ON b.Appointment_ID = a.Appointment_ID
JOIN Appointment_Slot sl   ON a.Slot_ID        = sl.Slot_ID
JOIN Doctor_Schedule  ds   ON sl.Schedule_ID   = ds.Schedule_ID
JOIN Doctor           d    ON ds.Doctor_ID     = d.Doctor_ID
JOIN Department       dept ON d.Dept_ID        = dept.Dept_ID
GROUP BY dept.Dept_ID ORDER BY Total_Revenue DESC;

-- Q14: Window function - Rank doctors by number of appointments
SELECT Doctor_Name, Total_Appointments,
       RANK() OVER (ORDER BY Total_Appointments DESC) AS Rank_Position
FROM (
    SELECT CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor_Name,
           COUNT(a.Appointment_ID) AS Total_Appointments
    FROM Doctor d
    LEFT JOIN Doctor_Schedule  ds ON ds.Doctor_ID   = d.Doctor_ID
    LEFT JOIN Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
    LEFT JOIN Appointment      a  ON a.Slot_ID      = sl.Slot_ID
    GROUP BY d.Doctor_ID
) ranked;

-- Q15: CTE - Patients with abnormal lab results
WITH Abnormal_Patients AS (
    SELECT DISTINCT a.Patient_ID
    FROM Lab_Result lr
    JOIN Lab_Order   lo ON lr.Order_ID    = lo.Order_ID
    JOIN Appointment  a ON lo.Appointment_ID = a.Appointment_ID
    WHERE lr.Is_Abnormal = 1
)
SELECT p.Patient_ID, CONCAT(p.First_Name,' ',p.Last_Name) AS Patient, p.Phone
FROM Patient p
WHERE p.Patient_ID IN (SELECT Patient_ID FROM Abnormal_Patients);

-- Q16: UNION - All upcoming & past appointments in one view
SELECT 'Past' AS Type, a.Appointment_ID,
       CONCAT(p.First_Name,' ',p.Last_Name) AS Patient, ds.Work_Date
FROM Appointment a
JOIN Patient          p  ON a.Patient_ID   = p.Patient_ID
JOIN Appointment_Slot sl ON a.Slot_ID      = sl.Slot_ID
JOIN Doctor_Schedule  ds ON sl.Schedule_ID = ds.Schedule_ID
WHERE a.Appointment_Status = 'Completed'
UNION
SELECT 'Upcoming', a.Appointment_ID,
       CONCAT(p.First_Name,' ',p.Last_Name), ds.Work_Date
FROM Appointment a
JOIN Patient          p  ON a.Patient_ID   = p.Patient_ID
JOIN Appointment_Slot sl ON a.Slot_ID      = sl.Slot_ID
JOIN Doctor_Schedule  ds ON sl.Schedule_ID = ds.Schedule_ID
WHERE a.Appointment_Status = 'Scheduled'
ORDER BY Work_Date DESC;

-- Q17: CASE - Classify bills by status and balance
SELECT b.Bill_ID, CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       b.Total_Amount, b.Balance_Due,
       CASE
           WHEN b.Bill_Status = 'Paid'    THEN 'Fully Settled'
           WHEN b.Bill_Status = 'Partial' THEN 'Partially Paid'
           WHEN b.Bill_Status = 'Pending' AND b.Balance_Due > 2000 THEN 'High Priority Collection'
           WHEN b.Bill_Status = 'Pending' THEN 'Needs Follow-up'
           ELSE b.Bill_Status
       END AS Collection_Priority
FROM Bill b
JOIN Appointment a ON b.Appointment_ID = a.Appointment_ID
JOIN Patient     p ON a.Patient_ID     = p.Patient_ID
ORDER BY b.Balance_Due DESC;

-- Q18: Nested query - Doctors whose consultation fee is above average
SELECT CONCAT(First_Name,' ',Last_Name) AS Doctor,
       Consultation_Fee,
       (SELECT AVG(Consultation_Fee) FROM Doctor) AS Avg_Fee
FROM Doctor
WHERE Consultation_Fee > (SELECT AVG(Consultation_Fee) FROM Doctor)
ORDER BY Consultation_Fee DESC;

-- Q19: Lab orders with STAT priority
SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor,
       lo.Order_Date, lo.Priority, lo.Status, lo.Notes
FROM Lab_Order lo
JOIN Appointment a ON lo.Appointment_ID = a.Appointment_ID
JOIN Patient     p ON a.Patient_ID      = p.Patient_ID
JOIN Doctor      d ON lo.Doctor_ID      = d.Doctor_ID
WHERE lo.Priority = 'STAT';

-- Q20: Patients who visited Cardiology
SELECT DISTINCT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       p.Phone, ds.Work_Date
FROM Patient p
JOIN Appointment      a    ON a.Patient_ID   = p.Patient_ID
JOIN Appointment_Slot sl   ON a.Slot_ID      = sl.Slot_ID
JOIN Doctor_Schedule  ds   ON sl.Schedule_ID = ds.Schedule_ID
JOIN Doctor           d    ON ds.Doctor_ID   = d.Doctor_ID
JOIN Department       dept ON d.Dept_ID      = dept.Dept_ID
WHERE dept.Dept_Name = 'Cardiology';


-- Q21: Rolling 7-day payment summary (window function)
SELECT Payment_ID, Bill_ID, Amount, Payment_Date,
       SUM(Amount) OVER (ORDER BY Payment_Date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS Rolling_7Day_Total
FROM Payment ORDER BY Payment_Date;

-- Q22: Doctor schedule utilization rate
SELECT CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor,
       COUNT(sl.Slot_ID)   AS Total_Slots,
       SUM(CASE WHEN sl.Status = 'Booked' OR sl.Status = 'Completed' THEN 1 ELSE 0 END) AS Booked_Slots,
       ROUND(SUM(CASE WHEN sl.Status IN ('Booked','Completed') THEN 1 ELSE 0 END) * 100.0 / COUNT(sl.Slot_ID), 1) AS Utilization_Pct
FROM Doctor d
JOIN Doctor_Schedule  ds ON ds.Doctor_ID   = d.Doctor_ID
JOIN Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
GROUP BY d.Doctor_ID ORDER BY Utilization_Pct DESC;

-- Q23: All abnormal lab results with patient details
SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       lt.Test_Name, lr.Result, lt.Normal_Range,
       lr.Result_Date, lr.Remarks
FROM Lab_Result lr
JOIN Lab_Order  lo ON lr.Order_ID       = lo.Order_ID
JOIN Lab_Test   lt ON lr.Test_ID        = lt.Test_ID
JOIN Appointment a ON lo.Appointment_ID = a.Appointment_ID
JOIN Patient    p  ON a.Patient_ID      = p.Patient_ID
WHERE lr.Is_Abnormal = 1
ORDER BY lr.Result_Date DESC;

-- Q24: GROUP BY - count patients by blood group
SELECT Blood_Group, COUNT(*) AS Patient_Count,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Patient), 1) AS Percentage
FROM Patient GROUP BY Blood_Group ORDER BY Patient_Count DESC;

-- Q25: Medicines with HAVING - prescribed more than once
SELECT m.Medicine_Name, m.Strength,
       COUNT(pi2.Item_ID) AS Prescription_Count
FROM Prescription_Item pi2
JOIN Medicine m ON pi2.Medicine_ID = m.Medicine_ID
GROUP BY m.Medicine_ID
HAVING Prescription_Count > 1
ORDER BY Prescription_Count DESC;

-- Q26: CTE - Monthly appointment stats
WITH Monthly AS (
    SELECT DATE_FORMAT(ds.Work_Date,'%Y-%m') AS Month,
           COUNT(a.Appointment_ID)           AS Total,
           SUM(CASE WHEN a.Appointment_Status='Completed'  THEN 1 ELSE 0 END) AS Completed,
           SUM(CASE WHEN a.Appointment_Status='Cancelled'  THEN 1 ELSE 0 END) AS Cancelled,
           SUM(CASE WHEN a.Appointment_Status='Scheduled'  THEN 1 ELSE 0 END) AS Scheduled
    FROM Appointment a
    JOIN Appointment_Slot sl ON a.Slot_ID      = sl.Slot_ID
    JOIN Doctor_Schedule  ds ON sl.Schedule_ID = ds.Schedule_ID
    GROUP BY Month
)
SELECT * FROM Monthly ORDER BY Month;

-- Q27: Find patients with follow-up dates this month
SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient, p.Phone,
       mr.Follow_Up_Date,
       CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor
FROM Medical_Record mr
JOIN Appointment      a  ON mr.Appointment_ID = a.Appointment_ID
JOIN Patient          p  ON a.Patient_ID      = p.Patient_ID
JOIN Appointment_Slot sl ON a.Slot_ID         = sl.Slot_ID
JOIN Doctor_Schedule  ds ON sl.Schedule_ID    = ds.Schedule_ID
JOIN Doctor           d  ON ds.Doctor_ID      = d.Doctor_ID
WHERE MONTH(mr.Follow_Up_Date) = MONTH(CURRENT_DATE)
  AND YEAR(mr.Follow_Up_Date)  = YEAR(CURRENT_DATE);

-- Q28: ORDER BY and LIMIT - Top 10 paying patients
SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       SUM(pay.Amount) AS Total_Paid
FROM Payment pay
JOIN Bill        b ON pay.Bill_ID       = b.Bill_ID
JOIN Appointment a ON b.Appointment_ID  = a.Appointment_ID
JOIN Patient     p ON a.Patient_ID      = p.Patient_ID
GROUP BY p.Patient_ID
ORDER BY Total_Paid DESC LIMIT 10;

-- Q29: Employees per department
SELECT dept.Dept_Name,
       COUNT(e.Emp_ID) AS Employee_Count,
       SUM(e.Salary)   AS Total_Salary_Budget
FROM Department dept
LEFT JOIN Employee e ON e.Dept_ID = dept.Dept_ID
GROUP BY dept.Dept_ID
ORDER BY Employee_Count DESC;

-- Q30: List all prescriptions with patient and medicine details
SELECT pr.Prescription_ID, pr.Prescription_Date,
       CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       m.Medicine_Name, pi2.Dosage, pi2.Frequency, pi2.Duration_Days
FROM Prescription      pr
JOIN Medical_Record    mr  ON pr.Record_ID       = mr.Record_ID
JOIN Appointment        a  ON mr.Appointment_ID  = a.Appointment_ID
JOIN Patient            p  ON a.Patient_ID       = p.Patient_ID
JOIN Prescription_Item pi2 ON pi2.Prescription_ID= pr.Prescription_ID
JOIN Medicine           m  ON pi2.Medicine_ID    = m.Medicine_ID
ORDER BY pr.Prescription_Date DESC;


-- Q31: Running total of payments per bill (window)
SELECT pay.Bill_ID, pay.Payment_Date, pay.Amount,
       SUM(pay.Amount) OVER (PARTITION BY pay.Bill_ID ORDER BY pay.Payment_Date) AS Running_Total_Paid
FROM Payment pay ORDER BY pay.Bill_ID, pay.Payment_Date;

-- Q32: Average consultation fee per specialization
SELECT s.Spec_Name,
       COUNT(d.Doctor_ID)          AS Doctors,
       AVG(d.Consultation_Fee)     AS Avg_Fee,
       MIN(d.Consultation_Fee)     AS Min_Fee,
       MAX(d.Consultation_Fee)     AS Max_Fee
FROM Doctor d
JOIN Specialization s ON d.Spec_ID = s.Spec_ID
GROUP BY s.Spec_ID ORDER BY Avg_Fee DESC;

-- Q33: Nested subquery - Patients with only completed appointments
SELECT CONCAT(First_Name,' ',Last_Name) AS Patient
FROM Patient
WHERE Patient_ID NOT IN (
    SELECT Patient_ID FROM Appointment
    WHERE Appointment_Status != 'Completed'
);

-- Q34: Lab tests ordered most frequently
SELECT lt.Test_Name, lt.Test_Code, COUNT(lr.Result_ID) AS Times_Performed,
       SUM(lt.Price) AS Revenue_Generated
FROM Lab_Result lr
JOIN Lab_Test lt ON lr.Test_ID = lt.Test_ID
GROUP BY lt.Test_ID ORDER BY Times_Performed DESC;

-- Q35: Patients who have both a lab order and a prescription
SELECT DISTINCT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient
FROM Patient p
WHERE p.Patient_ID IN (
    SELECT a.Patient_ID FROM Appointment a
    JOIN Lab_Order lo ON lo.Appointment_ID = a.Appointment_ID
)
AND p.Patient_ID IN (
    SELECT a2.Patient_ID FROM Appointment a2
    JOIN Medical_Record mr ON mr.Appointment_ID = a2.Appointment_ID
    JOIN Prescription pr ON pr.Record_ID = mr.Record_ID
);

-- Q36: CASE - Risk classification of diabetic patients
SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       lr.Result AS HbA1c_Value,
       CASE
           WHEN CAST(REGEXP_SUBSTR(lr.Result,'[0-9]+\\.?[0-9]*') AS DECIMAL(5,2)) < 7.0  THEN 'Well Controlled'
           WHEN CAST(REGEXP_SUBSTR(lr.Result,'[0-9]+\\.?[0-9]*') AS DECIMAL(5,2)) < 8.0  THEN 'Moderate'
           WHEN CAST(REGEXP_SUBSTR(lr.Result,'[0-9]+\\.?[0-9]*') AS DECIMAL(5,2)) < 9.0  THEN 'Poorly Controlled'
           ELSE 'Critical'
       END AS Diabetes_Control
FROM Lab_Result lr
JOIN Lab_Test   lt ON lr.Test_ID        = lt.Test_ID
JOIN Lab_Order  lo ON lr.Order_ID       = lo.Order_ID
JOIN Appointment a ON lo.Appointment_ID = a.Appointment_ID
JOIN Patient    p  ON a.Patient_ID      = p.Patient_ID
WHERE lt.Test_Code = 'HBA1C';

-- Q37: Inventory valuation per pharmacy
SELECT ph.Pharmacy_Name,
       COUNT(i.Inventory_ID)                 AS Item_Lines,
       SUM(i.Quantity_In_Stock * i.Unit_Cost) AS Stock_Value
FROM Inventory i JOIN Pharmacy ph ON i.Pharmacy_ID = ph.Pharmacy_ID
GROUP BY ph.Pharmacy_ID ORDER BY Stock_Value DESC;

-- Q38: CTE - Unpaid bills older than 7 days
WITH Overdue AS (
    SELECT b.Bill_ID, b.Bill_Date, b.Balance_Due,
           DATEDIFF(CURRENT_DATE, b.Bill_Date) AS Days_Overdue,
           CONCAT(p.First_Name,' ',p.Last_Name) AS Patient, p.Phone
    FROM Bill b
    JOIN Appointment a ON b.Appointment_ID = a.Appointment_ID
    JOIN Patient     p ON a.Patient_ID     = p.Patient_ID
    WHERE b.Bill_Status IN ('Pending','Partial')
)
SELECT * FROM Overdue WHERE Days_Overdue > 7 ORDER BY Days_Overdue DESC;

-- Q39: Monthly prescription volume
SELECT DATE_FORMAT(pr.Prescription_Date,'%Y-%m') AS Month,
       COUNT(pr.Prescription_ID)                  AS Prescriptions_Issued,
       COUNT(pi2.Item_ID)                          AS Medicines_Prescribed
FROM Prescription pr
LEFT JOIN Prescription_Item pi2 ON pi2.Prescription_ID = pr.Prescription_ID
GROUP BY Month ORDER BY Month;

-- Q40: Full billing summary with payment method breakdown
SELECT b.Bill_ID,
       CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       b.Total_Amount, b.Bill_Status,
       SUM(CASE WHEN pay.Payment_Method='Cash'          THEN pay.Amount ELSE 0 END) AS Cash_Paid,
       SUM(CASE WHEN pay.Payment_Method='Card'          THEN pay.Amount ELSE 0 END) AS Card_Paid,
       SUM(CASE WHEN pay.Payment_Method='Insurance'     THEN pay.Amount ELSE 0 END) AS Insurance_Paid,
       SUM(CASE WHEN pay.Payment_Method='Mobile_Money'  THEN pay.Amount ELSE 0 END) AS Mobile_Paid,
       SUM(CASE WHEN pay.Payment_Method='Bank_Transfer' THEN pay.Amount ELSE 0 END) AS Bank_Paid,
       SUM(pay.Amount)                                                               AS Total_Paid
FROM Bill b
JOIN Appointment a   ON b.Appointment_ID = a.Appointment_ID
JOIN Patient     p   ON a.Patient_ID     = p.Patient_ID
LEFT JOIN Payment pay ON pay.Bill_ID     = b.Bill_ID
GROUP BY b.Bill_ID ORDER BY b.Bill_Date;

-- Q41: Doctor workload - slots booked vs available per week
SELECT CONCAT(d.First_Name,' ',d.Last_Name) AS Doctor,
       WEEK(ds.Work_Date) AS Week_Number,
       COUNT(sl.Slot_ID)  AS Total_Slots,
       SUM(CASE WHEN sl.Status IN ('Booked','Completed') THEN 1 ELSE 0 END) AS Booked
FROM Doctor d
JOIN Doctor_Schedule  ds ON ds.Doctor_ID   = d.Doctor_ID
JOIN Appointment_Slot sl ON sl.Schedule_ID = ds.Schedule_ID
GROUP BY d.Doctor_ID, WEEK(ds.Work_Date);

-- Q42: Patients with high blood pressure diagnoses
SELECT CONCAT(p.First_Name,' ',p.Last_Name) AS Patient,
       mr.Diagnosis, ds.Work_Date AS Visit_Date
FROM Medical_Record mr
JOIN Appointment      a  ON mr.Appointment_ID = a.Appointment_ID
JOIN Patient          p  ON a.Patient_ID      = p.Patient_ID
JOIN Appointment_Slot sl ON a.Slot_ID         = sl.Slot_ID
JOIN Doctor_Schedule  ds ON sl.Schedule_ID    = ds.Schedule_ID
WHERE mr.Diagnosis LIKE '%hypertension%'
   OR mr.Diagnosis LIKE '%blood pressure%';

-- Q43: Audit log - recent updates
SELECT Log_ID, Table_Name, Record_ID, Action, Changed_By, Changed_At
FROM Audit_Log
ORDER BY Changed_At DESC LIMIT 20;

-- Q44: Pharmacy inventory with UNION of both pharmacies
SELECT 'Main Pharmacy' AS Pharmacy, m.Medicine_Name, i.Quantity_In_Stock, i.Expiry_Date
FROM Inventory i JOIN Medicine m ON i.Medicine_ID = m.Medicine_ID WHERE i.Pharmacy_ID = 1
UNION ALL
SELECT 'OP Pharmacy',               m.Medicine_Name, i.Quantity_In_Stock, i.Expiry_Date
FROM Inventory i JOIN Medicine m ON i.Medicine_ID = m.Medicine_ID WHERE i.Pharmacy_ID = 2
ORDER BY Medicine_Name;


-- ============================================================
-- SECTION 18: SECURITY - MySQL Database Users & Privileges
-- ============================================================

-- Create users (use strong passwords in production!)
CREATE USER IF NOT EXISTS 'hospital_admin'@'localhost'   IDENTIFIED BY 'Admin@HMS2026!';
CREATE USER IF NOT EXISTS 'receptionist'@'localhost'     IDENTIFIED BY 'Recep@HMS2026!';
CREATE USER IF NOT EXISTS 'doctor_user'@'localhost'      IDENTIFIED BY 'Doctor@HMS2026!';
CREATE USER IF NOT EXISTS 'lab_tech'@'localhost'         IDENTIFIED BY 'LabTech@HMS2026!';
CREATE USER IF NOT EXISTS 'pharmacist'@'localhost'       IDENTIFIED BY 'Pharm@HMS2026!';
CREATE USER IF NOT EXISTS 'accountant'@'localhost'       IDENTIFIED BY 'Acct@HMS2026!';

-- Hospital Admin: Full access
GRANT ALL PRIVILEGES ON Hospital_Management_System.* TO 'hospital_admin'@'localhost' WITH GRANT OPTION;

-- Receptionist: Patients, Appointments, Schedules, Slots (read/write)
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Patient             TO 'receptionist'@'localhost';
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Appointment         TO 'receptionist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Doctor              TO 'receptionist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Doctor_Schedule     TO 'receptionist'@'localhost';
GRANT SELECT, UPDATE         ON Hospital_Management_System.Appointment_Slot    TO 'receptionist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Department          TO 'receptionist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Specialization      TO 'receptionist'@'localhost';

-- Doctor: Medical records, prescriptions, lab orders (read/write relevant tables)
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Medical_Record      TO 'doctor_user'@'localhost';
GRANT SELECT, INSERT         ON Hospital_Management_System.Prescription        TO 'doctor_user'@'localhost';
GRANT SELECT, INSERT         ON Hospital_Management_System.Prescription_Item   TO 'doctor_user'@'localhost';
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Lab_Order           TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Lab_Result          TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Patient             TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Appointment         TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Medicine            TO 'doctor_user'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Inventory           TO 'doctor_user'@'localhost';

-- Lab Technician: Lab orders and results
GRANT SELECT, UPDATE         ON Hospital_Management_System.Lab_Order           TO 'lab_tech'@'localhost';
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Lab_Result          TO 'lab_tech'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Lab_Test            TO 'lab_tech'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Patient             TO 'lab_tech'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Appointment         TO 'lab_tech'@'localhost';

-- Pharmacist: Medicine and inventory management
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Inventory           TO 'pharmacist'@'localhost';
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Medicine            TO 'pharmacist'@'localhost';
GRANT SELECT, INSERT         ON Hospital_Management_System.Medicine_Category   TO 'pharmacist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Prescription        TO 'pharmacist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Prescription_Item   TO 'pharmacist'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Pharmacy            TO 'pharmacist'@'localhost';

-- Accountant: Billing and payments
GRANT SELECT, INSERT, UPDATE ON Hospital_Management_System.Bill                TO 'accountant'@'localhost';
GRANT SELECT, INSERT         ON Hospital_Management_System.Payment             TO 'accountant'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Patient             TO 'accountant'@'localhost';
GRANT SELECT                 ON Hospital_Management_System.Appointment         TO 'accountant'@'localhost';

FLUSH PRIVILEGES;


-- ============================================================
-- SECTION 19: TRANSACTIONS
-- ============================================================

-- Create a demo schedule + slots for transaction examples
-- (avoids conflicts with existing sample data)
INSERT INTO Doctor_Schedule(Doctor_ID, Work_Date, Start_Time, End_Time, Status)
VALUES(1, '2026-10-01', '09:00:00', '11:00:00', 'Available');
SET @demo_sched = LAST_INSERT_ID();

INSERT INTO Appointment_Slot(Schedule_ID, Slot_Start, Slot_End) VALUES
  (@demo_sched, '09:00:00', '09:30:00'),
  (@demo_sched, '09:30:00', '10:00:00'),
  (@demo_sched, '10:00:00', '10:30:00');
SET @demo_slot1 = LAST_INSERT_ID() - 2;
SET @demo_slot2 = LAST_INSERT_ID() - 1;
SET @demo_slot3 = LAST_INSERT_ID();

-- Transaction 1: Book an appointment safely
START TRANSACTION;
CALL BookAppointment(1, @demo_slot1, 'Demo booking via transaction', @appt_id, @msg);
SELECT @appt_id AS New_Appointment_ID, @msg AS Message;
COMMIT;

-- Transaction 2: Complete appointment + generate bill atomically
START TRANSACTION;
CALL CompleteAppointment(@appt_id, 'Stable cardiac rhythm', 'Aspirin 75mg OD continued', 'Annual check normal', @rec_id, @cmsg);
CALL GenerateBill(@appt_id, 180.00, 500.00, 50.00, 0.00, 73.00, @bill_id, @bmsg);
SELECT @rec_id AS Medical_Record_ID, @cmsg AS Complete_Msg, @bill_id AS Bill_ID, @bmsg AS Bill_Msg;
COMMIT;

-- Transaction 3: Process payment
START TRANSACTION;
CALL ProcessPayment(@bill_id, 2303.00, 'Insurance', 'INS-DEMO-001', 4, @pay_id, @pmsg);
SELECT @pay_id AS Payment_ID, @pmsg AS Payment_Msg;
COMMIT;

-- Transaction 4: Update medicine stock (batch restock)
START TRANSACTION;
CALL UpdateMedicineStock(1, 100, @smsg1);
CALL UpdateMedicineStock(2, 100, @smsg2);
CALL UpdateMedicineStock(3, 200, @smsg3);
SELECT @smsg1 AS Stock1, @smsg2 AS Stock2, @smsg3 AS Stock3;
COMMIT;

-- ============================================================
-- SECTION 20: RE-ENABLE CHECKS & FINAL SYNC
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;

-- Final slot status sync (handles demo transaction slots)
UPDATE Appointment_Slot sl
JOIN Appointment a ON a.Slot_ID = sl.Slot_ID
SET sl.Status = CASE
    WHEN a.Appointment_Status = 'Completed'              THEN 'Completed'
    WHEN a.Appointment_Status = 'Scheduled'              THEN 'Booked'
    WHEN a.Appointment_Status IN ('Cancelled','No_Show') THEN 'Open'
    ELSE 'Booked'
END;

-- ============================================================
-- END OF Hospital_Management_System.sql
-- ============================================================
SELECT 'Hospital Management System database created successfully!' AS Status;


