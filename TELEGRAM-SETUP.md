# Telegram bot setup (local vs Render)

The Telegram bot works the same way locally and on Render: it talks to **one backend** that serves both the main API and the Telegram webhook/form-data.

## One backend, no separate “Telegram Server”

- **Backend (Node API)** serves:
  - Templates, documents, PDF generation
  - **`/api/telegram/webhook`** – receives form data from the bot and stores it
  - **`/api/telegram/form-data`** – the frontend calls this to get stored data (e.g. when user opens the app with `?chat_id=...`)

There is **no separate** “Telegram Server” on another port. The old `telegram-server.js` (port 3003) is not used anymore; the main backend handles everything.

## Local (3 processes)

When you run **`./start-all.ps1`**, it starts **3** things:

| # | Process | Role |
|---|---------|------|
| 1 | Backend (port 3002) | API + `/api/telegram` (webhook + form-data) |
| 2 | Telegram bot (Python) | Polls Telegram, sends data to backend at `http://localhost:3002/api` |
| 3 | Frontend (port 3000) | Next.js app; calls backend at 3002 for API and form-data |

The script sets `API_URL` and `TELEGRAM_SERVER_URL` to `http://localhost:3002/api` for the bot so it posts to the same backend the frontend uses.

## Render (2 services)

Same idea, only the backend and frontend are hosted:

| Service | Role |
|---------|------|
| **pdf-generator-api** | Backend; includes `/api/telegram` (webhook + form-data) |
| **pdf-generator-telegram-bot** | Python bot; must call the API URL for webhook and PDF |

So you only have **2** services on Render. The “missing” session is the old standalone Telegram Server (3003), which is not needed because the API service already serves `/api/telegram`.

### Required env vars for the bot on Render

On **pdf-generator-telegram-bot**, set:

- **`TELEGRAM_BOT_TOKEN`** – from [@BotFather](https://t.me/BotFather)
- **`API_URL`** – your API base + `/api`, e.g. `https://pdf-generator-api-a0m8.onrender.com/api`
- **`TELEGRAM_SERVER_URL`** – **same as `API_URL`** (bot posts webhook to the API)
- **`FRONTEND_URL`** – your frontend URL, e.g. `https://myplate.vercel.app`

If the bot doesn’t work on Render, check:

1. **API_URL** and **TELEGRAM_SERVER_URL** both point to your **Render API** URL + `/api` (no typo, no trailing slash except the path `/api`).
2. The **pdf-generator-api** service is running and healthy (e.g. `/health` returns 200).
3. **TELEGRAM_BOT_TOKEN** is set and valid.

After changing env vars, redeploy the **pdf-generator-telegram-bot** service.

### Optional: plain-text parsing (OpenAI)

If you set **`OPENAI_API_KEY`** on the bot service (Dashboard → pdf-generator-telegram-bot → Environment), users can send **plain text** with vehicle/owner info instead of JSON. The bot will:

1. Parse the text with OpenAI into the expected structure.
2. Show a preview with **Confirm** and **Edit** inline buttons.
3. **Confirm** → generate and send the PDF.
4. **Edit** → send back the JSON so the user can edit and resend.

Without `OPENAI_API_KEY`, only valid JSON is accepted (same as before).
