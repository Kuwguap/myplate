# Production Deployment Guide

This guide explains how to deploy the PDF Generator application on a Linux droplet (DigitalOcean, AWS EC2, etc.) and keep it running continuously.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Root or sudo access
- Domain name (optional, for production)

## Quick Start

### 1. Upload Your Code

Upload the entire project to your droplet:

```bash
# On your local machine
scp -r pdf-generator user@your-droplet-ip:/home/user/

# Or use git
git clone <your-repo-url>
cd pdf-generator
```

### 2. Run the Production Startup Script

```bash
# Make scripts executable
chmod +x start-production.sh stop-production.sh

# Run the startup script
./start-production.sh
```

The script will:
- ✅ Check for required dependencies (Node.js, Python, PM2)
- ✅ Install missing dependencies
- ✅ Build the backend and frontend
- ✅ Initialize the database
- ✅ Start all services with PM2
- ✅ Configure auto-restart on reboot

### 3. Verify Services are Running

```bash
pm2 status
```

You should see all 4 services running:
- `pdf-generator-backend`
- `pdf-generator-telegram-server`
- `pdf-generator-telegram-bot`
- `pdf-generator-frontend`

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Install Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3 and pip
sudo apt-get install -y python3 python3-pip

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Install Project Dependencies

```bash
# Frontend
npm install
npm run build

# Backend
cd backend
npm install
npm run build

# Python dependencies
pip3 install -r requirements.txt --user
cd ..
```

### 3. Create Required Directories

```bash
mkdir -p logs
mkdir -p backend/temp
mkdir -p backend/uploads/templates
```

### 4. Start Services with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable auto-start on reboot
```

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
nano .env
```

Add your configuration:

```env
PORT=3002
FRONTEND_URL=http://your-domain.com
NODE_ENV=production
```

For the frontend, create `.env.local` in the root:

```env
NEXT_PUBLIC_API_URL=http://your-domain.com/api
```

### Telegram Bot Configuration

Update the bot token in `backend/telegram_bot.py`:

```python
BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'
API_URL = 'http://localhost:3002/api'
TELEGRAM_SERVER_URL = 'http://localhost:3003/api'
FRONTEND_URL = 'http://your-domain.com'
```

## Monitoring and Management

### View Logs

```bash
# All logs
pm2 logs

# Specific service
pm2 logs pdf-generator-backend
pm2 logs pdf-generator-telegram-bot

# Follow logs in real-time
pm2 logs --lines 100
```

### Service Management

```bash
# Check status
pm2 status

# Restart all services
pm2 restart all

# Restart specific service
pm2 restart pdf-generator-telegram-bot

# Stop all services
pm2 stop all

# Stop and remove all services
pm2 delete all

# Monitor resources
pm2 monit
```

### View Log Files

Logs are stored in the `logs/` directory:

```bash
tail -f logs/backend-combined.log
tail -f logs/telegram-bot-combined.log
```

## Database

The database is automatically initialized on first startup. The SQLite database file is located at:

```
backend/data.db
```

**Important:** Make sure to backup this file regularly:

```bash
# Backup database
cp backend/data.db backend/data.db.backup

# Or use a cron job for automatic backups
crontab -e
# Add: 0 2 * * * cp /path/to/backend/data.db /path/to/backend/data.db.backup.$(date +\%Y\%m\%d)
```

## Firewall Configuration

If using a firewall (UFW), allow the necessary ports:

```bash
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3002/tcp  # Backend API
sudo ufw allow 3003/tcp  # Telegram Server
sudo ufw allow 22/tcp    # SSH (if not already allowed)
sudo ufw enable
```

## Reverse Proxy (Nginx) - Recommended for Production

For production, use Nginx as a reverse proxy:

### Install Nginx

```bash
sudo apt-get install -y nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/pdf-generator`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Telegram Server
    location /telegram {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/pdf-generator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL/HTTPS (Let's Encrypt)

For production, enable HTTPS:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Services Not Starting

1. Check PM2 logs:
   ```bash
   pm2 logs
   ```

2. Check if ports are in use:
   ```bash
   sudo netstat -tulpn | grep -E '3000|3002|3003'
   ```

3. Check system resources:
   ```bash
   pm2 monit
   ```

### Database Issues

If the database is corrupted or needs reset:

```bash
# Stop services
pm2 stop all

# Backup old database
mv backend/data.db backend/data.db.old

# Restart services (will create new database)
pm2 restart all
```

### Telegram Bot Not Responding

1. Check bot logs:
   ```bash
   pm2 logs pdf-generator-telegram-bot
   ```

2. Verify bot token is correct in `backend/telegram_bot.py`

3. Ensure backend is running:
   ```bash
   curl http://localhost:3002/api/health
   ```

### High Memory Usage

If services use too much memory:

1. Check current usage:
   ```bash
   pm2 monit
   ```

2. Restart services:
   ```bash
   pm2 restart all
   ```

3. Adjust memory limits in `ecosystem.config.js`

## Auto-Start on Reboot

PM2 startup script should be configured automatically. To verify:

```bash
pm2 startup
```

Follow the instructions shown. This ensures all services start automatically after server reboot.

## Backup Strategy

### Regular Backups

Create a backup script `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp backend/data.db $BACKUP_DIR/data_$DATE.db

# Backup user preferences
cp backend/user_preferences.json $BACKUP_DIR/user_preferences_$DATE.json

# Keep only last 7 days
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.json" -mtime +7 -delete
```

Make it executable and add to crontab:

```bash
chmod +x backup.sh
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## Security Considerations

1. **Firewall**: Use UFW or similar to restrict access
2. **SSH Keys**: Disable password authentication, use SSH keys only
3. **Regular Updates**: Keep system and dependencies updated
4. **Environment Variables**: Never commit `.env` files
5. **Bot Token**: Keep Telegram bot token secure
6. **HTTPS**: Always use HTTPS in production

## Support

For issues or questions:
- Check logs: `pm2 logs`
- Check service status: `pm2 status`
- Review this documentation
- Check GitHub issues (if applicable)

