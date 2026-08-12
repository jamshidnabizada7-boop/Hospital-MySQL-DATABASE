# DISPATCH — Worker 2 (Milestone 3: Code Quality & Security Refactoring)

## Task Objective
Execute Code Quality and Security Audit / Remediation across `backend/` and `frontend/` (Requirement R2).
1. Ensure 100% of database queries use parameterized SQL (`pool.execute` / `pool.query` with `?` place-holders).
2. Ensure strict authorization / permission checks (`authenticate`, `adminOr`, role check logic) on all routes.
3. Fix any broken API endpoints, unhandled exceptions, invalid status codes, or crash bugs.
4. Ensure backend Node.js server starts cleanly and passes all functional and security tests.

## Context & Inputs
- Original Request: `d:\Hospital MYSQL Databse\.agents\ORIGINAL_REQUEST.md`
- Architecture & Spec: `d:\Hospital MYSQL Databse\.agents\spec_miner_3\handoff.md`
- Working Directory: `d:\Hospital MYSQL Databse\.agents\worker_m3`

## Target Files
1. `backend/server.js`
2. `backend/db.js`
3. `backend/middleware/auth.js`
4. `backend/routes/*.js`
5. `frontend/js/*.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Output Requirements
Implement changes in target files. Run `powershell -ExecutionPolicy Bypass -File test_api.ps1` and `powershell -ExecutionPolicy Bypass -File test_roles.ps1`. Report findings and build/test status in `d:\Hospital MYSQL Databse\.agents\worker_m3\handoff.md`.
