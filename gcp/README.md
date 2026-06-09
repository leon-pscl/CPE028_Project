# GCP Cloud Run Deployment

## One-time setup

1. **Create a GCP project** at https://console.cloud.google.com
2. **Enable billing** (required for Cloud Run, even on free tier)
3. **Enable APIs:**
   ```bash
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
   ```
4. **Create a service account:**
   ```bash
   gcloud iam service-accounts create github-actions --display-name="GitHub Actions"
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/serviceusage.serviceUsageConsumer"
   ```
5. **Create a JSON key:**
   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
   ```
6. **Add to GitHub:** Settings → Secrets → `GCP_SA_KEY` → paste the JSON key contents

## Deploy manually

```bash
gcloud builds submit --config gcp/cloudbuild.yaml .
```

## Deploy via GitHub Actions

The `.github/workflows/deploy-ml.yml` workflow triggers on pushes to `main` that touch `ml/**`. It:
1. Authenticates with GCP using `GCP_SA_KEY`
2. Runs `gcloud builds submit` which builds, pushes, and deploys

## Get your ML service URL

After deployment:
```bash
gcloud run services describe revtech-ml --region=asia-southeast1 --format='value(status.url)'
```

Set this URL as `VITE_ML_SERVICE_URL` in:
- `.env` (local development)
- Vercel dashboard → Settings → Environment Variables

## Free tier limits

- 2M requests/month
- 360,000 vCPU-seconds/month
- 240 GiB-seconds/month

For typical demo usage (<50 assessments/day), you'll stay well within the free tier.
