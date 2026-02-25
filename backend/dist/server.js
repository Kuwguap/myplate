import express from 'express';
import cors from 'cors';
import { router } from './routes.js';
import { initializeDatabase } from './database.js';
import { errorHandler } from './middleware/error-handler.js';
import dotenv from 'dotenv';
import path from 'path';
import { ensureDirectoryExists, getUploadsPath } from './utils/file-system.js';
import { runMigrations } from './lib/run-migrations.js';
import telegramRoutes from './routes/telegram.routes.js';
// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const app = express();
const port = process.env.PORT || 3002;
// Configure CORS with proper origin
const corsOptions = {
    origin: '*', // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600 // Cache preflight requests for 10 minutes
};
app.use(cors(corsOptions));
// Increase body size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Initialize server
async function initializeServer() {
    try {
        // Ensure uploads directory exists
        const uploadsPath = getUploadsPath();
        await ensureDirectoryExists(uploadsPath);
        console.log('Uploads directory ready at:', uploadsPath);
        // Initialize database first
        const db = await initializeDatabase();
        app.locals.db = db;
        console.log('Database initialized');
        // Run migrations after database is initialized
        await runMigrations();
        console.log('Database migrations completed');
        // Serve uploaded files with proper path and security headers
        app.use('/uploads', (req, res, next) => {
            res.setHeader('Content-Security-Policy', "default-src 'self'");
            res.setHeader('X-Content-Type-Options', 'nosniff');
            next();
        }, express.static(path.join(process.cwd(), 'uploads')));
        // Routes with proper error handling
        app.use('/api/telegram', (req, res, next) => {
            console.log(`Telegram API: ${req.method} ${req.path}`);
            next();
        }, telegramRoutes);
        app.use('/api', (req, res, next) => {
            console.log(`${req.method} ${req.path}`);
            next();
        }, router);
        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error('Error:', err);
            errorHandler(err, req, res, next);
        });
        // Start server
        const server = app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
        });
        // Configure server timeouts
        server.timeout = 300000; // 5 minutes
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${port} is already in use`);
                process.exit(1);
            }
            else {
                console.error('Server error:', error);
                process.exit(1);
            }
        });
        return server;
    }
    catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1);
    }
}
// Start server
initializeServer().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
});
// Handle process events
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
