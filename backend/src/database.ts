import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { Database } from 'sqlite'

let _db: Database | null = null

export async function getDb(): Promise<Database> {
  if (_db) return _db
  throw new Error('Database not initialized. Call initializeDatabase() first.')
}

export async function initializeDatabase(): Promise<Database> {
  if (_db) return _db

  const dbPath = path.join(process.cwd(), 'data.db')
  
  try {
    _db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    console.log('Connected to SQLite database at:', dbPath)
    return _db
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
} 