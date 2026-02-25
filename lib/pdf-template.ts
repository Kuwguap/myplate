import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// Define all available placeholders for PDF templates
export const PDF_PLACEHOLDERS = {
  // Vehicle Information
  PLATE1: '[PLATE1]',
  VIN1: '[VIN1]',
  MAKE1: '[MAKE1]',
  MODEL1: '[MODEL1]',
  YEAR: '[YEAR]',
  COLOR: '[COLOR]',
  CAR: '[CAR]',
  NUMBER: '[NUMBER]',
  BODY: '[BODY]',
  
  // Additional Vehicle Info
  PLATE2: '[PLATE2]',
  PLATE3: '[PLATE3]',
  VIN2: '[VIN2]',
  VIN3: '[VIN3]',
  MAKE2: '[MAKE2]',
  MODEL2: '[MODEL2]',
  
  // Dates and Expirations
  DATE1: '[DATE1]',
  DATE2: '[DATE2]',
  EXP1: '[EXP1]',
  EXP2: '[EXP2]',
  EXP3: '[EXP3]',
  
  // Owner Information
  FIRST: '[FIRST]',
  LAST: '[LAST]',
  ADDRESS: '[ADDRESS]',
  CITY: '[CITY]',
  STATE: '[STATE]',
  ZIP: '[ZIP]',
  
  // Insurance Information
  INS: '[INS]',
  POLICY: '[POLICY]',

  // Form Field Names (for fillable PDFs)
  FIELD_NAMES: {
    plate1: 'plate1',
    vin1: 'vin1',
    make1: 'make1',
    model1: 'model1',
    year: 'year',
    color: 'color',
    car: 'car',
    number: 'number',
    body: 'body',
    plate2: 'plate2',
    plate3: 'plate3',
    vin2: 'vin2',
    vin3: 'vin3',
    make2: 'make2',
    model2: 'model2',
    date1: 'date1',
    date2: 'date2',
    exp1: 'exp1',
    exp2: 'exp2',
    exp3: 'exp3',
    first: 'first',
    last: 'last',
    address: 'address',
    city: 'city',
    state: 'state',
    zip: 'zip',
    ins: 'ins',
    policy: 'policy'
  }
}

// Export types and interfaces
export interface TemplateData {
  // Vehicle Information
  plate1?: string
  vin1?: string
  make1?: string
  model1?: string
  year?: string
  color?: string
  car?: string
  number?: string
  body?: string
  
  // Additional Vehicle Info
  plate2?: string
  plate3?: string
  vin2?: string
  vin3?: string
  make2?: string
  model2?: string
  
  // Dates and Expirations
  date1?: string
  date2?: string
  exp1?: string
  exp2?: string
  exp3?: string
  
  // Owner Information
  first?: string
  last?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  
  // Insurance Information
  ins?: string
  policy?: string
}

export class PDFTemplateService {
  private static async createTemplate() {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792]) // Standard US Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontSize = 12

    return { pdfDoc, page, font, fontSize }
  }

  static async generatePDF(data: TemplateData): Promise<Uint8Array> {
    const { pdfDoc, page, font, fontSize } = await this.createTemplate()
    const { width, height } = page.getSize()

    // Helper function to draw text with placeholder
    const drawText = (text: string | undefined, x: number, y: number, placeholder: string) => {
      page.drawText(text || placeholder, {
        x,
        y: height - y, // Flip y-coordinate since PDF coordinates start from bottom
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
    }

    // Draw Vehicle Information
    drawText('Vehicle Information', 50, 50, '')
    drawText(data.plate1, 50, 70, PDF_PLACEHOLDERS.PLATE1)
    drawText(data.vin1, 50, 90, PDF_PLACEHOLDERS.VIN1)
    drawText(data.make1, 50, 110, PDF_PLACEHOLDERS.MAKE1)
    drawText(data.model1, 200, 110, PDF_PLACEHOLDERS.MODEL1)
    drawText(data.year, 50, 130, PDF_PLACEHOLDERS.YEAR)
    drawText(data.color, 200, 130, PDF_PLACEHOLDERS.COLOR)

    // Draw Owner Information
    drawText('Owner Information', 50, 170, '')
    drawText(`${data.first} ${data.last}`, 50, 190, PDF_PLACEHOLDERS.FIRST)
    drawText(data.address, 50, 210, PDF_PLACEHOLDERS.ADDRESS)
    drawText(`${data.city}, ${data.state} ${data.zip}`, 50, 230, PDF_PLACEHOLDERS.CITY)

    // Draw Insurance Information
    drawText('Insurance Information', 50, 270, '')
    drawText(data.ins, 50, 290, PDF_PLACEHOLDERS.INS)
    drawText(data.policy, 50, 310, PDF_PLACEHOLDERS.POLICY)
    drawText(data.exp1, 50, 330, PDF_PLACEHOLDERS.EXP1)

    // Additional Vehicle Information
    if (data.plate2 || data.vin2) {
      drawText('Additional Vehicle', 50, 370, '')
      drawText(data.plate2, 50, 390, PDF_PLACEHOLDERS.PLATE2)
      drawText(data.vin2, 50, 410, PDF_PLACEHOLDERS.VIN2)
      drawText(data.make2, 50, 430, PDF_PLACEHOLDERS.MAKE2)
      drawText(data.model2, 200, 430, PDF_PLACEHOLDERS.MODEL2)
    }

    return pdfDoc.save()
  }

  static async fillTemplate(templateBytes: Uint8Array, data: TemplateData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(templateBytes)
    const form = pdfDoc.getForm()

    // Fill in all fields that exist in the template
    Object.entries(data).forEach(([key, value]) => {
      try {
        const field = form.getTextField(PDF_PLACEHOLDERS.FIELD_NAMES[key as keyof typeof PDF_PLACEHOLDERS.FIELD_NAMES])
        if (field && value) {
          field.setText(value)
        }
      } catch (e) {
        console.warn(`Field ${key} not found in template`)
      }
    })

    // Flatten form fields to prevent editing
    form.flatten()

    return pdfDoc.save()
  }
} 