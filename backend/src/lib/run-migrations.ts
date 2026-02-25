import fs from 'fs/promises'
import path from 'path'
import { getDb } from '../database.js'
import { Database } from 'sqlite'

/**
 * Runs all pending database migrations
 */
export async function runMigrations() {
  try {
    const db = await getDb()
    console.log('Starting database migrations...')

    // Create migrations table if it doesn't exist
    console.log('Creating migrations table...')
    await db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Get list of executed migrations
    console.log('Checking executed migrations...')
    const executedMigrations = await db.all('SELECT name FROM migrations')
    const executedNames = new Set(executedMigrations.map(m => m.name))
    console.log('Already executed migrations:', Array.from(executedNames))

    // Read migration files
    const migrationsDir = path.join(process.cwd(), 'src', 'migrations')
    console.log('Reading migrations from:', migrationsDir)
    
    try {
      await fs.access(migrationsDir)
    } catch (error) {
      console.log('Creating migrations directory...')
      await fs.mkdir(migrationsDir, { recursive: true })
    }

    const files = await fs.readdir(migrationsDir)
    const migrationFiles = files.filter(f => f.endsWith('.sql'))
    console.log('Found migration files:', migrationFiles)

    // Sort migrations by name to ensure order
    migrationFiles.sort()

    // Execute new migrations
    for (const file of migrationFiles) {
      if (!executedNames.has(file)) {
        console.log(`Running migration: ${file}`)
        const filePath = path.join(migrationsDir, file)
        const sql = await fs.readFile(filePath, 'utf-8')
        console.log('Migration SQL:', sql)
        
        // Run each statement separately
        const statements = sql.split(';').filter(stmt => stmt.trim())
        console.log(`Found ${statements.length} statements to execute`)
        
        for (const statement of statements) {
          if (statement.trim()) {
            console.log('Executing statement:', statement.trim())
            try {
              await db.run(statement.trim())
              console.log('Statement executed successfully')
            } catch (error) {
              console.error('Error executing statement:', error)
              throw error
            }
          }
        }
        
        await db.run('INSERT INTO migrations (name) VALUES (?)', [file])
        console.log(`Completed migration: ${file}`)
      } else {
        console.log(`Skipping already executed migration: ${file}`)
      }
    }

    console.log('All migrations completed successfully')
  } catch (error) {
    console.error('Error running migrations:', error)
    throw error
  }
} 