import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import fs from 'fs/promises';
import { AppError, ErrorCodes } from '../lib/errors';
// Helper function to format dates
function formatDate(dateStr, format = 'MM/DD/YYYY', prefix) {
    if (!dateStr)
        return '';
    try {
        // Handle different date formats
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // Try parsing MM/DD/YYYY format
            const [month, day, year] = dateStr.split('/');
            if (month && day && year) {
                const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (format === 'MMM DD, YYYY') {
                    const formattedDate = parsedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }).toUpperCase();
                    return prefix ? `${prefix} ${formattedDate}` : formattedDate;
                }
                return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
            }
            return dateStr;
        }
        if (format === 'MMM DD, YYYY') {
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }).toUpperCase();
            return prefix ? `${prefix} ${formattedDate}` : formattedDate;
        }
        // Format as MM/DD/YYYY
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }
    catch (error) {
        console.warn('Date formatting error:', error);
        return dateStr;
    }
}
// Define metadata fields that shouldn't be filled in the PDF
const METADATA_FIELDS = ['documentName', 'templateId', 'templatePath', 'timestamp'];
// Define date fields that need formatting
const DATE_FIELDS = ['date1', 'date2', 'exp1', 'exp2'];
const SPECIAL_DATE_FIELDS = ['exp3']; // Fields that need special date formatting
export class PDFService {
    static async loadTemplate(templatePath) {
        try {
            const templateBytes = await fs.readFile(templatePath);
            const pdfDoc = await PDFDocument.load(templateBytes);
            return pdfDoc;
        }
        catch (error) {
            console.error('Failed to load template:', error);
            // Type guard for Error objects
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new AppError('Failed to load template', ErrorCodes.PDF_GENERATION_ERROR, 500, { originalError: errorMessage });
        }
    }
    static async loadFonts(pdfDoc) {
        return {
            arialMT: await pdfDoc.embedFont(StandardFonts.Helvetica),
            arialBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        };
    }
    static async generatePDF(data, templatePath) {
        try {
            // Format dates in the data
            const formattedData = {
                ...data,
                ...Object.fromEntries(DATE_FIELDS.map(field => [field, formatDate(data[field], 'MM/DD/YYYY')])),
                ...Object.fromEntries(SPECIAL_DATE_FIELDS.map(field => [field, formatDate(data[field], 'MMM DD, YYYY', 'EXP')]))
            };
            let pdfDoc;
            if (templatePath) {
                // Load and fill template
                pdfDoc = await this.loadTemplate(templatePath);
                const form = pdfDoc.getForm();
                // Filter out metadata fields and fill form fields
                const templateData = Object.fromEntries(Object.entries(formattedData).filter(([key]) => !METADATA_FIELDS.includes(key)));
                // Fill form fields
                Object.entries(templateData).forEach(([key, value]) => {
                    try {
                        if (value) {
                            const field = form.getTextField(key);
                            if (field) {
                                field.setText(value.toString());
                            }
                        }
                    }
                    catch (error) {
                        console.warn(`Failed to fill field ${key}:`, error);
                    }
                });
                // Flatten form fields to prevent editing
                form.flatten();
            }
            else {
                // Create new PDF from scratch
                pdfDoc = await PDFDocument.create();
                const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
                const page = pdfDoc.addPage([612, 792]); // US Letter size
                const { width, height } = page.getSize();
                // Helper function to draw text
                const drawText = (text, x, y, label) => {
                    if (!text)
                        return y;
                    try {
                        page.drawText(`${label}: ${text}`, {
                            x,
                            y,
                            size: 11,
                            font: helveticaFont,
                            color: rgb(0, 0, 0),
                        });
                        return y - 20;
                    }
                    catch (error) {
                        console.warn(`Failed to draw text for ${label}:`, error);
                        return y;
                    }
                };
                // Draw sections
                let yPosition = height - 50;
                // Vehicle Information
                page.drawText('Vehicle Information', {
                    x: 50,
                    y: yPosition,
                    size: 14,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                });
                yPosition -= 30;
                yPosition = drawText(formattedData.vehiclename, 50, yPosition, 'Vehicle Name');
                yPosition = drawText(formattedData.plate1, 50, yPosition, 'License Plate');
                yPosition = drawText(formattedData.vin1, 50, yPosition, 'VIN');
                yPosition = drawText(formattedData.make1, 50, yPosition, 'Make');
                yPosition = drawText(formattedData.model1, 50, yPosition, 'Model');
                yPosition = drawText(formattedData.year, 50, yPosition, 'Year');
                yPosition = drawText(formattedData.color, 50, yPosition, 'Color');
                // Owner Information
                yPosition -= 20;
                page.drawText('Owner Information', {
                    x: 50,
                    y: yPosition,
                    size: 14,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                });
                yPosition -= 30;
                const fullName = [formattedData.first, formattedData.last].filter(Boolean).join(' ');
                yPosition = drawText(fullName, 50, yPosition, 'Name');
                yPosition = drawText(formattedData.address, 50, yPosition, 'Address');
                const cityStateZip = [formattedData.city, formattedData.state, formattedData.zip].filter(Boolean).join(', ');
                yPosition = drawText(cityStateZip, 50, yPosition, 'City, State ZIP');
                // Insurance Information
                yPosition -= 20;
                page.drawText('Insurance Information', {
                    x: 50,
                    y: yPosition,
                    size: 14,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                });
                yPosition -= 30;
                yPosition = drawText(formattedData.ins, 50, yPosition, 'Insurance Company');
                yPosition = drawText(formattedData.policy, 50, yPosition, 'Policy Number');
            }
            // Add metadata
            pdfDoc.setTitle(formattedData.documentName || 'Vehicle Transfer Document');
            pdfDoc.setAuthor('PDF Generator');
            pdfDoc.setCreator('Vehicle Transfer System');
            pdfDoc.setModificationDate(new Date());
            return await pdfDoc.save();
        }
        catch (error) {
            console.error('PDF generation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new AppError('Failed to generate PDF', ErrorCodes.PDF_GENERATION_ERROR, 500, { originalError: errorMessage });
        }
    }
    static async validateTemplate(templatePath) {
        try {
            const pdfDoc = await this.loadTemplate(templatePath);
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            const availableFields = fields.map(field => field.getName());
            // Consider template valid if it's a readable PDF
            return {
                isValid: true,
                availableFields,
                missingFields: []
            };
        }
        catch (error) {
            console.error('Template validation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new AppError('Failed to validate template', ErrorCodes.VALIDATION_ERROR, 400, { originalError: errorMessage });
        }
    }
    static async generatePreview(data) {
        try {
            // Format dates in the data
            const formattedData = {
                ...data,
                ...Object.fromEntries(DATE_FIELDS.map(field => [field, formatDate(data[field], 'MM/DD/YYYY')])),
                ...Object.fromEntries(SPECIAL_DATE_FIELDS.map(field => [field, formatDate(data[field], 'MMM DD, YYYY', 'EXP')]))
            };
            // Initialize PDF document first
            const pdfDoc = await PDFDocument.create();
            const fonts = await this.loadFonts(pdfDoc);
            if (data.templatePath) {
                // Load template
                pdfDoc = await this.loadTemplate(data.templatePath);
                const form = pdfDoc.getForm();
                // Try to fill form fields first
                Object.entries(formattedData).forEach(([key, value]) => {
                    try {
                        if (value) {
                            const field = form.getTextField(key);
                            if (field) {
                                field.setText(value.toString());
                            }
                        }
                    }
                    catch (error) {
                        console.debug(`Field ${key} not found in template, using fallback`);
                    }
                });
                // Add fallback text for missing fields
                const page = pdfDoc.getPages()[0];
                const { width, height } = page.getSize();
                let yPosition = height - 50;
                // Draw watermark
                page.drawText('PREVIEWS', {
                    x: width / 2 - 100,
                    y: height / 2,
                    size: 80,
                    font: fonts.arialBold,
                    color: rgb(0.8, 0.8, 0.8),
                    opacity: 0.3,
                    rotate: degrees(45),
                });
                // Draw missing fields at the bottom
                yPosition = height - 700; // Start from bottom of page
                page.drawText('Additional Information:', {
                    x: 50,
                    y: yPosition,
                    size: 14,
                    font: fonts.arialMT,
                    color: rgb(0, 0, 0),
                });
                yPosition -= 30;
                Object.entries(formattedData).forEach(([key, value]) => {
                    if (value) {
                        try {
                            const field = form.getTextField(key);
                            // If field doesn't exist in template, add it to the bottom
                            if (!field) {
                                page.drawText(`${key}: ${value}`, {
                                    x: 50,
                                    y: yPosition,
                                    size: 11,
                                    font: key === 'plate1' ? fonts.arialBold : fonts.arialMT,
                                    color: rgb(0, 0, 0),
                                });
                                yPosition -= 20;
                            }
                        }
                        catch {
                            // Field doesn't exist, add it to the bottom
                            page.drawText(`${key}: ${value}`, {
                                x: 50,
                                y: yPosition,
                                size: 11,
                                font: key === 'plate1' ? fonts.arialBold : fonts.arialMT,
                                color: rgb(0, 0, 0),
                            });
                            yPosition -= 20;
                        }
                    }
                });
                // Flatten form to prevent editing
                form.flatten();
            }
            else {
                // Generate preview from scratch
                const page = pdfDoc.addPage([612, 792]);
                const { width, height } = page.getSize();
                let yPosition = height - 50;
                // Draw watermark
                page.drawText('PREVIEW', {
                    x: width / 2 - 100,
                    y: height / 2,
                    size: 100,
                    font: fonts.arialBold,
                    color: rgb(0.8, 0.8, 0.8),
                    opacity: 0.3,
                    rotate: degrees(45),
                });
                // Draw all fields with formatted dates
                Object.entries(formattedData).forEach(([key, value]) => {
                    if (value && !METADATA_FIELDS.includes(key)) {
                        page.drawText(`${key}: ${value}`, {
                            x: 50,
                            y: yPosition,
                            size: 11,
                            font: fonts.arialMT,
                            color: rgb(0, 0, 0),
                        });
                        yPosition -= 20;
                    }
                });
            }
            return await pdfDoc.save({
                useObjectStreams: false,
                addDefaultPage: false,
                objectsPerTick: 10,
            });
        }
        catch (error) {
            console.error('Preview generation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new AppError('Failed to generate preview', ErrorCodes.PDF_GENERATION_ERROR, 500, { originalError: errorMessage });
        }
    }
}
