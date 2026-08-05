# 🏥 Hospital Management System

A complete, production-grade **Hospital Information System (HIS)** — full-stack application with MySQL 8.0 database, Node.js/Express REST API, and a responsive web frontend.

---

## 🚀 Quick Start

### Prerequisites
- **MySQL 8.0** installed and running
- **Node.js 18+** (tested on v24)

### 1. Clone / Open the project
```
cd "Hospital MYSQL Databse"
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Configure database connection
Edit `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=Hospital_Management_System
JWT_SECRET=change_this_to_a_random_string
JWT_EXPIRES_IN=8h
PORT=5000
```

### 4. Import the database
Open **MySQL Workbench** → File → Run SQL Script → select `Hospital_Management_System.sql`

Or use the setup wizard:
```bash
cd ..
node setup.js
```

### 5. Start the server
```bash
cd backend
node server.js
```

### 6. Open the app
```
http://localhost:5000
```

---

## 🔑 Demo Login Accounts

| Username | Role | Password |
|----------|------|----------|
| `admin` | Hospital Admin | `admin123` |
| `receptionist1` | Receptionist | `admin123` |
| `dr_kamal` | Doctor | `admin123` |
| `dr_layla` | Doctor | `admin123` |
| `labtech1` | Lab Technician | `admin123` |
| `pharmacist1` | Pharmacist | `admin123` |
| `accountant1` | Accountant | `admin123` |

> 🔒 **Security Note:** All sample accounts have their passwords securely hashed in the database. The password for all demo accounts is strictly **`admin123`**.

---

## 🛠️ Recent Audit & Fixes (August 2026)

A comprehensive security, database architecture, and performance audit was recently performed, resulting in the following fixes:

**Database Architecture Patches:**
- **Cancellation Bug Fixed:** Removed the `uq_slot_booked` unique constraint on the `Appointment` table to allow cancelled appointments to safely release their slots without causing constraint crashes.
- **Inventory Trigger Removed:** Dropped the `trg_deduct_inventory_on_prescription` trigger. Inventory is no longer automatically deducted upon prescription, allowing for proper manual dispensing workflows.
- **Unlocked Doctor Schedules:** Removed the `uq_doctor_workdate` constraint, permitting doctors to be assigned split-shifts on the same day.
- **Multi-Vendor Medicine Support:** Dropped the `uq_medicine_name` constraint from `Medicine`, enabling pharmacies to stock identical generic medicines from different suppliers.

**Frontend & Security Patches:**
- **Strict Role-Based Access Control (RBAC):** Fixed HTML IDs and JavaScript mapping so that unauthorized users (e.g., receptionists or accountants) can no longer see or access Pharmacy buttons (`+ Add Medicine`, `+ Add Inventory`, `+ Add Pharmacy`).
- **Book Appointment UI Security:** Fixed the UI logic so non-receptionists (like Doctors) cannot see the `+ Book Appointment` button.
- **API Request Debouncing:** Implemented a 350ms `debounce` on all live-search inputs (Patients, Doctors, Laboratory, Pharmacy) to prevent flooding the Node.js server with rapid-fire requests.
- **Memory Leak Resolved:** Fixed an issue in `patients.js` where duplicate event listeners were attached to the search bar every time the page was navigated, preventing API spam.
- **Graceful Error Handling:** Upgraded `api.js` with `try...catch` blocks to gracefully display red Toast notifications if the backend server drops or goes offline.

---

## 🏗️ Project Structure

```
Hospital MYSQL Databse/
├── Hospital_Management_System.sql   # Complete MySQL 8.0 database
├── setup.js                         # Interactive setup wizard
├── package.json
├── README.md
│
├── backend/                         # Node.js + Express API
│   ├── server.js                    # Main server entry point
│   ├── db.js                        # MySQL connection pool
│   ├── .env                         # Environment config (not in git)
│   ├── middleware/
│   │   └── auth.js                  # JWT authentication middleware
│   └── routes/
│       ├── auth.js                  # Login / session
│       ├── dashboard.js             # Stats & charts data
│       ├── patients.js              # Patient CRUD
│       ├── doctors.js               # Doctor CRUD + schedules
│       ├── appointments.js          # Book / complete / cancel
│       ├── billing.js               # Bills & payments
│       ├── pharmacy.js              # Medicines & inventory
│       ├── laboratory.js            # Lab orders & results
│       ├── medical.js               # Medical records & prescriptions
│       └── reports.js               # Analytics & reports
│
└── frontend/                        # Vanilla HTML/CSS/JS SPA
    ├── index.html                   # Single-page application
    ├── css/
    │   └── style.css                # Complete responsive stylesheet
    └── js/
        ├── api.js                   # HTTP client
        ├── utils.js                 # Helpers (Toast, Fmt, Modal…)
        ├── auth.js                  # Login / logout
        ├── app.js                   # Navigation shell
        ├── dashboard.js             # Dashboard charts & stats
        ├── patients.js              # Patient management
        ├── doctors.js               # Doctor management
        ├── appointments.js          # Appointment booking
        ├── billing.js               # Billing & payments
        ├── pharmacy.js              # Pharmacy & inventory
        ├── laboratory.js            # Lab orders & results
        └── reports.js               # Reports & analytics
