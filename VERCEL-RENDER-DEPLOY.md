# Deploy: Frontend on Vercel, Backend + Python Bot on Render

This guide walks you through deploying the PDF Generator with:

- **Vercel** – Next.js frontend
- **Render** – Node.js API (backend) + Python Telegram bot (background worker)

## Project structure (monorepo)

| Path | Purpose | Deploy to |
|------|---------|-----------|
| **Repo root** | Next.js app: `app/`, `components/`, `lib/`, `hooks/`, `public/`, `package.json`, `next.config.mjs` | **Vercel** (Root Directory = default / repo root) |
| **backend/** | Node API + Python Telegram bot: `src/`, `telegram_bot.py`, `package.json`, `requirements.txt` | **Render** (Root Directory = `backend`) |

Everything for the frontend is at repo root; nothing is under `src/` or a `frontend/` folder.

**Database:** The backend uses **SQLite** (file `backend/data.db`). **No Supabase or database URL** is required. If you later add Supabase/Postgres, you would configure that in the backend only.

---

## Where is data stored when hosted?

| Where        | What runs there        | Where data lives |
|-------------|------------------------|------------------|
| **Vercel**  | Frontend (Next.js) only | **No data.** The site is static/SSR; it only calls the Render API. No DB, no file storage. |
| **Render (API)** | Node backend (templates, documents, PDFs) | **SQLite file** `data.db` and uploads in the service’s filesystem. |

**Important (Render):** By default, Render’s filesystem is **ephemeral**. On every **restart or redeploy**, the SQLite file and uploads are reset. Documents and templates will not persist unless you add a **persistent disk**:

1. In the **Render Dashboard** → your **pdf-generator-api** service → **Disks** → add a disk (e.g. mount path `/data`, size 1 GB).
2. In the same service → **Environment** → add `DATA_PATH=/data`.
3. Redeploy. The backend will store `data.db` (and can store uploads under `/data`) so they survive restarts and redeploys.

If you do **not** add a disk, the app still runs, but all documents and templates are lost on each deploy or restart.

## Prerequisites

- GitHub (or GitLab) repo with this project
- [Vercel](https://vercel.com) account
- [Render](https://render.com) account
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

---

## 1. Deploy backend + Python bot on Render

### Option A: Using the Blueprint (recommended)

1. In [Render Dashboard](https://dashboard.render.com), click **New** → **Blueprint**.
2. Connect your repo and select the one that contains this project.
3. Render will detect `render.yaml` and create two services:
   - **pdf-generator-api** (Web Service, Node)
   - **pdf-generator-telegram-bot** (Background Worker, Python)
4. After the first deploy, set **environment variables** for both services (see below).

### Option B: Manual setup

**Backend (Web Service)**

- **New** → **Web Service**
- Connect repo, set **Root Directory** to `backend`
- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- Add env: `FRONTEND_URL` = `https://your-app.vercel.app` (set after Vercel deploy)
- Deploy and note the URL, e.g. `https://pdf-generator-api.onrender.com`

**Telegram bot (Background Worker)**

- **New** → **Background Worker**
- Same repo, **Root Directory** `backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `python telegram_bot.py`
- Add env vars:
  - `TELEGRAM_BOT_TOKEN` = your bot token from BotFather
  - `API_URL` = `https://pdf-generator-api.onrender.com/api`
  - `TELEGRAM_SERVER_URL` = `https://pdf-generator-api.onrender.com/api`
  - `FRONTEND_URL` = `https://your-app.vercel.app`

### Required env vars on Render

| Variable              | Where        | Example / note                                      |
|-----------------------|-------------|-----------------------------------------------------|
| `FRONTEND_URL`        | API service | `https://your-app.vercel.app`                        |
| `TELEGRAM_BOT_TOKEN`  | Bot worker  | From @BotFather                                     |
| `API_URL`             | Bot worker  | `https://pdf-generator-api.onrender.com/api`        |
| `TELEGRAM_SERVER_URL` | Bot worker  | Same as `API_URL`                                   |
| `FRONTEND_URL`        | Bot worker  | Same as API’s `FRONTEND_URL`                        |

**Note:** On free tier, the backend may spin down after inactivity; the first request after that can be slow. The Python worker runs continuously.

---

## 2. Deploy frontend on Vercel

1. In [Vercel](https://vercel.com), **Add New** → **Project** and import your repo.
2. **Root Directory:** leave as **repo root** (default). The Next.js app is at the repo root:
   - `app/` – pages and layout
   - `components/`, `lib/`, `hooks/` – frontend code
   - `public/` – static assets
   - `package.json`, `next.config.mjs` – config
   - Do **not** set a subdirectory (e.g. don’t use `frontend` or `src`).
3. **Build command:** `npm run build` (default for Next.js).
4. **Environment variables** (add before or after first deploy):

   | Name                      | Value                                           |
   |---------------------------|--------------------------------------------------|
   | `NEXT_PUBLIC_API_URL`     | Your Render API URL, e.g. `https://pdf-generator-api-a0m8.onrender.com` or `.../api` (both work) |
   | `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` | Your Telegram bot token (optional; for “Send to Telegram” from UI) |

5. Deploy. Note the frontend URL, e.g. `https://myplate.vercel.app`.

---

## 3. Point everything to the live URLs

1. **Render – API service:** set `FRONTEND_URL` to your Vercel URL (e.g. `https://myplate.vercel.app`).
2. **Render – Bot worker:** set `FRONTEND_URL` to the same; set `API_URL` and `TELEGRAM_SERVER_URL` to your API base + `/api` (e.g. `https://pdf-generator-api-a0m8.onrender.com/api`).
3. **Vercel:** set `NEXT_PUBLIC_API_URL` to your Render API URL. You can use either the base URL (e.g. `https://pdf-generator-api-a0m8.onrender.com`) or with `/api`; the frontend normalizes to `/api` for all requests.
4. Redeploy the Render services if you changed env vars so they pick up the new values. Redeploy Vercel if you changed `NEXT_PUBLIC_API_URL`.

---

## 4. Optional: “Send to Telegram” from the web UI

If you want the **Send to Telegram** button on the site to work, set `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` in Vercel to the same bot token.  
Because this value is exposed in the client, prefer a bot used only for this app and revoke it if the token is ever leaked.

---

## Summary

- **Frontend (Vercel):** `NEXT_PUBLIC_API_URL` → Render API URL + `/api`.
- **Backend (Render Web Service):** serves `/api` (templates, documents, PDF, `/api/telegram` webhook and form-data).
- **Python bot (Render Worker):** polls Telegram, calls backend `API_URL` and `TELEGRAM_SERVER_URL` (same backend), uses `FRONTEND_URL` in messages.
- The old standalone “telegram server” (port 3003) is not needed in this setup; the main backend serves `/api/telegram` (webhook + form-data).

For local development, keep using `NEXT_PUBLIC_API_URL=http://localhost:3002/api` and run the backend and bot as before (e.g. from `backend/` with `npm run dev` and `python telegram_bot.py`).

---

## Data management when everything is online

| Where | What runs | Where data lives |
|-------|-----------|------------------|
| **Vercel** | Next.js frontend only | **No data.** The site only calls the Render API. No database, no file storage. |
| **Render – pdf-generator-api** | Node backend (templates, documents, PDFs, `/api/health`, `/api/telegram`) | **SQLite** `data.db` and uploaded files in the service filesystem. |
| **Render – pdf-generator-telegram-bot** | Python Telegram bot | No persistent data; it calls the API and Telegram. |

**Without a persistent disk (default):** Render’s filesystem is ephemeral. On each **restart or redeploy** of the API service, `data.db` and uploads are lost. The app works; documents and templates just don’t persist.

**To persist data:** In Render Dashboard → **pdf-generator-api** → **Disks** → add a disk (e.g. mount path `/data`, 1 GB). In the same service → **Environment** → add `DATA_PATH=/data`. Redeploy. The backend will store `data.db` and uploads under `/data` so they survive restarts and redeploys. Only the **API** service uses this disk; the Telegram bot does not access `/data`—it only calls the API. If the bot says "Template not found", the API’s database has no such template (upload templates via the web app, which uses the same API).

**Backup and restore:** For a single database and one place for all stored files (so you can keep consistency from where you left off offline/online), see **[DATA-BACKUP-RESTORE.md](./DATA-BACKUP-RESTORE.md)**. It explains where data lives, how to backup `data.db` and `uploads/`, and how to restore or move that data.

**Checklist when everything is online:**

1. **Vercel** – `NEXT_PUBLIC_API_URL` = your Render API URL (e.g. `https://pdf-generator-api-a0m8.onrender.com`).
2. **Render API** – `FRONTEND_URL` = your Vercel URL (e.g. `https://myplate.vercel.app`).
3. **Render Bot** – `API_URL` and `TELEGRAM_SERVER_URL` = API URL + `/api`; `FRONTEND_URL` = same as above; `TELEGRAM_BOT_TOKEN` = from BotFather.
4. Backend exposes **`/health`** and **`/api/health`**; the frontend calls `API_URL` (normalized to `/api`) + `/health` → `.../api/health`. If the page shows “Unable to connect”, confirm the Render API service is running and the URL in Vercel env is correct.
5. Optional: add a **Persistent Disk** to the API service and set `DATA_PATH` to keep data across deploys.
