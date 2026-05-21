# ReDevice — Run Procedure

First-time setup guide. Follow these steps in order.

## Prerequisites

- **Node.js** ≥ 20.x — [nodejs.org](https://nodejs.org)
- **Python** ≥ 3.11 — [python.org](https://python.org)
- **Git** — [git-scm.com](https://git-scm.com)

---

## 1. Frontend Setup

```bash
# Navigate to the web app
cd apps/web

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

**Available scripts:**

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## 2. Python Environment Setup

```bash
# From project root
cd /path/to/CPE028_Project

# Create virtual environment
python -m venv cpe028

# Activate it
# Windows (CMD):
cpe028\Scripts\activate
# Windows (PowerShell):
cpe028\Scripts\Activate.ps1
# macOS / Linux:
source cpe028/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# If using the scraper, install Playwright browsers
playwright install
```

**To deactivate:** run `deactivate`

---

## 3. Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your actual values
# Required for Iteration 2+:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
```

Iteration 1 works without any `.env` — all data is local/hardcoded.

---

## 4. Verify Everything Works

### Frontend

```bash
cd apps/web
npm run dev
```

Open http://localhost:5173. You should see:
- Home page with hero section
- Navigate to Assess → fill form → see score
- Navigate to Navigate → see roadmap steps
- Navigate to Connect → see map with pins

### Python

```bash
python -c "import fastapi, sklearn, supabase; print('All packages OK')"
```

---

## 5. Project Structure Quick Reference

```
CPE028_Project/
├── apps/
│   ├── web/              # React + Vite frontend
│   │   └── src/
│   │       ├── modules/  # assess / navigate / connect
│   │       ├── components/
│   │       └── types/
│   └── ml/               # FastAPI ML service (Iteration 4+)
├── scraper/              # Data scraping scripts (Iteration 4+)
├── supabase/             # DB migrations (Iteration 2+)
├── requirements.txt      # Python dependencies
└── cpe028/               # Python virtual environment (gitignored)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails | Delete `node_modules` + `package-lock.json`, retry |
| Python venv fails | `apt install python3-venv` (Ubuntu) or use `py -m venv` (Windows) |
| Leaflet map not showing | Check that `leaflet.css` is loaded in `index.html` |
| TypeScript errors | Run `npm run build` to see full type-check output |
