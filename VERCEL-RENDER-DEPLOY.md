# Deploy: Frontend on Vercel, Backend + Python Bot on Render

This guide walks you through deploying the PDF Generator with:

- **Vercel** – Next.js frontend
- **Render** – Node.js API (backend) + Python Telegram bot (background worker)

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
2. **Root Directory:** leave as repo root (where `package.json` and `app/` live).
3. **Build command:** `npm run build` (default for Next.js).
4. **Environment variables** (add before or after first deploy):

   | Name                      | Value                                           |
   |---------------------------|--------------------------------------------------|
   | `NEXT_PUBLIC_API_URL`     | `https://pdf-generator-api.onrender.com/api`    |
   | `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` | Your Telegram bot token (optional; for “Send to Telegram” from UI) |

5. Deploy. Note the frontend URL, e.g. `https://your-app.vercel.app`.

---

## 3. Point everything to the live URLs

1. **Render – API service:** set `FRONTEND_URL` to your Vercel URL (e.g. `https://your-app.vercel.app`).
2. **Render – Bot worker:** set `FRONTEND_URL` to the same; ensure `API_URL` and `TELEGRAM_SERVER_URL` are `https://pdf-generator-api.onrender.com/api`.
3. **Vercel:** ensure `NEXT_PUBLIC_API_URL` is `https://pdf-generator-api.onrender.com/api`.
4. Redeploy the Render services if you changed env vars so they pick up the new values.

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
