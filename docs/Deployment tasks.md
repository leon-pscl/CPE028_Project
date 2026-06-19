# Deployment Tasks

## Objective

Build the deployment architecture discussed for this project:

- Keep the React/Vite frontend deployed on Vercel.
- Keep Supabase as the managed backend for Auth, Postgres, Storage, REST, and RLS.
- Add a containerized FastAPI ML inference service for the Assessment page.
- Keep model training separate from production inference.

The target architecture is hybrid:

```text
Vercel frontend
→ FastAPI ML service container
→ trained model inference
→ Supabase Auth/Postgres
```

Training flow:

```text
Initial training data
→ model training container/job
→ trained model artifact
→ FastAPI inference container loads artifact
```

## Current Deployment Baseline

- Frontend deployment is Vercel.
  - Root Vercel config points to `frontend`.
  - Frontend Vercel config builds a Vite app with `npm run build`.
  - SPA rewrites route non-asset paths to `index.html`.
- Supabase is the managed database/auth layer.
  - The frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  - Auth should continue to use Supabase Auth.
- Docker Compose currently supports frontend local development only.
- The ML folder already contains a FastAPI app, Dockerfile, model code, and a model artifact.

## Design Rules

1. Do not move the frontend off Vercel unless explicitly requested.
2. Do not self-host Postgres unless explicitly requested.
3. Do not run ML inference in Vercel serverless functions.
4. Deploy ML inference as a containerized FastAPI service.
5. Keep training separate from live inference.
6. FastAPI should load the trained model at service startup, not train on request.
7. The frontend should not send raw login credentials to FastAPI.
8. The frontend should authenticate through Supabase, receive a JWT, then send that JWT to FastAPI.
9. FastAPI should verify the JWT before accepting protected assessment requests.
10. Assessment persistence should be explicit: either FastAPI writes to Supabase or the frontend calls a Supabase RPC after prediction.

## Agent Task 1: Finalize ML Inference API

Owns:

- `ml/app.py`
- `ml/model.py`
- `ml/marketplace.py` if assessment feature mapping uses it
- `ml/README.md`

Tasks:

1. Expose a `POST /predict` endpoint for Assessment page classification.
2. Define a request schema for assessment input using Pydantic.
3. Define a response schema with at least:
   - `classification`: `"repair"` or `"recycle"`
   - `confidence`: number from `0` to `1`
   - `model_version`: string
   - optional `rationale`: short explanation
4. Load the trained model once during application startup.
5. Keep inference deterministic and side-effect free unless persistence is intentionally added.
6. Add a `GET /health` endpoint for deployment health checks.
7. Ensure CORS allows only configured frontend origins in production.

Acceptance criteria:

- FastAPI starts without training the model.
- `/health` returns a simple healthy response.
- `/predict` accepts valid assessment input and returns repair/recycle classification.
- Invalid input returns a clear 4xx validation error.

## Agent Task 2: Containerize ML Inference Service

Owns:

- `ml/Dockerfile`
- `ml/requirements.txt`
- `ml/README.md`
- optional `.dockerignore` files

Tasks:

1. Ensure the Dockerfile builds a production-ready FastAPI inference image.
2. Install only runtime dependencies needed for inference.
3. Include or mount the trained model artifact predictably.
4. Start the API with Uvicorn on `0.0.0.0`.
5. Document required environment variables.
6. Document local build and run commands.

Expected container behavior:

```text
docker build -t revtech-ml ./ml
docker run --env-file .env -p 8000:8000 revtech-ml
```

Acceptance criteria:

- Container starts the FastAPI app successfully.
- `/health` works from the host machine.
- `/predict` works using the same schema as local Python execution.

## Agent Task 3: Add Local Compose Integration

Owns:

- `infra/docker-compose.yml`
- `.env.example`
- `run-procedure.md`

Tasks:

1. Add an `ml` service to Docker Compose.
2. Keep the existing `web` service for frontend development.
3. Wire the frontend to the ML service with an environment variable.
4. Use clear service names, for example:

```text
web → http://localhost:5173
ml  → http://localhost:8000
```

