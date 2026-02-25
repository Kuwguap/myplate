# Run on Render – Quick steps

Get the backend API and Telegram bot running on Render in a few minutes.

## 1. Push your code to GitHub

Your project must be in a **GitHub** (or **GitLab**) repo that Render can access.

```powershell
git add .
git commit -m "Ready for Render"
git push origin main
```

## 2. Create the services on Render

1. Open **[dashboard.render.com](https://dashboard.render.com)** and sign in.
2. Click **New** → **Blueprint**.
3. Connect your Git provider if needed, then choose the repo that contains this project (the one with `render.yaml` in the root).
4. Render will read `render.yaml` and show **2 services**:
   - **pdf-generator-api** (Web Service)
   - **pdf-generator-telegram-bot** (Background Worker)
5. Click **Apply** to create both. Render will run the first build and deploy.

## 3. Set environment variables

After the first deploy (or from each service’s **Environment** tab), set these.

### pdf-generator-api (Web Service)

| Key            | Value |
|----------------|--------|
| `FRONTEND_URL` | Your frontend URL, e.g. `https://myplate.vercel.app` or `https://your-app.vercel.app` |

### pdf-generator-telegram-bot (Background Worker)

| Key                  | Value |
|----------------------|--------|
| `TELEGRAM_BOT_TOKEN` | Your bot token from [@BotFather](https://t.me/BotFather) |
| `API_URL`            | Your API URL + `/api`, e.g. `https://pdf-generator-api.onrender.com/api` |
| `TELEGRAM_SERVER_URL`| Same as `API_URL` |
| `FRONTEND_URL`       | Same as the frontend URL you set on the API |

Get the API URL from the Render dashboard: open **pdf-generator-api** → the URL is shown at the top (e.g. `https://pdf-generator-api.onrender.com`). Use that + `/api` for both `API_URL` and `TELEGRAM_SERVER_URL`. There is no separate "Telegram Server" on Render; the API service serves `/api/telegram` (webhook + form-data). See [TELEGRAM-SETUP.md](./TELEGRAM-SETUP.md) if the bot doesn’t work.

## 4. Redeploy after setting env vars

- For each service where you added or changed env vars, open the service → **Manual Deploy** → **Deploy latest commit** (or push a new commit to trigger a deploy).

## 5. Point your frontend at the API

In **Vercel** (or wherever the frontend is hosted), set:

- **`NEXT_PUBLIC_API_URL`** = your Render API URL, e.g. `https://pdf-generator-api-a0m8.onrender.com` or `https://pdf-generator-api-a0m8.onrender.com/api` (either works; the app normalizes to `/api` for health and other calls).

Redeploy the frontend so it uses this URL.

---

## Summary

| Service                 | URL / role |
|-------------------------|------------|
| **pdf-generator-api**   | Your backend; e.g. `https://pdf-generator-api.onrender.com` |
| **pdf-generator-telegram-bot** | Runs in the background; talks to the API and Telegram |
| **Frontend (Vercel)**   | Set `NEXT_PUBLIC_API_URL` to the API URL above + `/api` |

**Optional – persist data:** To keep documents and templates across restarts, add a **Persistent Disk** to **pdf-generator-api** (mount path `/data`, e.g. 1 GB) and set **`DATA_PATH`** = **`/data`**, then redeploy. See [VERCEL-RENDER-DEPLOY.md](./VERCEL-RENDER-DEPLOY.md) for details.
