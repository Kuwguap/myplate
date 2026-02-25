import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { TemplateController } from './controllers/template-controller.js'
import { DocumentController } from './controllers/document-controller.js'
import { PDFService } from './services/pdf-service.js'
import { AppError, ErrorCodes } from './lib/errors.js'
import { validateTemplateData, validatePreviewData } from './lib/validation.js'
import { getDb } from './database.js'
import type { TemplateData } from './types.js'
import fs from 'fs/promises'
import { handleWebhook, getFormData } from './controllers/telegram.controller.js'
import { getUploadsPath, resolveTemplatePath } from './utils/file-system.js'

const router = Router()

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = getUploadsPath()
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept only PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true)
  } else {
    cb(new Error('Only PDF files are allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
})

// Template routes
router.post('/templates', upload.single('template'), TemplateController.upload)
router.get('/templates', TemplateController.list)
router.get('/templates/:id', TemplateController.get)
router.delete('/templates/:id', TemplateController.delete)

// Document routes
router.post('/documents', DocumentController.create)
router.get('/documents', async (req, res, next) => {
  try {
    const db = await getDb()
    const documents = await db.all(
      'SELECT * FROM documents ORDER BY created_at DESC LIMIT 10'  // Show last 10 documents
    )
    res.json(documents)
  } catch (error) {
    next(error)
  }
})
router.get('/documents/:id', DocumentController.get)
router.put('/documents/:id', DocumentController.update)
router.delete('/documents/:id', DocumentController.delete)

// Add Telegram chat ID to environment config
const TELEGRAM_CHAT_ID = '6197000205'
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN

// Helper function to send PDF to Telegram
async function sendPDFToTelegram(pdfBytes: Uint8Array, fileName: string) {
  try {
    const formData = new FormData()
    formData.append('document', new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }), fileName)
    formData.append('chat_id', TELEGRAM_CHAT_ID)

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.description || 'Failed to send to Telegram')
    }

    return true
  } catch (error) {
    console.error('Failed to send to Telegram:', error)
    return false
  }
}

// PDF Generation routes
router.post('/generate-pdf', async (req, res, next) => {
  try {
    const formData = req.body
    const db = await getDb()
    
    // Create document record first
    const result = await db.run(
      'INSERT INTO documents (name, template_id, data, status) VALUES (?, ?, ?, ?)',
      [formData.documentName, formData.templateId, JSON.stringify(formData), 'completed']
    )

    let pdfBytes: Uint8Array

    if (formData.templateId) {
      // Get template and generate PDF
      const template = await db.get('SELECT * FROM templates WHERE id = ?', formData.templateId)
      if (!template) {
        throw new AppError('Template not found', ErrorCodes.TEMPLATE_NOT_FOUND, 404)
      }

      pdfBytes = await PDFService.generatePDF(formData, resolveTemplatePath(template.file_path))
    } else {
      // Generate PDF from scratch
      pdfBytes = await PDFService.generatePDF(formData)
    }

    // Send to Telegram automatically
    const fileName = `${formData.documentName || 'document'}.pdf`
    await sendPDFToTelegram(pdfBytes, fileName)

    // Send PDF with proper headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"')
    res.setHeader('Content-Length', pdfBytes.length)
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    next(error)
  }
})

// Preview route (lenient validation so partial form data works; fallback to blank if template file missing)
router.post('/preview-pdf', async (req, res, next) => {
  try {
    const body = req.body || {}
    // Frontend may send { data, templateId, templatePath } or a flat form object
    const data = body.data ?? body
    const templateId = body.templateId ?? data?.templateId
    const db = await getDb()

    const validatedData = validatePreviewData(data)

    let pdfBytes: Uint8Array

    if (templateId) {
      const template = await db.get('SELECT * FROM templates WHERE id = ?', templateId)
      if (template) {
        const templatePath = resolveTemplatePath(template.file_path)
        try {
          pdfBytes = await PDFService.generatePDF(validatedData as TemplateData, templatePath)
        } catch (err) {
          // Template file missing (e.g. ephemeral disk on Render) — fallback to blank preview
          console.warn('Preview: template file missing or unreadable, using blank preview:', (err instanceof Error ? err.message : err))
          pdfBytes = await PDFService.generatePreview(validatedData as TemplateData)
        }
      } else {
        pdfBytes = await PDFService.generatePreview(validatedData as TemplateData)
      }
    } else {
      pdfBytes = await PDFService.generatePreview(validatedData as TemplateData)
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('Content-Length', pdfBytes.length)
    res.setHeader('Cache-Control', 'no-store')
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    next(error)
  }
})

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.get('/drafts', async (req, res, next) => {
  try {
    const db = await getDb()
    const drafts = await db.all(
      'SELECT * FROM documents WHERE status = ? ORDER BY created_at DESC',
      ['draft']
    )
    res.json(drafts)
  } catch (error) {
    next(error)
  }
})

router.get('/drafts/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    const draft = await db.get(
      'SELECT * FROM documents WHERE id = ? AND status = ?',
      [id, 'draft']
    )
    
    if (!draft) {
      throw new AppError('Draft not found', ErrorCodes.DOCUMENT_NOT_FOUND, 404)
    }

    res.json(draft)
  } catch (error) {
    next(error)
  }
})

router.get('/documents/:id/preview', async (req, res, next) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    const document = await db.get('SELECT * FROM documents WHERE id = ?', id)
    if (!document) {
      throw new AppError('Document not found', ErrorCodes.DOCUMENT_NOT_FOUND, 404)
    }

    // Get document data and template if exists
    const documentData = JSON.parse(document.data)
    let pdfBytes: Uint8Array

    if (document.template_id) {
      const template = await db.get('SELECT * FROM templates WHERE id = ?', document.template_id)
      if (template) {
        try {
          pdfBytes = await PDFService.generatePDF(documentData, resolveTemplatePath(template.file_path))
        } catch (err) {
          console.warn('Document preview: template file missing, using blank:', (err instanceof Error ? err.message : err))
          pdfBytes = await PDFService.generatePreview(documentData)
        }
      } else {
        pdfBytes = await PDFService.generatePreview(documentData)
      }
    } else {
      pdfBytes = await PDFService.generatePreview(documentData)
    }

    // Send PDF with proper headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('Content-Length', pdfBytes.length)
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    next(error)
  }
})

// Delete document route
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const db = await getDb()

    // Verify document exists
    const document = await db.get('SELECT * FROM documents WHERE id = ?', id)
    if (!document) {
      throw new AppError('Document not found', ErrorCodes.DOCUMENT_NOT_FOUND, 404)
    }

    // Delete document
    await db.run('DELETE FROM documents WHERE id = ?', id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// Delete template route
router.delete('/templates/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const db = await getDb()

    // Verify template exists
    const template = await db.get('SELECT * FROM templates WHERE id = ?', id)
    if (!template) {
      throw new AppError('Template not found', ErrorCodes.TEMPLATE_NOT_FOUND, 404)
    }

    // Delete template file
    try {
      await fs.unlink(resolveTemplatePath(template.file_path))
    } catch (error) {
      console.warn('Failed to delete template file:', error)
    }

    // Delete from database
    await db.run('DELETE FROM templates WHERE id = ?', id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// Telegram webhook routes
router.post('/telegram/webhook', (req, res, next) => {
  handleWebhook(req, res).catch(next);
});

router.get('/telegram/form-data', (req, res, next) => {
  getFormData(req, res).catch(next);
});

export { router } 