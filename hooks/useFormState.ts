import { useState } from 'react'
import { TemplateData } from '@/lib/pdf-template'
import { api } from '@/lib/api'
import { usePDFGeneration } from './usePDFGeneration'
import { validateTemplateData } from '@/lib/validation'
import { NotificationService } from '@/lib/notification-service'

interface Template {
  id: number
  name: string
  description: string
  fields: string[]
  file_path: string
}

interface FormState extends TemplateData {
  templateId?: number
  templatePath?: string
  documentName: string
}

export function useFormState() {
  const [formData, setFormData] = useState<FormState>({
    documentName: '',
    // Vehicle Information
    vehiclename: '',
    plate1: '',
    vin1: '',
    make1: '',
    model1: '',
    year: '',
    color: '',
    car: '',
    number: '',
    body: '',
    
    // Additional Vehicle Info
    plate2: '',
    plate3: '',
    vin2: '',
    vin3: '',
    make2: '',
    model2: '',
    
    // Dates and Expirations
    date1: '',
    date2: '',
    exp1: '',
    exp2: '',
    exp3: '',
    
    // Owner Information
    first: '',
    last: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    
    // Insurance Information
    ins: '',
    policy: ''
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { generatePDF, isGenerating } = usePDFGeneration()

  const setTemplate = async (template: Template | null) => {
    try {
      if (template) {
        setFormData(prev => ({
          ...prev,
          templateId: template.id,
          templatePath: template.file_path
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          templateId: undefined,
          templatePath: undefined
        }))
      }
    } catch (error) {
      NotificationService.dispatch(
        'Error',
        'Failed to load template',
        'error'
      )
    }
  }

  const validateForm = () => {
    try {
      validateTemplateData(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') {
        const newErrors: Record<string, string> = {}
        error.details.forEach((err: any) => {
          newErrors[err.path[0]] = err.message
        })
        setErrors(newErrors)
        NotificationService.dispatch(
          'Validation Error',
          'Please check the form for errors',
          'error'
        )
      } else {
        NotificationService.dispatch(
          'Error',
          error.message,
          'error'
        )
      }
      return false
    }
  }

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const document = await api.createDocument({
        name: formData.documentName || `Vehicle Transfer - ${new Date().toLocaleDateString()}`,
        template_id: formData.templateId,
        data: formData,
        status: isDraft ? 'draft' : 'pending'
      })

      if (!isDraft) {
        await generatePDF(formData)
        NotificationService.dispatch(
          'PDF Generated',
          'Your PDF has been generated successfully',
          'success'
        )
      }

      return document
    } catch (error) {
      NotificationService.dispatch(
        'Error',
        error.message,
        'error'
      )
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadDraft = async (draft: any) => {
    try {
      const draftData = JSON.parse(draft.data)
      
      // Load template if draft has one
      if (draft.template_id) {
        const template = await api.getTemplate(draft.template_id)
        setTemplate(template)
      }

      // Update form data with draft data
      setFormData({
        ...draftData,
        documentName: draft.name,
      })

      // Clear any existing errors
      setErrors({})

      return true
    } catch (error) {
      console.error('Failed to load draft:', error)
      throw error
    }
  }

  return {
    formData,
    errors,
    isGenerating,
    isSubmitting,
    handleInputChange,
    handleSubmit,
    validateForm,
    setTemplate,
    loadDraft,
    setFormData,
  }
} 