import { Request, Response, NextFunction } from 'express'
import { Database } from '../database'
import { PDFService } from '../services/pdf-service'
import { AppError, ErrorCodes } from '../lib/errors'
import path from 'path'
import fs from 'fs/promises'
import { ensureDirectoryExists, getUploadsPath } from '../utils/file-system'

export class TemplateController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    let tempFilePath: string | null = null
    
    try {
      const { name, description } = req.body
      const file = req.file

      if (!file) {
        throw new AppError(
          'No file uploaded',
          ErrorCodes.FILE_UPLOAD_ERROR,
          400
        )
      }

      if (!name) {
        throw new AppError(
          'Template name is required',
          ErrorCodes.VALIDATION_ERROR,
          400
        )
      }

      // Store the temporary file path
      tempFilePath = file.path

      // Ensure uploads directory exists
      const uploadsDir = getUploadsPath()
      await ensureDirectoryExists(uploadsDir)

      // First validate the uploaded file
      const validation = await PDFService.validateTemplate(tempFilePath)
      if (!validation.isValid) {
        throw new AppError(
          'Invalid PDF template',
          ErrorCodes.VALIDATION_ERROR,
          400,
          {
            missingFields: validation.missingFields,
            availableFields: validation.availableFields
          }
        )
      }

      // Generate final filename and path
      const fileName = `${path.basename(tempFilePath)}`
      const finalPath = path.join(uploadsDir, fileName)

      // Move file to final destination
      await fs.rename(tempFilePath, finalPath)
      tempFilePath = null // Clear temp path since file was moved successfully

      // Store relative path in database
      const relativePath = path.relative(process.cwd(), finalPath)
      const db = req.app.locals.db as Database
      
      // Save template to database
      const result = await db.run(
        'INSERT INTO templates (name, description, file_path) VALUES (?, ?, ?)',
        [name, description, relativePath]
      )

      // Return template info
      res.status(201).json({
        id: result.lastID,
        name,
        description,
        file_path: relativePath,
        fields: validation.availableFields
      })
    } catch (error) {
      // Clean up temporary file if it exists
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(console.error)
      }
      next(error)
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const db = req.app.locals.db as Database
      const templates = await db.all(
        'SELECT id, name, description, created_at FROM templates ORDER BY created_at DESC'
      )
      res.json(templates)
    } catch (error) {
      next(error)
    }
  }

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const db = req.app.locals.db as Database
      
      const template = await db.get('SELECT * FROM templates WHERE id = ?', id)
      if (!template) {
        throw new AppError(
          'Template not found',
          ErrorCodes.TEMPLATE_NOT_FOUND,
          404
        )
      }

      // Get template fields
      const validation = await PDFService.validateTemplate(template.file_path)
      
      res.json({
        ...template,
        fields: validation.availableFields
      })
    } catch (error) {
      next(error)
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const db = req.app.locals.db as Database

      // Get template info
      const template = await db.get('SELECT file_path FROM templates WHERE id = ?', id)
      if (!template) {
        throw new AppError(
          'Template not found',
          ErrorCodes.TEMPLATE_NOT_FOUND,
          404
        )
      }

      // Delete file
      try {
        await fs.unlink(template.file_path)
      } catch (error) {
        console.warn('Failed to delete template file:', error)
      }

      // Delete from database
      await db.run('DELETE FROM templates WHERE id = ?', id)

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
} 