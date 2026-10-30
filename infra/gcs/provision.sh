#!/usr/bin/env bash
# Provisions the shared Google Cloud Storage layer for the TNPSC ecosystem
# (retrieval engine, content-labelling/content-engine, and the yash-tnpsc
# platform) in the "yash" GCP project.
#
# Run this yourself after `gcloud auth login` and `gcloud config set project yash`
# -- this session has no GCP credentials or gcloud CLI, so it cannot run this
# directly. Review every command before running; nothing here is destructive
# to existing resources (buckets are created, not deleted), but it does
# create real, billable cloud resources.
#
# Usage: PROJECT_ID=yash ./provision.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-yash}"
REGION="${REGION:-asia-south1}"   # Mumbai -- closest GCP region to Tamil Nadu

echo "== Enabling required APIs on project ${PROJECT_ID} =="
gcloud config set project "${PROJECT_ID}"
gcloud services enable storage.googleapis.com iam.googleapis.com --project "${PROJECT_ID}"

# ---------------------------------------------------------------------------
# Buckets: one per environment. Object layout inside each bucket:
#   01-source/        immutable raw material (official/government/books/...)
#   02-retrieval/      discovery/download pipeline working state
#   03-processing/     extraction/cleaning/classification/evidence artifacts
#   04-labelling/      annotation, curriculum mapping, review, approved
#   05-publication/    manifests + released lesson/MCQ assets
#   06-archive/        superseded/rejected material, kept not deleted
# Prefixes are created lazily on first upload (GCS has no real directories);
# nothing to provision for them here.
# ---------------------------------------------------------------------------
declare -A BUCKETS=(
  [dev]="tnpsc-dev-materials"
  [staging]="tnpsc-staging-materials"
  [production]="tnpsc-production-materials"
)

for env in "${!BUCKETS[@]}"; do
  bucket="${BUCKETS[$env]}"
  echo "== Creating bucket gs://${bucket} (${env}) =="
  gcloud storage buckets create "gs://${bucket}" \
    --project "${PROJECT_ID}" \
    --location "${REGION}" \
    --uniform-bucket-level-access \
    --public-access-prevention

  # Object versioning: required for the "immutable source" rule -- a
  # re-uploaded object with the same name gets a new generation instead of
  # silently overwriting the previous one.
  gcloud storage buckets update "gs://${bucket}" --versioning

  # Soft-delete / retention keeps accidental deletes recoverable for 30 days.
  gcloud storage buckets update "gs://${bucket}" --soft-delete-duration=30d
done

# ---------------------------------------------------------------------------
# Service accounts: one per system, least privilege. No service gets
# Storage Admin on any bucket.
# ---------------------------------------------------------------------------
declare -A SERVICE_ACCOUNTS=(
  [tnpsc-retrieval-sa]="Content Retrieval Engine"
  [tnpsc-labelling-sa]="Content Labelling / Intelligence Engine"
  [tnpsc-platform-sa]="Yash TNPSC Platform"
)

for sa in "${!SERVICE_ACCOUNTS[@]}"; do
  echo "== Creating service account ${sa} =="
  gcloud iam service-accounts create "${sa}" \
    --project "${PROJECT_ID}" \
    --display-name "${SERVICE_ACCOUNTS[$sa]}" || echo "  (already exists, skipping)"
done

sa_email() { echo "$1@${PROJECT_ID}.iam.gserviceaccount.com"; }

# IAM is granted per bucket using Storage's own object-level roles rather
# than project-wide roles, so compromising one service account does not
# expose the other systems' buckets.
grant() {
  local bucket="$1" sa="$2" role="$3"
  gcloud storage buckets add-iam-policy-binding "gs://${bucket}" \
    --member "serviceAccount:$(sa_email "${sa}")" \
    --role "${role}"
}

for env in "${!BUCKETS[@]}"; do
  bucket="${BUCKETS[$env]}"
  echo "== IAM bindings for gs://${bucket} =="

  # Retrieval engine: writes source + retrieval-stage objects, reads its own
  # prior writes (dedup/resume). It never needs to read labelling/publication
  # output or write there.
  grant "${bucket}" tnpsc-retrieval-sa "roles/storage.objectCreator"
  grant "${bucket}" tnpsc-retrieval-sa "roles/storage.objectViewer"

  # Labelling/content-intelligence engine: reads source + retrieval output,
  # writes processing/labelling/publication-manifest objects.
  grant "${bucket}" tnpsc-labelling-sa "roles/storage.objectViewer"
  grant "${bucket}" tnpsc-labelling-sa "roles/storage.objectCreator"

  # Platform: read-only, and only ever reads approved publication assets in
  # application code (enforced at the app layer, not by IAM, since IAM here
  # can't distinguish 05-publication/ from 01-source/ without per-prefix
  # conditions -- see the note below).
  grant "${bucket}" tnpsc-platform-sa "roles/storage.objectViewer"
done

cat <<'EOF'

== Done ==

IMPORTANT follow-up (not automated here, do it deliberately once real data exists):
Grant tnpsc-platform-sa IAM with a conditional binding restricted to the
05-publication/ prefix instead of the whole bucket, e.g.:

  gcloud storage buckets add-iam-policy-binding gs://tnpsc-production-materials \
    --member "serviceAccount:tnpsc-platform-sa@PROJECT.iam.gserviceaccount.com" \
    --role "roles/storage.objectViewer" \
    --condition='expression=resource.name.startsWith("projects/_/buckets/tnpsc-production-materials/objects/05-publication/"),title=publication-only'

and then remove the broader binding this script granted. The broader
binding above is a deliberate placeholder so the platform works at all
during early integration -- tighten it before any real learner-facing
material goes through this pipeline.

Next: for each service account, create a JSON key (or better, use Workload
Identity Federation if these run on GCP/Cloud Run/GKE instead of a VM you
control) and store it as a secret, never commit it:

  gcloud iam service-accounts keys create tnpsc-retrieval-sa.json \
    --iam-account "$(sa_email tnpsc-retrieval-sa)"
EOF
