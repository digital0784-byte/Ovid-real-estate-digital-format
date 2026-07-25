#!/usr/bin/env bash
set -euo pipefail

# Automated Firestore Daily Backup Script
# Target Bucket: gs://ovid-erp-backups

GCP_PROJECT_ID="${GCP_PROJECT_ID:-ovid-construction-erp}"
BACKUP_BUCKET="${BACKUP_BUCKET:-gs://ovid-erp-backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_BUCKET}/firestore_backup_${TIMESTAMP}"

echo "[LOG] Starting Firestore Export for project: ${GCP_PROJECT_ID}..."
echo "[LOG] Destination: ${BACKUP_PATH}"

# Execute gcloud firestore export
gcloud firestore export "${BACKUP_PATH}" \
  --project="${GCP_PROJECT_ID}" \
  --async

echo "[SUCCESS] Firestore export operation submitted successfully to ${BACKUP_PATH}."
