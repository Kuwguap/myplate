import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
let _db = null;
export async function getDb() {
    if (_db)
        return _db;
    throw new Error('Database not initialized. Call initializeDatabase() first.');
}
export async function initializeDatabase() {
    if (_db)
        return _db;
    // On Render with a persistent disk, set DATA_PATH=/data (or your disk mount path) so data survives restarts
    const dataDir = process.env.DATA_PATH || process.cwd();
    const dbPath = path.join(dataDir, 'data.db');
    try {
        _db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        console.log('Connected to SQLite database at:', dbPath);
        return _db;
    }
    catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}
