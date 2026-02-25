# Quick Start - Production Deployment

## One-Command Setup

On your Linux droplet, run:

```bash
chmod +x start-production.sh
./start-production.sh
```

That's it! The script will:
- ✅ Install all dependencies
- ✅ Build the application
- ✅ Initialize the database
- ✅ Start all services with PM2
- ✅ Configure auto-restart

## Verify It's Working

```bash
pm2 status
```

You should see 4 services running:
- `pdf-generator-backend` (Port 3002)
- `pdf-generator-telegram-server` (Port 3003)
- `pdf-generator-telegram-bot` (Polling)
- `pdf-generator-frontend` (Port 3000)

## Important Commands

```bash
# View logs
pm2 logs

# View bot logs specifically
pm2 logs pdf-generator-telegram-bot

# Restart all services
pm2 restart all

# Stop all services
./stop-production.sh

# Monitor resources
pm2 monit
```

## Database Location

The database is automatically created at:
```
backend/data.db
```

**Backup regularly!**

## Configuration

### Update Telegram Bot Token

Edit `backend/telegram_bot.py`:
```python
BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'
```

Then restart:
```bash
pm2 restart pdf-generator-telegram-bot
```

### Environment Variables

Create `backend/.env`:
```env
PORT=3002
FRONTEND_URL=http://your-domain.com
NODE_ENV=production
```

## Troubleshooting

**Bot not responding?**
```bash
pm2 logs pdf-generator-telegram-bot
```

**Services crashing?**
```bash
pm2 logs
pm2 restart all
```

**Check if ports are available:**
```bash
sudo netstat -tulpn | grep -E '3000|3002|3003'
```

## Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete documentation.


.\start-all.ps1