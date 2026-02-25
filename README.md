# PDF Generator Application

A web-based PDF generator application with Telegram bot integration for creating vehicle transfer documents.

## Data storage (no Supabase)

This app **does not use Supabase**. The backend uses **SQLite** for persistence:

- **Backend** (Node.js): stores templates and documents in a local SQLite file (`backend/data.db`). No database URL or Supabase key is required.
- **Frontend**: talks to the backend API only; no direct database or Supabase connection.

To use a different database (e.g. Supabase/Postgres), you would need to change the backend to use that database instead of SQLite.

## 🚀 Quick Start

**For detailed startup instructions, see [STARTUP.md](./STARTUP.md)**

### Quick Overview

This application consists of 4 components that need to be started:

1. **Backend Server** (Port 3002) - Main API server
2. **Telegram Server** (Port 3003) - Telegram webhook handler
3. **Telegram Bot** - Python bot for Telegram integration
4. **Frontend** (Port 3000) - Next.js web application

### Start All Services

Open 4 separate terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - Telegram Server:**
```bash
cd backend
npm install
node telegram-server.js
```

**Terminal 3 - Telegram Bot:**
```bash
cd backend
pip install -r requirements.txt
python telegram_bot.py
```

**Terminal 4 - Frontend:**
```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Full Documentation

See [STARTUP.md](./STARTUP.md) for complete startup instructions, troubleshooting, and configuration details.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
