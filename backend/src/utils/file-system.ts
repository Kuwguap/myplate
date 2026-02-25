import fs from 'fs/promises'
import path from 'path'

/** Base directory for DB and uploads; use DATA_PATH on Render with a persistent disk. */
export function getDataRoot() {
  return process.env.DATA_PATH || process.cwd()
}

export async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
    console.log(`Created directory: ${dirPath}`)
  }
}

export function getUploadsPath() {
  return path.join(getDataRoot(), 'uploads', 'templates')
}

/** Resolve a stored template file_path (relative to data root) to an absolute path. */
export function resolveTemplatePath(relativePath: string) {
  return path.join(getDataRoot(), relativePath)
} 