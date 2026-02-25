import fs from 'fs/promises'
import path from 'path'

export async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
    console.log(`Created directory: ${dirPath}`)
  }
}

export function getUploadsPath() {
  return path.join(process.cwd(), 'uploads', 'templates')
} 