5. Add or update environment variables:

```text
VITE_ML_API_URL=http://localhost:8000
VITE_WEB_URL=http://localhost:5173
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
```

6. Document local startup:

```text
docker compose -f infra/docker-compose.yml up --build
```

Acceptance criteria:

- Compose starts both frontend and ML services.
- Frontend can call the local ML service.
- Existing frontend hot reload remains intact.

## Agent Task 4: Connect Assessment Page to ML API

Owns:

- `frontend/src/features/assess/AssessPage.tsx`
- related frontend API/helper files if added
- `.env.example`

Tasks:

1. Add `VITE_ML_API_URL` to frontend configuration.
2. On assessment submit, send normalized assessment input to `POST /predict`.
3. Include the Supabase access token as a Bearer token if the user is authenticated.
4. Handle unauthenticated behavior intentionally:
   - either allow anonymous prediction, or
   - require login before prediction.
5. Display the returned classification and confidence.
6. Add loading, error, and retry states.
7. Preserve the existing assessment UX unless a change is required for ML integration.
8. Keep the current rule-based scoring as a fallback if the ML service is unavailable, if feasible.

Expected browser request:

```text
POST ${VITE_ML_API_URL}/predict
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

Acceptance criteria:

- Assessment page can call the ML service.
- Repair/recycle result is displayed from ML response.
- Network/API errors do not crash the page.
- Missing ML URL fails clearly during development.

## Agent Task 5: Add Supabase-Aware Auth Verification

Owns:

- `ml/app.py`
- new ML auth/helper module if needed
- `ml/README.md`

Tasks:

1. Verify Supabase JWTs for protected endpoints.
2. Reject invalid or expired tokens with `401`.
3. Do not accept raw email/password credentials in the ML service.
4. Make auth behavior configurable:
   - development may allow anonymous prediction if documented
   - production should require valid JWT unless product requirements say otherwise
5. Avoid exposing service-role credentials to the frontend.

Acceptance criteria:

- Valid Supabase JWT can access protected prediction.
- Invalid JWT receives `401`.
- Auth config is documented.

## Agent Task 6: Decide Assessment Persistence Owner

Owns one of these paths after decision:

- FastAPI persistence path:
  - `ml/app.py`
  - ML Supabase helper files
  - database migrations if needed
- Supabase RPC/frontend persistence path:
  - `database/migrations/*`
  - `frontend/src/features/assess/AssessPage.tsx`
  - frontend database helper files

Decision required:

```text
Option A: FastAPI stores assessment result in Supabase.
Option B: Frontend calls Supabase RPC after ML prediction.
```

Recommended default:

Use **Option A** if the ML result and DB write must be atomic from the server side.
Use **Option B** if the app wants to keep ML inference stateless and preserve direct Supabase client patterns.

Requirements for either option:

1. Store user ID when authenticated.
2. Store assessment input summary or feature vector if allowed by privacy requirements.
3. Store classification, confidence, model version, and created timestamp.
4. Respect Supabase RLS.
5. Do not trust user-submitted classification values from the browser.

Acceptance criteria:

- Completed assessments can be persisted and associated with the correct user.
- RLS prevents users from reading or modifying other users' assessment records.
- Failed persistence is surfaced clearly to the frontend.

## Agent Task 7: Document Production Deployment

Owns:

- `README.md`
- `run-procedure.md`
- `ml/README.md`
- optional new deployment docs

Tasks:

1. Document the final production topology:

```text
Vercel frontend
Supabase managed backend
Containerized FastAPI ML service
```

2. Document recommended ML hosting options:
   - Railway
   - Render
   - Fly.io
   - Google Cloud Run
   - VPS with Docker
3. Document required production environment variables for Vercel and the ML service.
4. Document the deployment order:
   - provision Supabase
   - deploy ML service
   - configure `VITE_ML_API_URL` in Vercel
   - deploy frontend
   - verify end-to-end assessment flow
5. Document health checks and smoke tests.

Acceptance criteria:

- A new agent or developer can deploy the system from the docs without guessing the architecture.
- Docs clearly distinguish local Docker Compose from production deployment.
- Docs clearly distinguish model training from model inference.

## Agent Task 8: Support Multiple Concurrent Users

Owns:

- `ml/app.py`
- ML deployment configuration
- Supabase persistence implementation
- relevant frontend assessment request code
- deployment documentation

Goal:

Ensure the internet-deployed system can handle multiple users at the same time without mixing state, leaking data, or blocking requests unnecessarily.

Required architecture:

```text
Vercel serves frontend assets concurrently
Supabase Auth issues separate JWTs per user
FastAPI handles independent /predict requests
Supabase Postgres stores user-specific records with RLS
```

FastAPI requirements:

1. Keep the ML service stateless per request.
2. Load the trained model once at application startup.
3. Reuse the loaded model for predictions.
4. Do not store user-specific data in module-level/global variables.
5. Do not mutate the model during prediction.
6. Run inference with `torch.no_grad()` or `torch.inference_mode()` if using PyTorch.
7. Include request validation for payload size and required fields.
8. Add request timeouts where the hosting platform supports them.
9. Return clear errors for overloaded, invalid, or unauthorized requests.
10. Add rate limiting at the platform, reverse proxy, or application layer before public launch.

Concurrency behavior:

```text
User A → POST /predict → result A
User B → POST /predict → result B
User C → POST /predict → result C
```

These requests must be independent. Any container instance should be able to handle any request.

Container/runtime requirements:

1. Run Uvicorn with an appropriate worker count for the deployment size.
2. Start with a conservative worker count, for example:

```text
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 2
```

3. Validate memory usage before increasing workers, because each worker may load its own model copy.
4. Prefer horizontal scaling when traffic grows:

```text
Load balancer
→ ML container instance 1
→ ML container instance 2
→ ML container instance 3
```

5. Do not rely on local container memory for sessions, queues, or user history.

Supabase requirements:

1. Use Supabase Auth JWTs to identify users.
2. Store authenticated records with the correct `user_id`.
3. Enforce Row Level Security for user-owned assessment data.
4. Add indexes for high-traffic query paths, especially by `user_id` and `created_at`.
5. Use a Postgres function/RPC for multi-table writes that must be atomic.
6. Never trust browser-submitted user IDs or final classification values without server-side validation.

Frontend requirements:

1. Keep each browser session isolated through Supabase Auth state.
2. Send the current user's Supabase access token with protected ML requests.
3. Treat each assessment submission as an independent request.
4. Disable duplicate submits while a prediction is in progress.
5. Show loading, timeout, retry, and failure states.
6. Do not assume prediction order if multiple requests are in flight.

Acceptance criteria:

- Multiple users can submit assessments at the same time.
- Prediction results are returned to the correct browser session.
- User assessment records are stored under the correct authenticated user.
- RLS prevents users from reading or modifying other users' assessment records.
- The ML service does not keep per-user state in memory.
- The ML service can be scaled by adding more container instances.

## Recommended Final Flow

```text
User logs in through Supabase Auth
→ frontend receives Supabase JWT
→ user submits Assessment form
→ frontend sends assessment input + JWT to FastAPI
→ FastAPI verifies JWT
→ FastAPI preprocesses assessment input
→ FastAPI runs trained model inference
→ FastAPI returns repair/recycle result with confidence
→ FastAPI or Supabase RPC stores the assessment
→ frontend displays result
```

## Non-Goals

- Do not build a full custom backend to replace Supabase.
- Do not train the model during user requests.
- Do not store raw credentials in the ML service.
- Do not expose service-role keys to the frontend.
- Do not require Docker for the Vercel frontend production deployment.
- Do not treat local Docker Compose as the production deployment method.

## Quality Checks

Before handing off implementation, run the most relevant checks:

```text
frontend: npm run build
frontend: npm test, if configured
ml: start FastAPI locally and call /health
ml: call /predict with a sample payload
docker: build and run the ML image
compose: start web + ml together
```

If a check cannot run because dependencies or secrets are missing, document the blocker and the exact command that should be run after setup.
