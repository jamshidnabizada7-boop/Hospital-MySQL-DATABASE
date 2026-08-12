# E2E Test Infra: Hospital Management System

## Test Philosophy
- Requirement-driven, automated API & integration testing.
- Methodology: 4-Tier Testing (Tier 1: Feature Coverage, Tier 2: Boundary & Edge Cases, Tier 3: Pairwise Combinations, Tier 4: Real-World Workloads).

## Feature Inventory & Test Coverage
| # | Feature | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|:------:|:------:|:------:|:------:|
| 1 | Auth & RBAC | 5 | 5 | ✓ | ✓ |
| 2 | Patients Module | 5 | 5 | ✓ | ✓ |
| 3 | Doctors & Schedules | 5 | 5 | ✓ | ✓ |
| 4 | Appointments Module | 5 | 5 | ✓ | ✓ |
| 5 | Billing & Payments | 5 | 5 | ✓ | ✓ |
| 6 | Pharmacy & Inventory | 5 | 5 | ✓ | ✓ |
| 7 | Laboratory Orders | 5 | 5 | ✓ | ✓ |
| 8 | Reports & Notifications | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Runner: PowerShell test scripts (`test_api.ps1`, `test_roles.ps1`) executing HTTP REST calls against local server `http://localhost:5000`.
- Expected Outcome: Exit code 0, 100% assertions passing.

## Test Verification Commands
- API functional suite: `powershell -ExecutionPolicy Bypass -File test_api.ps1`
- RBAC security matrix suite: `powershell -ExecutionPolicy Bypass -File test_roles.ps1`