```

---

## 🗄️ Database Design

**Name:** `Hospital_Management_System` | **Engine:** InnoDB | **Normal Form:** 3NF

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

### Database Features
- ✅ **19 tables** fully normalized to 3NF
- ✅ **25+ indexes** on frequently searched columns
- ✅ **7 views** (Upcoming_Appointments, Doctor_Daily_Schedule, Patient_Medical_History, Outstanding_Bills, Available_Doctors, Medicine_Inventory, Lab_Test_Results)
- ✅ **11 stored procedures** (RegisterPatient, BookAppointment, CancelAppointment, CompleteAppointment, GenerateBill, AddMedicine, UpdateMedicineStock, CreatePrescription, OrderLabTest, RecordLabResult, ProcessPayment)
- ✅ **4 functions** (CalculateAge, CalculateBillTotal, DoctorAvailable, PatientAppointmentCount)
- ✅ **8 triggers** (double-booking prevention, expired medicine guard, auto inventory deduction, auto medical record, audit logging)
- ✅ **44 sample queries** covering all SQL constructs
- ✅ **ACID transactions** for all critical operations
- ✅ **Role-based MySQL users** (6 users with least-privilege grants)

### Sample Data
- 10 Departments, 10 Doctors, 25 Patients, 15 Employees
- 50 Appointments, 50 Slots, 20 Medicines, 20 Inventory records
- 20 Bills, 20 Payments, 20 Prescriptions, 20 Lab Orders, 20 Lab Results

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET/POST/PUT/DELETE | `/api/patients` | Patient CRUD |
| GET | `/api/patients/:id/history` | Medical history |
| GET/POST/PUT | `/api/doctors` | Doctor CRUD |
| GET/POST | `/api/doctors/:id/schedule` | Doctor schedules |
| GET/POST | `/api/appointments` | Appointments |
| PUT | `/api/appointments/:id/cancel` | Cancel appointment |
| PUT | `/api/appointments/:id/complete` | Complete + create record |
| GET | `/api/appointments/slots/available` | Available slots |
| GET/POST | `/api/billing` | Bills |
| POST | `/api/billing/generate` | Generate bill |
| POST | `/api/billing/:id/payment` | Process payment |
| GET/POST | `/api/pharmacy/medicines` | Medicine catalog |
| GET | `/api/pharmacy/inventory` | Inventory |
| PUT | `/api/pharmacy/inventory/:id/stock` | Update stock |
| GET/POST | `/api/lab/orders` | Lab orders |
| POST | `/api/lab/orders/:id/results` | Record result |
| GET | `/api/lab/tests` | Test catalog |
| GET | `/api/reports/revenue` | Revenue report |
| GET | `/api/reports/appointments` | Appointment report |
| GET | `/api/reports/inventory` | Inventory report |

---

## 📐 Entity Relationship Summary

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

## 🔐 Business Rules Enforced

- A patient cannot book two appointments in the same slot (trigger guard)
- Medical records created only after completed appointments (trigger)
- Bills generated only for completed appointments (SP validation)
- Expired medicines cannot be prescribed (trigger)
- Payments auto-update bill status (trigger)
- All critical changes logged to Audit_Log (triggers)

---

## 🏫 Project Info

- **Course:** Database Systems
- **Level:** University / Advanced
- **Stack:** MySQL 8.0 + Node.js + Express + Vanilla JS

---

## 📄 License

MIT — Free to use and modify for educational purposes.
