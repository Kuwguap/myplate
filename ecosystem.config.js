// PM2 Ecosystem file for production deployment
// This manages all services: Backend, Telegram Server, Telegram Bot, and Frontend

module.exports = {
  apps: [
    {
      name: 'pdf-generator-backend',
      script: 'dist/server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
      },
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      log_file: '../logs/backend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      watch: false,
      max_memory_restart: '500M'
    },
    {
      name: 'pdf-generator-telegram-server',
      script: 'telegram-server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: '../logs/telegram-server-error.log',
      out_file: '../logs/telegram-server-out.log',
      log_file: '../logs/telegram-server-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      watch: false,
      max_memory_restart: '200M'
    },
    {
      name: 'pdf-generator-telegram-bot',
      script: 'start-telegram-bot.sh',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'bash',
      env: {
        PYTHONUNBUFFERED: '1'
      },
      error_file: '../logs/telegram-bot-error.log',
      out_file: '../logs/telegram-bot-out.log',
      log_file: '../logs/telegram-bot-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      watch: false,
      max_memory_restart: '200M'
    },
    {
      name: 'pdf-generator-frontend',
      script: 'npm',
      args: 'start',
      cwd: '.',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
}

