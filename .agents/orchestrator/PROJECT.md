# Project: Hospital Management System QA & Polish

## Architecture
- **Full-stack Monolith**: Node.js Express backend serving REST API routes (`/api/*`) and static SPA frontend (`index.html`).
- **Database**: MySQL 8.0 connection pool (`backend/db.js`) with UTF8MB4 encoding, connection limits, and transaction locks (`FOR UPDATE`).
- **Authentication & RBAC**: JWT Bearer token authentication with role-based middleware (`adminOr`, `authenticate`) in `backend/middleware/auth.js`.
- **Frontend SPA**: Vanilla JavaScript modules using `lucide` SVG icon library and asynchronous `fetch` wrappers (`api.js`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Auth - User Login | Authenticates user credentials & issues signed JWT token | M3 | survey |
| 2 | Auth - Current User Profile | Retrieves active user identity and role from JWT token | M3 | survey |
| 3 | Dashboard Overview | Aggregates hospital counts, revenue, appointments & dept stats | M3 | survey |
| 4 | Patient Registry List | Paginated active patient list with search filter | M3 | survey |
| 5 | Register Patient | Registers new patient in master registry | M3 | survey |
| 6 | Edit Patient | Updates patient demographic and contact info | M3 | survey |
| 7 | Deactivate Patient | Soft deletes patient (Is_Active=0) | M3 | survey |
| 8 | Patient Medical History | Complete appointment and medical record timeline | M3 | survey |
| 9 | Doctor Directory | Directory of active doctors with dept, specialization, fee | M3 | survey |
| 10 | Add Doctor | Creates new doctor entry with department & specialization links | M3 | survey |
| 11 | Update Doctor | Updates doctor profile with role field restrictions | M3 | survey |
| 12 | Doctor Schedule | Work date schedule and time slot generator | M3 | survey |
| 13 | Appointment List | Retrieves appointments with role/date/status filtering | M3 | survey |
| 14 | Available Slots Lookup | Open time slots for doctor on date | M3 | survey |
| 15 | Book Appointment | Atomic slot lock and appointment creation | M3 | survey |
| 16 | Cancel Appointment | Cancels appointment and reopens time slot | M3 | survey |
| 17 | Complete Appointment | Marks completed & creates initial medical record | M3 | survey |
| 18 | Billing List | Displays invoices with status filters | M3 | survey |
| 19 | Generate Bill | Creates invoice for appointment calculating fees & taxes | M3 | survey |
| 20 | Process Payment | Records payment against bill updating balance/status | M3 | survey |
| 21 | Pharmacy Catalog | Displays medicines with inventory stock & expiry | M3 | survey |
| 22 | Add/Edit Medicine | Manages medicine records, generic names, pricing | M3 | survey |
| 23 | Inventory Management | Tracks batch numbers, expiry dates, stock adjustments | M3 | survey |
| 24 | Lab Orders | Doctor orders tests; Lab Tech views/updates status | M3 | survey |
| 25 | Record Lab Result | Records test outcome, flags abnormal values | M3 | survey |
| 26 | Medical Prescriptions | Multi-item drug prescriptions for medical records | M3 | survey |
| 27 | Reports Analytics | Financial summaries, appointment stats, inventory alerts | M3 | survey |
| 28 | Notification Monitor | Alert counts for unpaid bills, abnormal labs, low stock | M3 | survey |
| 29 | UI Emoji Eradication | Replaces legacy emojis with Lucide SVGs in index.html & JS | M2 | survey |
| 30 | Lucide Lifecycle Helper | Automatic lucide.createIcons() in dynamic setHTML() | M2 | survey |
| 31 | Test Suite & Harness | Comprehensive automated E2E & integration test suite | M1 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | E2E Testing Suite | Create test infrastructure, runner, and test cases | none | DONE |
| M2 | Emoji Eradication & Icon Integration | Eradicate all emojis in index.html & frontend/js/*.js (R1) | M1 | DONE |
| M3 | Backend & Frontend Quality & Stability | Audit routes, parameterization, permission checks, errors (R2) | M1 | DONE |
| M4 | Final E2E Validation & Hardening | Run 100% test suite, verify acceptance criteria | M2, M3 | DONE |

## Interface Contracts
### Client ↔ Server API Contract
- Header: `Authorization: Bearer <jwt_token>`
- Response Format: `{ success: boolean, data?: any, message?: string, error?: string }`
- HTTP Status Codes: 200 (Success), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Internal Error).

## Code Layout
- `backend/server.js`: Express entry point and static file server.
- `backend/db.js`: MySQL connection pool manager.
- `backend/middleware/auth.js`: Authentication & RBAC middleware (`authenticate`, `adminOr`).
- `backend/routes/*.js`: Modular API route controllers.
- `frontend/index.html`: SPA HTML shell and modal dialogs.
- `frontend/js/utils.js`: Helper functions and DOM lifecycle renderer.
- `frontend/js/*.js`: Client-side domain controllers (`patients.js`, `doctors.js`, etc.).
