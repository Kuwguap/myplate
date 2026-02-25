import { useState } from 'react'
import { PDFTemplateService, TemplateData } from '@/lib/pdf-template'

export const usePDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePDF = async (data: TemplateData) => {
    setIsGenerating(true)
    setError(null)

    try {
      const pdfBytes = await PDFTemplateService.generatePDF(data)
      
      // Create a blob and download the PDF
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `vehicle-transfer-${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      return pdfBytes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
      throw err
    } finally {
      setIsGenerating(false)
    }
  }

  const fillPDFTemplate = async (templateFile: File, data: TemplateData) => {
    setIsGenerating(true)
    setError(null)

    try {
      const templateBytes = await templateFile.arrayBuffer()
      const pdfBytes = await PDFTemplateService.fillTemplate(new Uint8Array(templateBytes), data)
      
      // Create a blob and download the PDF
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `filled-template-${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      return pdfBytes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fill PDF template')
      throw err
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generatePDF,
    fillPDFTemplate,
    isGenerating,
    error
  }
} 