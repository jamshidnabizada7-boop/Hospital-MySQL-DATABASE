# 🏥 Hospital Management System (HMS)

A complete, production-grade **Hospital Information System (HIS)** — featuring a fully normalized MySQL 8.0 database architecture, a high-performance Node.js/Express REST API, and a dynamic, responsive Single Page Application (SPA) frontend.

---

## 🚀 Quick Start & Installation

### Prerequisites
- **MySQL 8.0** installed and running on default port `3306`
- **Node.js** (v18 or higher recommended)

### 1. Backend Server Setup
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
npm install
```

### 2. Database Initialization
Use the built-in interactive setup wizard to configure your MySQL connection details. This wizard will automatically generate your `.env` configuration file and import the database.
```bash
npm run setup
```
*Note: If auto-import fails, double-click the `run_mysql.bat` script on Windows or import `Hospital_Management_System.sql` directly via MySQL Workbench.*

### 3. Application Access
Start the API server:
```bash
npm start
```
*The server will launch on `http://localhost:5000`.*

### 3. Application Access
Open your web browser and navigate to:
```
http://localhost:5000
```

---

## 🔑 System Authentication (Role-Based Access)

The system enforces strict Role-Based Access Control (RBAC). Passwords are cryptographically hashed using `bcrypt`. For testing and demonstration, use the following pre-configured accounts:

| Username | Role | Password |
|----------|------|----------|
| `admin` | System Administrator | `admin123` |
| `dr_kamal` | Doctor (Cardiology) | `admin123` |
| `dr_layla` | Doctor (Neurology) | `admin123` |
| `receptionist1` | Receptionist | `admin123` |
| `labtech1` | Lab Technician | `admin123` |
| `pharmacist1` | Pharmacist | `admin123` |
| `accountant1` | Accountant | `admin123` |

---

## ✨ Architectural Highlights & Features

### 🗄️ Robust Database Architecture (MySQL 8.0)
- **3NF Normalization:** 19 highly optimized tables, strictly adhering to Third Normal Form to eliminate data redundancy.
- **Data Integrity & Constraints:** 
  - Advanced `CHECK` constraints prevent logical errors (e.g., future Dates of Birth, invalid medication strengths, underage employees).
  - Pharmaceutical integrity enforcement prevents negative inventory balances and enforces unit-cost vs retail-price validation.
- **Programmability:** Features **11 Stored Procedures**, **4 User-Defined Functions**, and **8 Triggers** to handle complex, transactional business logic (e.g., double-booking prevention, automated billing triggers) directly at the database layer.
- **Reporting & Views:** **7 distinct SQL Views** power the frontend analytics dashboards, aggregating patient demographics, clinical activity, and financial revenue.

### 💻 High-Performance Backend (Node.js & Express)
- **RESTful API:** Clean, structured REST architecture supporting all CRUD operations across clinical and operational modules.
- **Stateless Authentication:** Secure JWT (JSON Web Token) authentication layer ensuring stateless, scalable session management.
- **Server-Side Validation:** Double-layer validation architecture catches schema violations before database insertion, guaranteeing application stability.

### 🌐 Dynamic User Interface (Vanilla JS)
- **Single Page Application:** Lightweight, lightning-fast DOM manipulation without heavyweight frameworks.
- **Responsive Dashboard:** Fully adaptive grid layout using modern CSS variables and scalable vector icons (Lucide).
- **Intelligent Search:** Frontend debouncing algorithms optimize real-time search queries for patients, doctors, and medicines, reducing server load.

---

## 🏗️ Project Structure

```
Hospital MYSQL Databse/
├── Hospital_Management_System.sql   # Core Database Schema & Logic
├── run_mysql.bat                    # One-click Windows Database Importer
├── README.md                        # Project Documentation
├── project_report.md                # Academic Submission Report
├── Hospital_Management_System_Report.docx # Formatted Submission Report
├── Hospital_System_Demo.pptx        # Interactive Scenario Walkthrough Presentation
│
├── backend/                         # Node.js Server Environment
│   ├── server.js                    # Core application entry
│   ├── db.js                        # MySQL connection pooling
│   └── routes/                      # API routing modules (auth, patients, billing, etc.)
│
└── frontend/                        # Web Application Interface
    ├── index.html                   # Master UI shell
    ├── css/style.css                # Global stylesheet
    └── js/                          # Application logic modules
```

---

## 🏫 Academic Context

- **Domain:** Database Systems Design & Implementation
- **Focus:** Relational Database Theory, Transaction Management, Stored Procedures & Triggers, Full-Stack Integration.

---

## 📄 License
Released for academic and educational evaluation.
