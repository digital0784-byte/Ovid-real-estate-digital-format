# Firebase Firestore Security Specification

This document details the data invariants, threat model ("Dirty Dozen" payloads), and rules configuration for the OVID Biometric Attendance & Overtime Management module.

## 1. Data Invariants
* **Roster Enrollment**: Every worker record must have a unique `id` and must represent an active or inactive status. Only authorized timekeepers and administrators can write/modify employee entries.
* **Attendance Security**: Attendance entries require validation of biometric type and authorized geographic boundaries.
* **Overtime Accounting**: Regular working hours must not exceed standard limits without explicit calculation and approval. Overtime rules must restrict client-side value spoofing.
* **Audit Trail Immutability**: Logs stored in the `auditLogs` collection are write-once and can never be updated or deleted.

## 2. The "Dirty Dozen" Malicious Payloads
Here are 12 specific payloads attempting to violate security boundaries, which are strictly blocked by the Firestore rules engine:

1. **Self-Assigned Timekeeper Role**: A client attempting to register their account with administrative timekeeping permissions.
2. **Ghost Worker Injection**: Registering an employee with a forged ID that skips standard sequence checks.
3. **Ghost Verification Override**: Forcing a check-in record without biometric credentials (e.g. `fingerprint` set to false but `method` set to "Fingerprint").
4. **GPS Geofence Spoofing**: Submitting coordinates far outside the site boundary (e.g., coordinates in the middle of the ocean).
5. **Backdated Check-In**: Forging `date` or `checkIn` times to claim unearned wages.
6. **Double Check-In Collision**: Attempting to submit multiple check-ins for the same day.
7. **Negative Break Time Allocation**: Injecting negative values for `breakTime` to artificially inflate net working hours.
8. **Malicious Overtime Inflation**: Submitting a manual checkout payload claiming 14 hours of overtime for standard shifts.
9. **Log Tempering / Deletion**: Client attempting to delete security audit logs.
10. **Unauthenticated Read Scrapes**: Accessing other workers' private contact or phone data without authorization.
11. **Shadow Field Injection**: Appending a ghost field like `bonusRate: 500` to an attendance record.
12. **Status Privilege Escalation**: A worker altering their performance score level to "Excellent" directly from their user agent.

## 3. Security Rules Outline
Our final ruleset ensures:
* Complete catch-all read/write denial.
* Attribute-Based Access Control (ABAC) using roles retrieved dynamically.
* Explicit validation helpers for `isValidWorker`, `isValidAttendanceRecord`, `isValidPerformanceEvaluation`, and `isValidAuditLog`.
* Atomic transaction constraints using `exists` and validation diffing.
