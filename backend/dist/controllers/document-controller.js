import { PDFService } from '../services/pdf-service.js';
import { validateTemplateData } from '../lib/validation.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { resolveTemplatePath } from '../utils/file-system.js';
export class DocumentController {
    static async create(req, res, next) {
        try {
            const { name, template_id, data } = req.body;
            // Validate input data
            const validatedData = validateTemplateData(data);
            const db = req.app.locals.db;
            // Check if template exists
            if (template_id) {
                const template = await db.get('SELECT id FROM templates WHERE id = ?', template_id);
                if (!template) {
                    throw new AppError('Template not found', ErrorCodes.TEMPLATE_NOT_FOUND, 404);
                }
            }
            const result = await db.run('INSERT INTO documents (name, template_id, data) VALUES (?, ?, ?)', [name, template_id, JSON.stringify(validatedData)]);
            res.status(201).json({
                id: result.lastID,
                name,
                template_id,
                data: validatedData,
                status: 'draft'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async list(req, res, next) {
        try {
            const db = req.app.locals.db;
            const documents = await db.all('SELECT * FROM documents ORDER BY created_at DESC');
            res.json(documents);
        }
        catch (error) {
            next(error);
        }
    }
    static async get(req, res, next) {
        try {
            const { id } = req.params;
            const db = req.app.locals.db;
            const document = await db.get('SELECT * FROM documents WHERE id = ?', id);
            if (!document) {
                throw new AppError('Document not found', ErrorCodes.DOCUMENT_NOT_FOUND, 404);
            }
            res.json(document);
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, data, status } = req.body;
            const db = req.app.locals.db;
            // Validate document exists
            const document = await db.get('SELECT * FROM documents WHERE id = ?', id);
            if (!document) {
                throw new AppError('Document not found', ErrorCodes.DOCUMENT_NOT_FOUND, 404);
            }
            // Validate data if provided
            const validatedData = data ? validateTemplateData(data) : undefined;
            // Update document
            await db.run('UPDATE documents SET name = COALESCE(?, name), data = COALESCE(?, data), status = COALESCE(?, status) WHERE id = ?', [
                name,
                validatedData ? JSON.stringify(validatedData) : undefined,
                status,
                id
            ]);
            const updatedDocument = await db.get('SELECT * FROM documents WHERE id = ?', id);
            res.json(updatedDocument);
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            const db = req.app.locals.db;
            // Verify document exists
            const document = await db.get('SELECT * FROM documents WHERE id = ?', id);
            if (!document) {
                throw new AppError('Document not found', ErrorCodes.DOCUMENT_NOT_FOUND, 404);
            }
            // Delete document
            await db.run('DELETE FROM documents WHERE id = ?', id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async generatePDF(req, res, next) {
        try {
            const { id } = req.params;
            const db = req.app.locals.db;
            const document = await db.get('SELECT * FROM documents WHERE id = ?', id);
            if (!document) {
                throw new AppError('Document not found', ErrorCodes.DOCUMENT_NOT_FOUND, 404);
            }
            const template = await db.get('SELECT * FROM templates WHERE id = ?', document.template_id);
            const documentData = validateTemplateData(JSON.parse(document.data));
            if (template?.file_path) {
                const validation = await PDFService.validateTemplate(template.file_path);
                if (!validation.isValid) {
                    throw new AppError('Invalid template', ErrorCodes.VALIDATION_ERROR, 400, { missingFields: validation.missingFields });
                }
            }
            try {
                let pdfBytes;
                if (template?.file_path) {
                    const templatePath = resolveTemplatePath(template.file_path);
                    pdfBytes = await PDFService.generatePDF(documentData, templatePath);
                }
                else {
                    pdfBytes = await PDFService.generatePDF(documentData);
                }
                await db.run('UPDATE documents SET status = ? WHERE id = ?', ['generated', id]);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="document-${id}.pdf"`);
                res.send(Buffer.from(pdfBytes));
            }
            catch (error) {
                throw new AppError('Failed to generate PDF', ErrorCodes.PDF_GENERATION_ERROR, 500, { originalError: error.message });
            }
        }
        catch (error) {
            next(error);
        }
    }
    static async preview(req, res, next) {
        try {
            const { data } = req.body;
            const validatedData = validateTemplateData(data);
            const pdfBytes = await PDFService.generatePDF(validatedData);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.send(Buffer.from(pdfBytes));
        }
        catch (error) {
            next(error);
        }
    }
}
