# CPE028
Project files for CPE028 (Developing Applications and Automation)

## Vercel Deployment

This repository is configured to deploy the Vite app in `apps/web` via Vercel.

### Local build check

```bash
npm --prefix apps/web ci
npm --prefix apps/web run build
```

### Vercel project setup

1. Import this GitHub repo into Vercel.
2. Keep build settings as `vercel.json` defaults (already committed).
3. Add environment variables from `.env.example`.

### GitHub Actions secrets

Set these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Workflows:

- CI: `.github/workflows/ci.yml`
- Production deploy on `main`: `.github/workflows/deploy.yml`
