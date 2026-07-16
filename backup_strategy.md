# OVID Construction ERP - Firestore Backup & Disaster Recovery (DR) Strategy

This document outlines the backup, retention, and disaster recovery strategy for the OVID ERP Firestore Database.

## 1. Automatic Nightly Backups (Cloud Scheduler + Cloud Function)

We employ a completely automated, serverless export process utilizing **Cloud Scheduler**, **Cloud Pub/Sub**, and a specialized administrative **Cloud Function**.

### High-Level Architecture
1. **Trigger**: Cloud Scheduler fires a cron job every night at `02:00 EAT` (East Africa Time) to coordinate with low-activity site hours.
2. **Payload**: The cron job triggers a Cloud Pub/Sub topic `firestore-backup-trigger`.
3. **Execution**: A Cloud Function receives the event and initiates an asynchronous export request using the Google Cloud Firestore Admin API.
4. **Target Destination**: Files are dumped in a locked, cold-class Google Cloud Storage (GCS) bucket: `gs://ovid-erp-database-backups/daily-snapshots/`.

---

## 2. Retention Policy & Storage Tiering

To balance compliance tracking audits with infrastructure hosting costs, backups are tier-rotated:

| Snapshot Type | Frequency | Storage Class | Retention Period | Description |
|---|---|---|---|---|
| **Daily** | Every 24 hours | Standard | 30 Days | For immediate point-of-recovery queries. |
| **Weekly** | Every Sunday | Nearline | 12 Weeks | Mid-term disaster rollbacks. |
| **Monthly** | 1st of every month | Coldline | 1 Year | Fiscal and HR compliance backups. |
| **Annual** | 1st of January | Archive | 7 Years | Permanent tax and organizational roster ledger. |

---

## 3. Point-in-Time Recovery (PITR)

OVID Construction ERP Firestore database instances have **Point-in-Time Recovery (PITR)** enabled.
- **Enabled Duration**: 7 days.
- **Granularity**: Any second inside the past 7 days.
- **Recovery Command**:
  ```bash
  gcloud firestore databases restore \
    --database='(default)' \
    --destination-database='restored-db-instance' \
    --restore-time='2026-07-14T15:30:00Z'
  ```

---

## 4. Manual Dump & Emergency Rollback Procedures

### Manual Snapshot Export (via gcloud SDK)
In the event of critical server migrations, database schema updates, or custom software releases, supervisors can initiate a manual snapshot:
```bash
gcloud firestore export gs://ovid-erp-database-backups/manual-snapshots/pre-migration-$(date +%F)/
```

### Full System Restore
To overwrite the active production database with a verified snapshot:
```bash
gcloud firestore import gs://ovid-erp-database-backups/daily-snapshots/2026-07-15/
```

---

## 5. Security & Isolation Controls
- **KMS Encryption**: All backup GCS buckets are encrypted using customer-managed encryption keys (CMEK) via Google Cloud Key Management Service.
- **Separation of Concerns**: Backup buckets reside in a distinct, locked Google Cloud Project isolated from standard developer access credentials.
- **IAM Policies**: Standard engineers are locked out of backup buckets. Only `Super Admin` and `Security Officers` possess bucket read permissions.
