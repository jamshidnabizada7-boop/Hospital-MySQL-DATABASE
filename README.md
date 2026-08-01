# 🏥 Hospital Management System — MySQL 8.0 Database

A complete, production-grade **Hospital Information System (HIS)** database built with MySQL 8.0, designed for university-level Database Systems projects and real-world enterprise use.

---

## 📐 Database Design

**Database Name:** `Hospital_Management_System`  
**Engine:** InnoDB | **Charset:** utf8mb4 | **Normal Form:** 3NF

### Modules

| Module | Tables |
|--------|--------|
| Security | `Role`, `App_User` |
| Hospital | `Department`, `Specialization`, `Doctor`, `Employee` |
| Patient | `Patient` |
| Scheduling | `Doctor_Schedule`, `Appointment_Slot`, `Appointment` |
| Medical | `Medical_Record`, `Prescription`, `Prescription_Item` |
| Pharmacy | `Medicine_Category`, `Medicine`, `Pharmacy`, `Inventory` |
| Laboratory | `Lab_Test`, `Lab_Order`, `Lab_Result` |
| Billing | `Bill`, `Payment` |
| Audit | `Audit_Log` |

---

## 🚀 Features

- ✅ Fully normalized to **Third Normal Form (3NF)**
- ✅ **Foreign key constraints** with proper ON DELETE / ON UPDATE cascading
- ✅ **25+ indexes** on frequently searched columns
- ✅ **7 Views** (Upcoming_Appointments, Doctor_Daily_Schedule, Patient_Medical_History, Outstanding_Bills, Available_Doctors, Medicine_Inventory, Lab_Test_Results)
- ✅ **11 Stored Procedures** (RegisterPatient, BookAppointment, CancelAppointment, CompleteAppointment, GenerateBill, AddMedicine, UpdateMedicineStock, CreatePrescription, OrderLabTest, RecordLabResult, ProcessPayment)
- ✅ **4 Functions** (CalculateAge, CalculateBillTotal, DoctorAvailable, PatientAppointmentCount)
- ✅ **8 Triggers** (double-booking prevention, expired medicine check, auto inventory deduction, auto medical record creation, audit logging)
- ✅ **Comprehensive sample data** (10 depts, 10 doctors, 25 patients, 15 employees, 50 appointments, 20 medicines, 20 bills, 20 payments, 20 prescriptions, 20 lab orders, 20 lab results)
- ✅ **44 sample queries** (JOIN, GROUP BY, HAVING, subqueries, CTEs, window functions, UNION, CASE)
- ✅ **Role-based security** (6 MySQL users with least-privilege grants)
- ✅ **ACID transactions** for critical operations

---

## 📦 How to Run

1. Open **MySQL Workbench** (MySQL 8.0+)
2. Open the file `Hospital_Management_System.sql`
3. Execute the entire script (`Ctrl+Shift+Enter`)
4. The database is created, populated, and ready to query

> ⚠️ The script drops and recreates the database on each run. Back up any existing data first.

---

## 🔐 Default Database Users Created

| User | Role | Access |
|------|------|--------|
| `hospital_admin` | Administrator | Full access |
| `receptionist` | Receptionist | Patients, Appointments |
| `doctor_user` | Doctor | Medical records, Prescriptions, Lab orders |
| `lab_tech` | Lab Technician | Lab orders and results |
| `pharmacist` | Pharmacist | Medicine and inventory |
| `accountant` | Accountant | Billing and payments |

> Change passwords before deploying in any real environment.

---

## 📊 Entity Relationship Summary

```
Role (1)────(M) App_User
Department (1)────(M) Doctor
Department (1)────(M) Employee
Specialization (1)────(M) Doctor
Doctor (1)────(M) Doctor_Schedule
Doctor_Schedule (1)────(M) Appointment_Slot
Appointment_Slot (1)────(0..1) Appointment
Patient (1)────(M) Appointment
Appointment (1)────(0..1) Medical_Record
Medical_Record (1)────(M) Prescription
Prescription (1)────(M) Prescription_Item
Medicine (1)────(M) Prescription_Item
Medicine_Category (1)────(M) Medicine
Pharmacy (1)────(M) Inventory
Medicine (1)────(M) Inventory
Appointment (1)────(M) Lab_Order
Doctor (1)────(M) Lab_Order
Lab_Order (1)────(M) Lab_Result
Lab_Test (1)────(M) Lab_Result
Appointment (1)────(1) Bill
Bill (1)────(M) Payment
```

---

## 🏫 Project Info

- **Course:** Database Systems
- **Level:** University / Advanced
- **Author:** Hospital Management System Project

---

## 📄 License

This project is provided for educational purposes. Free to use and modify.
